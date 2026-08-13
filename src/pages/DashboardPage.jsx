import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/dashboard.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://sotuv-menejer-backend.onrender.com';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const DashboardPage = () => {
    const navigate = useNavigate();

    // Statik va ma'lumotlar holatlari
    const [stats, setStats] = useState({
        storeName: "Mening Do'konim",
        totalProducts: 0,
        totalStock: 0,
        totalSold: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalExpense: 0,
        dailySold: 0,
        dailyRevenue: 0,
        dailyProfit: 0,
        dailyExpense: 0,
        monthlySold: 0,
        monthlyRevenue: 0,
        monthlyProfit: 0,
        monthlyExpense: 0,
        yearlySold: 0,
        yearlyRevenue: 0,
        yearlyProfit: 0,
        yearlyExpense: 0,
    });

    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Loading holatlari
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modallar holatlari
    const [addProductModal, setAddProductModal] = useState(false);
    const [sellModal, setSellModal] = useState(false);
    const [expenseModal, setExpenseModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);

    // Formlar holati
    const [newProduct, setNewProduct] = useState({
        category: '',
        name: '',
        cost_price: '',
        color: '',
        sizes: '',
        quantity: ''
    });

    // Sotish formasi — endi "savatcha" (bir nechta razmerni bir vaqtda sotish)
    // uslubida ishlaydi: avval tovar (local_id) tanlanadi, so'ng shu tovarning
    // xohlagan sonda razmer-qatorlari ("+ Yana razmer qo'shish" orqali) qo'shiladi.
    const emptySellRow = () => ({ size: '', sell_quantity: 1, selling_price: '' });
    const [sellSearch, setSellSearch] = useState('');
    const [sellData, setSellData] = useState({
        product_id: '',
        rows: [emptySellRow()]
    });

    // Rasxod formasi
    const [expenseData, setExpenseData] = useState({
        title: '',
        amount: '',
        expense_type: 'daily'
    });

    // O'chirish formasi — xuddi sotish savatchasi kabi, bir nechta razmerni
    // bitta amal bilan kamaytirish/o'chirish imkonini beradi.
    const emptyDeleteRow = () => ({ size: '', remove_all: false, quantity_to_remove: 1 });
    const [deleteSearch, setDeleteSearch] = useState('');
    const [deleteData, setDeleteData] = useState({
        product_id: '',
        rows: [emptyDeleteRow()]
    });

    // Chiqish (Logout) funksiyasi
    const handleLogout = () => {
        if (window.confirm("Tizimdan chiqishni tasdiqlaysizmi?")) {
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    // Ma'lumotlarni yuklash
    const fetchData = async (showMainLoader = false) => {
        try {
            if (showMainLoader) setIsInitialLoading(true);

            const [statsRes, productsRes] = await Promise.all([
                api.get('/api/dashboard/stats'),
                api.get('/api/products')
            ]);

            if (statsRes.data) {
                setStats((prev) => ({ ...prev, ...statsRes.data }));
            }
            const fetchedProducts = productsRes.data?.products || productsRes.data || [];
            setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
        } catch (err) {
            console.error("Ma'lumotlarni yuklashda xatolik:", err);
        } finally {
            if (showMainLoader) setIsInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchData(true);
    }, []);

    const formatSum = (val) => {
        return Number(val || 0).toLocaleString('uz-UZ');
    };

    // --- RAZMERLARGA KO'RA GURUHLASH ---
    // Bir xil local_id ga ega bo'lgan qatorlar (turli razmerlar) bitta "tovar" sifatida
    // guruhlanadi, shu bilan jadvalda va statistikada har bir o'lchamning qoldig'i
    // aniq ko'rinadi.
    const groupProductsByLocalId = (list) => {
        const map = new Map();
        (list || []).forEach((p) => {
            const key = p.local_id ?? p.id;
            if (!map.has(key)) {
                map.set(key, {
                    local_id: p.local_id,
                    category: p.category,
                    name: p.title || p.name,
                    color: p.color,
                    cost_price: p.cost_price,
                    variants: []
                });
            }
            map.get(key).variants.push({
                id: p.id,
                size: p.size,
                quantity: Number(p.quantity) || 0
            });
        });
        return Array.from(map.values());
    };

    const productGroups = groupProductsByLocalId(products);

    // --- SOTUV VA O'CHIRISH UCHUN TOVAR TANLASH VA KO'P RAZMERLI SAVATCHA MANTIG'I ---
    // Tovar endi ishonchli <select> orqali (local_id bo'yicha) tanlanadi — bu eski
    // "ID/nom yozib kiritish" usulidagi mos kelmaslik xatolarining oldini oladi va
    // tanlangan tovarning barcha razmerlari (va har birining qoldig'i) har doim
    // to'g'ri va aniq ko'rinishini kafolatlaydi.
    const matchesQuery = (group, query) => {
        const q = query.toLowerCase().trim();
        if (!q) return true;
        const idStr = group.local_id ? String(group.local_id) : '';
        const nameStr = (group.name || '').toLowerCase();
        const categoryStr = (group.category || '').toLowerCase();
        const colorStr = (group.color || '').toLowerCase();
        const sizesStr = group.variants.map((v) => (v.size || '').toLowerCase()).join(' ');
        return (
            idStr.includes(q) ||
            nameStr.includes(q) ||
            categoryStr.includes(q) ||
            colorStr.includes(q) ||
            sizesStr.includes(q)
        );
    };

    const filteredSellGroups = productGroups.filter((g) => matchesQuery(g, sellSearch));
    const filteredDeleteGroups = productGroups.filter((g) => matchesQuery(g, deleteSearch));

    const sellGroup = productGroups.find((g) => String(g.local_id) === String(sellData.product_id)) || null;
    const deleteGroup = productGroups.find((g) => String(g.local_id) === String(deleteData.product_id)) || null;

    // Berilgan tovar guruhi va bitta savatcha qatoridagi razmerga mos aniq bazadagi
    // qatorni (variantni) topib beradi. Agar tovarda umuman razmer bo'lmasa
    // (bitta "Standart" variant), razmer tanlashsiz o'sha yagona variant qaytariladi.
    const resolveVariant = (group, row) => {
        if (!group) return null;
        if (group.variants.length === 1) return group.variants[0];
        return group.variants.find((v) => String(v.size || '') === String(row.size || '')) || null;
    };

    // Tanlangan tovarda hali savatga qo'shilmagan (band qilinmagan) razmerlar soni —
    // "+ Yana razmer qo'shish" tugmasini shu asosda yoqamiz/o'chiramiz.
    const usedSellSizes = (excludeIndex) =>
        sellData.rows.filter((_, i) => i !== excludeIndex).map((r) => r.size);
    const usedDeleteSizes = (excludeIndex) =>
        deleteData.rows.filter((_, i) => i !== excludeIndex).map((r) => r.size);

    const canAddMoreSellRows = sellGroup && sellData.rows.length < sellGroup.variants.length;
    const canAddMoreDeleteRows = deleteGroup && deleteData.rows.length < deleteGroup.variants.length;

    // Tovar tanlanganda (select orqali) savatcha bitta bo'sh qator bilan qayta boshlanadi
    const handleSellGroupSelect = (localId) => {
        const group = productGroups.find((g) => String(g.local_id) === String(localId));
        setSellData({
            product_id: localId,
            rows: [{
                size: group && group.variants.length === 1 ? (group.variants[0].size || '') : '',
                sell_quantity: 1,
                selling_price: ''
            }]
        });
    };

    const handleDeleteGroupSelect = (localId) => {
        const group = productGroups.find((g) => String(g.local_id) === String(localId));
        setDeleteData({
            product_id: localId,
            rows: [{
                size: group && group.variants.length === 1 ? (group.variants[0].size || '') : '',
                remove_all: false,
                quantity_to_remove: 1
            }]
        });
    };

    const updateSellRow = (index, patch) => {
        setSellData((prev) => ({
            ...prev,
            rows: prev.rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
        }));
    };

    const updateDeleteRow = (index, patch) => {
        setDeleteData((prev) => ({
            ...prev,
            rows: prev.rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
        }));
    };

    const addSellRow = () => {
        if (!canAddMoreSellRows) return;
        setSellData((prev) => ({ ...prev, rows: [...prev.rows, emptySellRow()] }));
    };

    const addDeleteRow = () => {
        if (!canAddMoreDeleteRows) return;
        setDeleteData((prev) => ({ ...prev, rows: [...prev.rows, emptyDeleteRow()] }));
    };

    const removeSellRow = (index) => {
        setSellData((prev) => ({
            ...prev,
            rows: prev.rows.length > 1 ? prev.rows.filter((_, i) => i !== index) : prev.rows
        }));
    };

    const removeDeleteRow = (index) => {
        setDeleteData((prev) => ({
            ...prev,
            rows: prev.rows.length > 1 ? prev.rows.filter((_, i) => i !== index) : prev.rows
        }));
    };

    // 1. Tovar qo'shish (bir nechta razmer bilan)
    const handleAddProduct = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await api.post('/api/products', {
                category: newProduct.category || 'Umumiy',
                name: newProduct.name,
                color: newProduct.color,
                cost_price: Number(newProduct.cost_price) || 0,
                quantity: Number(newProduct.quantity) || 1,
                sizes: newProduct.sizes || ''
            });

            setAddProductModal(false);
            setNewProduct({ category: '', name: '', color: '', cost_price: '', sizes: '', quantity: '' });
            await fetchData(false);

            const displayId = res.data?.local_id || res.data?.product?.local_id || '';
            alert(res.data?.message || `Tovar saqlandi! Biriktirilgan ID: #${displayId}`);
        } catch (err) {
            alert(err.response?.data?.message || "Tovar qo'shishda xatolik yuz berdi!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 2. Tovar sotish — bir vaqtning o'zida bir nechta razmerni sotish mumkin
    // ("+ Yana razmer qo'shish" orqali qo'shilgan har bir qator alohida item
    // sifatida backendga yuboriladi va bitta savdo sifatida birgalikda amalga oshiriladi)
    const handleSellProduct = async (e) => {
        e.preventDefault();

        if (!sellGroup) {
            alert("Iltimos, sotiladigan tovarni tanlang!");
            return;
        }

        const items = [];
        const seenVariantIds = new Set();

        for (let i = 0; i < sellData.rows.length; i++) {
            const row = sellData.rows[i];

            if (sellGroup.variants.length > 1 && !row.size) {
                alert(`${i + 1}-qatorda razmerni tanlang!`);
                return;
            }

            const variant = resolveVariant(sellGroup, row);
            if (!variant) {
                alert(`${i + 1}-qatordagi razmer bo'yicha tovar topilmadi!`);
                return;
            }

            if (seenVariantIds.has(variant.id)) {
                alert("Bir xil razmerni savatchada faqat bir marta tanlang!");
                return;
            }
            seenVariantIds.add(variant.id);

            const qty = Number(row.sell_quantity);
            const price = Number(row.selling_price);

            if (!qty || qty <= 0) {
                alert(`${i + 1}-qatorda sotilayotgan sonni to'g'ri kiriting!`);
                return;
            }
            if (qty > variant.quantity) {
                alert(`${i + 1}-qatorda: omborda faqat ${variant.quantity} ta bor!`);
                return;
            }
            if (isNaN(price) || price < 0 || row.selling_price === '') {
                alert(`${i + 1}-qatorda sotish narxini to'g'ri kiriting!`);
                return;
            }

            items.push({
                product_id: Number(variant.id),
                sell_quantity: qty,
                selling_price: price
            });
        }

        if (items.length === 0) {
            alert("Kamida bitta razmer va son kiritilishi shart!");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/api/dashboard/sell', { items });

            setSellModal(false);
            setSellData({ product_id: '', rows: [emptySellRow()] });
            setSellSearch('');
            await fetchData(false);
            alert(items.length > 1 ? "Barcha razmerlar muvaffaqiyatli sotildi!" : "Sotuv muvaffaqiyatli amalga oshirildi!");
        } catch (err) {
            alert(err.response?.data?.message || "Sotuvda xatolik yuz berdi!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 3. Rasxod qo'shish
    const handleAddExpense = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/api/dashboard/expenses', {
                title: expenseData.title,
                amount: Number(expenseData.amount) || 0,
                expense_type: expenseData.expense_type
            });

            setExpenseModal(false);
            setExpenseData({ title: '', amount: '', expense_type: 'daily' });
            await fetchData(false);
            alert("Rasxod kiritildi!");
        } catch (err) {
            alert(err.response?.data?.message || "Rasxod qo'shishda xatolik!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 4. Tovarni kamaytirish / O'chirish — bir vaqtning o'zida bir nechta
    // razmerdan olib tashlash mumkin (savatcha uslubida, sotuv modaliga o'xshash)
    const handleDeleteProduct = async (e) => {
        e.preventDefault();

        if (!deleteGroup) {
            alert("Iltimos, o'chiriladigan/kamaytiriladigan tovarni tanlang!");
            return;
        }

        const items = [];
        const seenVariantIds = new Set();

        for (let i = 0; i < deleteData.rows.length; i++) {
            const row = deleteData.rows[i];

            if (deleteGroup.variants.length > 1 && !row.size) {
                alert(`${i + 1}-qatorda razmerni tanlang!`);
                return;
            }

            const variant = resolveVariant(deleteGroup, row);
            if (!variant) {
                alert(`${i + 1}-qatordagi razmer bo'yicha tovar topilmadi!`);
                return;
            }

            if (seenVariantIds.has(variant.id)) {
                alert("Bir xil razmerni ro'yxatda faqat bir marta tanlang!");
                return;
            }
            seenVariantIds.add(variant.id);

            const removeQty = row.remove_all ? variant.quantity : (Number(row.quantity_to_remove) || 0);

            if (!removeQty || removeQty <= 0) {
                alert(`${i + 1}-qatorda olib tashlanadigan sonni to'g'ri kiriting!`);
                return;
            }
            if (removeQty > variant.quantity) {
                alert(`${i + 1}-qatorda: omborda faqat ${variant.quantity} ta bor!`);
                return;
            }

            items.push({
                product_id: Number(variant.id),
                remove_all: !!row.remove_all,
                quantity_to_remove: removeQty
            });
        }

        if (items.length === 0) {
            alert("Kamida bitta razmer va son kiritilishi shart!");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/api/dashboard/delete-product', { items });

            setDeleteModal(false);
            setDeleteData({ product_id: '', rows: [emptyDeleteRow()] });
            setDeleteSearch('');
            await fetchData(false);
            alert(items.length > 1 ? "Barcha razmerlar bo'yicha amal bajarildi!" : "Amal muvaffaqiyatli bajarildi!");
        } catch (err) {
            alert(err.response?.data?.message || "O'chirishda xatolik yuz berdi!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Qidiruv bo'yicha filtrlash (guruh darajasida: ID, nomi, kategoriya, rangi yoki
    // istalgan razmer mos kelsa, shu tovar guruhi ko'rsatiladi)
    const filteredGroups = productGroups.filter((g) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;

        const idStr = g.local_id ? String(g.local_id) : '';
        const nameStr = (g.name || '').toLowerCase();
        const categoryStr = (g.category || '').toLowerCase();
        const colorStr = (g.color || '').toLowerCase();
        const sizesStr = g.variants.map((v) => (v.size || '').toLowerCase()).join(' ');

        return (
            idStr.includes(query) ||
            nameStr.includes(query) ||
            categoryStr.includes(query) ||
            colorStr.includes(query) ||
            sizesStr.includes(query)
        );
    });

    if (isInitialLoading) {
        return <div className="loading-spinner">Ma'lumotlar yuklanmoqda...</div>;
    }

    return (
        <div className="dashboard-container">
            {/* SARLAVHA VA AMALLAR TUGMALARI */}
            <header className="dashboard-header">
                <h2>🏬 {stats.storeName || "Mening Do'konim"} Boshqaruv Paneli</h2>
                <div className="header-buttons">
                    <button onClick={() => setAddProductModal(true)} className="btn btn-add">➕ Tovar Qo'shish</button>
                    <button onClick={() => setSellModal(true)} className="btn btn-sell">🛒 Tovar Sotish</button>
                    <button onClick={() => setExpenseModal(true)} className="btn btn-expense">💸 Rasxod Yozish</button>
                    <button onClick={() => setDeleteModal(true)} className="btn btn-delete">🗑️ Tovarni O'chirish</button>
                    <button onClick={handleLogout} className="btn btn-logout">🚪 Chiqish</button>
                </div>
            </header>

            {/* STATISTIKA KARTALARI */}
            <section className="stats-grid">
                <div className="stat-card">
                    <h4>Ombor Holati</h4>
                    <p><b>Jami tovar turi:</b> {stats.totalProducts || 0} xil</p>
                    <p><b>Jami qoldiq:</b> {stats.totalStock || 0} dona</p>
                </div>
                <div className="stat-card">
                    <h4>Bugungi Hisobot</h4>
                    <p><b>Sotildi:</b> {stats.dailySold || 0} dona</p>
                    <p><b>Tushum:</b> {formatSum(stats.dailyRevenue)} so'm</p>
                    <p><b>Sof Foyda:</b> <span className={(stats.dailyProfit || 0) >= 0 ? "profit-plus" : "profit-minus"}>{formatSum(stats.dailyProfit)} so'm</span></p>
                </div>
                <div className="stat-card">
                    <h4>Oylik Hisobot</h4>
                    <p><b>Sotildi:</b> {stats.monthlySold || 0} dona</p>
                    <p><b>Tushum:</b> {formatSum(stats.monthlyRevenue)} so'm</p>
                    <p><b>Sof Foyda:</b> <span className={(stats.monthlyProfit || 0) >= 0 ? "profit-plus" : "profit-minus"}>{formatSum(stats.monthlyProfit)} so'm</span></p>
                </div>
                <div className="stat-card">
                    <h4>Jami Rasxodlar</h4>
                    <p><b>Bugun:</b> {formatSum(stats.dailyExpense)} so'm</p>
                    <p><b>Shu Oy:</b> {formatSum(stats.monthlyExpense)} so'm</p>
                    <p><b>Jami:</b> {formatSum(stats.totalExpense)} so'm</p>
                </div>
            </section>

            {/* QIDIRUV VA OMBOR JADVALI */}
            <section className="products-section">
                <div className="section-header">
                    <h3>📦 Ombordagi Tovarlar</h3>
                    <input
                        type="text"
                        placeholder="ID, Nomi, Kategoriya, Rang yoki O'lchami bo'yicha qidirish..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <table className="products-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Kategoriya</th>
                            <th>Tovar Nomi</th>
                            <th>Rangi</th>
                            <th>Kelgan Narxi (Tannarx)</th>
                            <th>O'lchamlar / Qoldiq</th>
                            <th>Jami Qoldiq</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredGroups.length > 0 ? (
                            filteredGroups.map((g) => {
                                const totalQty = g.variants.reduce((sum, v) => sum + v.quantity, 0);
                                return (
                                    <tr key={g.local_id}>
                                        <td><b>#{g.local_id}</b></td>
                                        <td><span className="category-badge">{g.category || 'Umumiy'}</span></td>
                                        <td><b>{g.name}</b></td>
                                        <td>{g.color ? <span className="color-badge">{g.color}</span> : '-'}</td>
                                        <td>{formatSum(g.cost_price)} so'm</td>
                                        <td>
                                            <div className="size-badge-list">
                                                {g.variants.map((v) => (
                                                    <span
                                                        key={v.id}
                                                        className={`size-badge ${v.quantity < 3 ? "size-badge-low" : ""}`}
                                                    >
                                                        {v.size ? v.size : "Standart"}: {v.quantity} ta
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td><b className={totalQty < 5 ? "warning-stock" : ""}>{totalQty} ta</b></td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" className="no-data">Tovar topilmadi!</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            {/* ➕ YANGI TOVAR QO'SHISH MODALI */}
            {addProductModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>➕ Yangi Tovar Qo‘shish</h3>
                        <form onSubmit={handleAddProduct} className="product-form">
                            <div className="form-group">
                                <label>Kategoriya (Ixtiyoriy):</label>
                                <input
                                    type="text"
                                    placeholder="Divan, Krossovka, Tufli..."
                                    value={newProduct.category}
                                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Tovar Nomi * :</label>
                                <input
                                    type="text"
                                    placeholder="Nike Air Max"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Kelgan Narxi (Tannarx) * :</label>
                                <input
                                    type="number"
                                    placeholder="140000"
                                    value={newProduct.cost_price}
                                    onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Rangi:</label>
                                <input
                                    type="text"
                                    placeholder="Qora"
                                    value={newProduct.color}
                                    onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                            {/* RAZMERLAR: bir nechta razmer vergul bilan kiritiladi */}
                            <div className="form-group">
                                <label>Razmerlar (ixtiyoriy, bir nechtasini vergul bilan ajrating):</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: 39, 40, 41, 42, 43"
                                    value={newProduct.sizes}
                                    onChange={(e) => setNewProduct({ ...newProduct, sizes: e.target.value })}
                                    className="form-input"
                                />
                                <small className="form-hint">
                                    Bir nechta razmer kiritsangiz, pastdagi "Umumiy Soni" ular orasida
                                    avtomatik ravishda (imkon qadar teng) taqsimlanadi.
                                </small>
                            </div>
                            <div className="form-group">
                                <label>Umumiy Soni (barcha razmerlar uchun) * :</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="10"
                                    value={newProduct.quantity}
                                    onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>

                            {/* RAZMERLARGA TAQSIMLASH OLDINDAN KO'RISH */}
                            {newProduct.sizes && newProduct.quantity ? (() => {
                                const list = [...new Set(
                                    newProduct.sizes.split(',').map((s) => s.trim()).filter(Boolean)
                                )];
                                if (list.length === 0) return null;
                                const total = Number(newProduct.quantity) || 0;
                                const base = Math.floor(total / list.length);
                                const rem = total % list.length;
                                return (
                                    <div className="info-banner info-success">
                                        📏 Taqsimot: {list.map((s, i) => `${s}: ${base + (i < rem ? 1 : 0)} ta`).join(', ')}
                                    </div>
                                );
                            })() : null}
                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAddProductModal(false)}
                                    className="btn btn-danger"
                                    disabled={isSubmitting}
                                >
                                    Bekor qilish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 🛒 TOVAR SOTISH MODALI */}
            {sellModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header">
                            <h3>🛒 Tovar Sotish</h3>
                        </div>

                        <form onSubmit={handleSellProduct} className="product-form">
                            <div className="form-group">
                                <label>Tovar bo'yicha qidirish :</label>
                                <input
                                    type="text"
                                    placeholder="ID raqami yoki nomini yozing (masalan: 1 yoki futbolka)..."
                                    value={sellSearch}
                                    onChange={(e) => {
                                        const query = e.target.value;
                                        setSellSearch(query);

                                        if (!query) {
                                            setSellData(prev => ({ ...prev, product_id: '', rows: [emptySellRow()] }));
                                            return;
                                        }

                                        // Aniq mos keladigan ID yoki nomni qidiramiz
                                        const foundGroup = productsGroups.find(g =>
                                            String(g.local_id) === String(query.trim()) ||
                                            g.name.toLowerCase().includes(query.toLowerCase())
                                        );

                                        if (foundGroup) {
                                            // Avtomatik ravishda ID ni o'rnatamiz va tanlaymiz
                                            setSellData(prev => ({ ...prev, product_id: String(foundGroup.local_id) }));
                                            handleSellGroupSelect(foundGroup.local_id);
                                        } else {
                                            setSellData(prev => ({ ...prev, product_id: '', rows: [emptySellRow()] }));
                                        }
                                    }}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Tovarni tanlang * :</label>
                                <select
                                    value={sellData.product_id}
                                    onChange={(e) => handleSellGroupSelect(e.target.value)}
                                    required
                                    className="form-input"
                                >
                                    <option value="">-- Tovarni tanlang --</option>
                                    {filteredSellGroups.map((g) => (
                                        <option key={g.local_id} value={g.local_id}>
                                            #{g.local_id} — {g.name} {g.color ? `(${g.color})` : ''} — jami: {g.variants.reduce((s, v) => s + v.quantity, 0)} ta
                                        </option>
                                    ))}
                                </select>
                                {sellSearch && filteredSellGroups.length === 0 && (
                                    <div className="error-text">⚠️ Qidiruvga mos tovar topilmadi!</div>
                                )}
                            </div>

                            {sellGroup && (
                                <>
                                    <div className="info-banner info-success">
                                        ✅ Tanlangan: <b>{sellGroup.name}</b> ({sellGroup.color || 'Rangsiz'}) —
                                        mavjud razmerlar: {sellGroup.variants.map((v) => `${v.size || 'Standart'} (${v.quantity} ta)`).join(', ')}
                                    </div>

                                    {sellData.rows.map((row, index) => {
                                        const variant = resolveVariant(sellGroup, row);
                                        const usedSizes = usedSellSizes(index);
                                        return (
                                            <div className="cart-row" key={index}>
                                                {sellGroup.variants.length > 1 && (
                                                    <div className="form-group">
                                                        <label>Razmer * ({index + 1}-qator) :</label>
                                                        <select
                                                            value={row.size}
                                                            onChange={(e) => updateSellRow(index, { size: e.target.value })}
                                                            required
                                                            className="form-input"
                                                        >
                                                            <option value="">-- Razmerni tanlang --</option>
                                                            {sellGroup.variants
                                                                .filter((v) => !usedSizes.includes(v.size) || v.size === row.size)
                                                                .map((v) => (
                                                                    <option key={v.id} value={v.size || ''}>
                                                                        {v.size || 'Standart'} (Qoldiq: {v.quantity} ta)
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {variant && (
                                                    <div className="cart-row-fields">
                                                        <div className="form-group">
                                                            <label>Soni (Dona) * :</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={variant.quantity}
                                                                value={row.sell_quantity}
                                                                onChange={(e) => updateSellRow(index, { sell_quantity: e.target.value })}
                                                                required
                                                                className="form-input"
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Sotish narxi (1 dona) * :</label>
                                                            <input
                                                                type="number"
                                                                value={row.selling_price}
                                                                onChange={(e) => updateSellRow(index, { selling_price: e.target.value })}
                                                                placeholder="350000"
                                                                required
                                                                className="form-input"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {sellData.rows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSellRow(index)}
                                                        className="btn btn-remove-row"
                                                    >
                                                        ✕ Qatorni olib tashlash
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {canAddMoreSellRows && (
                                        <button type="button" onClick={addSellRow} className="btn btn-add-row">
                                            + Yana razmer qo'shish
                                        </button>
                                    )}

                                    {(() => {
                                        const validRows = sellData.rows
                                            .map((row) => ({ row, variant: resolveVariant(sellGroup, row) }))
                                            .filter(({ variant, row }) => variant && Number(row.selling_price) >= 0 && row.selling_price !== '' && Number(row.sell_quantity) > 0);

                                        if (validRows.length === 0) return null;

                                        const totalRevenue = validRows.reduce((s, { row }) => s + Number(row.selling_price) * Number(row.sell_quantity), 0);
                                        const totalProfit = validRows.reduce((s, { row, variant }) => s + (Number(row.selling_price) - Number(variant.cost_price || sellGroup.cost_price || 0)) * Number(row.sell_quantity), 0);

                                        return (
                                            <div className="calculation-box">
                                                <div className="calc-row">
                                                    <span>Jami tushum:</span>
                                                    <strong>{formatSum(totalRevenue)} so'm</strong>
                                                </div>
                                                <div className="calc-row calc-total">
                                                    <span>Kutilayotgan foyda:</span>
                                                    <strong className={totalProfit >= 0 ? "profit-plus" : "profit-minus"}>
                                                        {totalProfit >= 0 ? '+' : ''}{formatSum(totalProfit)} so'm
                                                    </strong>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </>
                            )}

                            <div className="modal-actions">
                                <button type="submit" disabled={isSubmitting || !sellGroup} className="btn btn-primary">
                                    {isSubmitting ? "Sotilmoqda..." : "Sotuvni Bajarish"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSellModal(false);
                                        setSellData({ product_id: '', rows: [emptySellRow()] });
                                        setSellSearch('');
                                    }}
                                    className="btn btn-danger"
                                >
                                    Bekor qilish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 💸 RASXOD MODALI (TEGILMADI) */}
            {expenseModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>💸 Rasxod Yozish</h3>
                        <form onSubmit={handleAddExpense} className="product-form">
                            <div className="form-group">
                                <label>Rasxod Nomi/Sababi * :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Tushlik yoki Arenda"
                                    value={expenseData.title}
                                    onChange={(e) => setExpenseData({ ...expenseData, title: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Suma (So'm) * :</label>
                                <input
                                    type="number"
                                    placeholder="50000"
                                    value={expenseData.amount}
                                    onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Rasxod Turi :</label>
                                <select
                                    value={expenseData.expense_type}
                                    onChange={(e) => setExpenseData({ ...expenseData, expense_type: e.target.value })}
                                    className="form-input"
                                >
                                    <option value="daily">Kunlik</option>
                                    <option value="monthly">Oylik</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setExpenseModal(false)}
                                    className="btn btn-danger"
                                    disabled={isSubmitting}
                                >
                                    Bekor qilish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 🗑️ TOVARNI O'CHIRISH MODALI */}
            {deleteModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header">
                            <h3>🗑️ Tovarni O'chirish / Kamaytirish</h3>
                        </div>

                        <form onSubmit={handleDeleteProduct} className="product-form">
                            <div className="form-group">
                                <label>Tovar bo'yicha qidirish :</label>
                                <input
                                    type="text"
                                    placeholder="ID raqami yoki nomini yozing (masalan: 1 yoki futbolka)..."
                                    value={sellSearch}
                                    onChange={(e) => {
                                        const query = e.target.value;
                                        setSellSearch(query);

                                        if (!query) {
                                            setSellData(prev => ({ ...prev, product_id: '', rows: [emptySellRow()] }));
                                            return;
                                        }

                                        const foundGroup = productsGroups.find(g =>
                                            String(g.local_id) === String(query.trim()) ||
                                            g.name.toLowerCase().includes(query.toLowerCase())
                                        );

                                        if (foundGroup) {
                                            setDeleteData(prev => ({ ...prev, product_id: String(foundGroup.local_id) }));
                                            handleDeleteGroupSelect(foundGroup.local_id);
                                        } else {
                                            setDeleteData(prev => ({ ...prev, product_id: '', rows: [emptyDeleteRow()] }));
                                        }
                                    }}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Tovarni tanlang * :</label>
                                <select
                                    value={deleteData.product_id}
                                    onChange={(e) => handleDeleteGroupSelect(e.target.value)}
                                    required
                                    className="form-input"
                                >
                                    <option value="">-- Tovarni tanlang --</option>
                                    {filteredDeleteGroups.map((g) => (
                                        <option key={g.local_id} value={g.local_id}>
                                            #{g.local_id} — {g.name} {g.color ? `(${g.color})` : ''} — jami: {g.variants.reduce((s, v) => s + v.quantity, 0)} ta
                                        </option>
                                    ))}
                                </select>
                                {deleteSearch && filteredDeleteGroups.length === 0 && (
                                    <div className="error-text">⚠️ Qidiruvga mos tovar topilmadi!</div>
                                )}
                            </div>

                            {deleteGroup && (
                                <>
                                    <div className="info-banner info-danger">
                                        <div><strong>Tovar:</strong> {deleteGroup.name} ({deleteGroup.color || 'Rangsiz'})</div>
                                        <div><strong>Kategoriya:</strong> {deleteGroup.category || 'Umumiy'}</div>
                                        <div><strong>Mavjud razmerlar:</strong> {deleteGroup.variants.map((v) => `${v.size || 'Standart'} (${v.quantity} ta)`).join(', ')}</div>
                                    </div>

                                    {deleteData.rows.map((row, index) => {
                                        const variant = resolveVariant(deleteGroup, row);
                                        const usedSizes = usedDeleteSizes(index);
                                        return (
                                            <div className="cart-row" key={index}>
                                                {deleteGroup.variants.length > 1 && (
                                                    <div className="form-group">
                                                        <label>Razmer * ({index + 1}-qator) :</label>
                                                        <select
                                                            value={row.size}
                                                            onChange={(e) => updateDeleteRow(index, { size: e.target.value })}
                                                            required
                                                            className="form-input"
                                                        >
                                                            <option value="">-- Razmerni tanlang --</option>
                                                            {deleteGroup.variants
                                                                .filter((v) => !usedSizes.includes(v.size) || v.size === row.size)
                                                                .map((v) => (
                                                                    <option key={v.id} value={v.size || ''}>
                                                                        {v.size || 'Standart'} (Qoldiq: {v.quantity} ta)
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {variant && (
                                                    <>
                                                        <div className="form-group checkbox-group">
                                                            <label>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={row.remove_all}
                                                                    onChange={(e) => updateDeleteRow(index, { remove_all: e.target.checked })}
                                                                />
                                                                <span>Butunlay o'chirish (qoldiq: {variant.quantity} ta)</span>
                                                            </label>
                                                        </div>

                                                        {!row.remove_all && (
                                                            <div className="form-group">
                                                                <label>O'chiriladigan dona soni :</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={variant.quantity}
                                                                    value={row.quantity_to_remove}
                                                                    onChange={(e) => updateDeleteRow(index, { quantity_to_remove: e.target.value })}
                                                                    className="form-input"
                                                                    required
                                                                />
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {deleteData.rows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDeleteRow(index)}
                                                        className="btn btn-remove-row"
                                                    >
                                                        ✕ Qatorni olib tashlash
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {canAddMoreDeleteRows && (
                                        <button type="button" onClick={addDeleteRow} className="btn btn-add-row">
                                            + Yana razmer qo'shish
                                        </button>
                                    )}
                                </>
                            )}

                            <div className="modal-actions">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !deleteGroup}
                                    className="btn btn-delete"
                                >
                                    {isSubmitting ? "Bajarilmoqda..." : "Amalni Bajarish"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeleteModal(false);
                                        setDeleteData({ product_id: '', rows: [emptyDeleteRow()] });
                                        setDeleteSearch('');
                                    }}
                                    className="btn btn-secondary"
                                >
                                    Bekor qilish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;