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

    // Sotish formasi
    const [sellData, setSellData] = useState({
        product_id: '',
        product_name: '',
        size: '',
        sell_quantity: 1,
        selling_price: ''
    });

    // Rasxod formasi
    const [expenseData, setExpenseData] = useState({
        title: '',
        amount: '',
        expense_type: 'daily'
    });

    // O'chirish formasi
    const [deleteData, setDeleteData] = useState({
        product_id: '',
        product_name: '',
        size: '',
        remove_all: false,
        quantity_to_remove: 1
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

    // --- SOTUV VA O'CHIRISH UCHUN QIDIRUV, RAZMER TANLASH VA AVTO-TO'LDIRISH MANTIG'I ---

    // Tovar ID (local_id) bo'yicha shu tovarning barcha razmer-qatorlarini topamiz
    const sellGroupRows = products.filter((p) =>
        String(p.local_id) === String(sellData.product_id).trim()
    );
    const deleteGroupRows = products.filter((p) =>
        String(p.local_id) === String(deleteData.product_id).trim()
    );

    // Aniq tanlangan qator: agar tovarda faqat bitta razmer/variant bo'lsa avtomatik
    // tanlanadi, aks holda foydalanuvchi tanlagan razmerga mos qator olinadi
    const selectedSellProduct = sellGroupRows.length === 1
        ? sellGroupRows[0]
        : sellGroupRows.find((p) => String(p.size || '') === String(sellData.size || ''));

    const selectedDeleteProduct = deleteGroupRows.length === 1
        ? deleteGroupRows[0]
        : deleteGroupRows.find((p) => String(p.size || '') === String(deleteData.size || ''));

    const handleSellIdChange = (e) => {
        const idVal = e.target.value;
        const rows = products.filter((p) => String(p.local_id) === idVal.trim());
        const first = rows[0];

        setSellData((prev) => ({
            ...prev,
            product_id: idVal,
            product_name: first ? (first.title || first.name) : '',
            size: rows.length === 1 ? (first.size || '') : '',
        }));
    };

    const handleSellNameChange = (e) => {
        const nameVal = e.target.value;
        const found = products.find((p) =>
            (p.title || p.name || '').toLowerCase().includes(nameVal.toLowerCase())
        );
        const rows = found ? products.filter((p) => String(p.local_id) === String(found.local_id)) : [];

        setSellData((prev) => ({
            ...prev,
            product_name: nameVal,
            product_id: found ? String(found.local_id) : '',
            size: rows.length === 1 ? (rows[0].size || '') : ''
        }));
    };

    const handleDeleteIdChange = (e) => {
        const idVal = e.target.value;
        const rows = products.filter((p) => String(p.local_id) === idVal.trim());
        const first = rows[0];

        setDeleteData((prev) => ({
            ...prev,
            product_id: idVal,
            product_name: first ? (first.title || first.name) : '',
            size: rows.length === 1 ? (first.size || '') : ''
        }));
    };

    const handleDeleteNameChange = (e) => {
        const nameVal = e.target.value;
        const found = products.find((p) =>
            (p.title || p.name || '').toLowerCase().includes(nameVal.toLowerCase())
        );
        const rows = found ? products.filter((p) => String(p.local_id) === String(found.local_id)) : [];

        setDeleteData((prev) => ({
            ...prev,
            product_name: nameVal,
            product_id: found ? String(found.local_id) : '',
            size: rows.length === 1 ? (rows[0].size || '') : ''
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

    // 2. Tovar sotish (tanlangan razmer bo'yicha)
    const handleSellProduct = async (e) => {
        e.preventDefault();
        if (!sellData.product_id || sellGroupRows.length === 0) {
            alert("Iltimos, mavjud tovar ID'sini kiriting yoki nomini tanlang!");
            return;
        }
        if (sellGroupRows.length > 1 && !sellData.size) {
            alert("Iltimos, sotilayotgan tovarning razmerini tanlang!");
            return;
        }
        if (!selectedSellProduct) {
            alert("Tanlangan razmer bo'yicha tovar topilmadi!");
            return;
        }
        setIsSubmitting(true);
        try {
            await api.post('/api/dashboard/sell', {
                product_id: Number(selectedSellProduct.id),
                sell_quantity: Number(sellData.sell_quantity) || 1,
                selling_price: Number(sellData.selling_price) || 0
            });

            setSellModal(false);
            setSellData({ product_id: '', product_name: '', size: '', sell_quantity: 1, selling_price: '' });
            await fetchData(false);
            alert("Sotuv muvaffaqiyatli amalga oshirildi!");
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

    // 4. Tovarni kamaytirish / O'chirish (tanlangan razmer bo'yicha)
    const handleDeleteProduct = async (e) => {
        e.preventDefault();
        if (!deleteData.product_id || deleteGroupRows.length === 0) {
            alert("Iltimos, mavjud tovar ID'sini kiriting yoki nomini tanlang!");
            return;
        }
        if (deleteGroupRows.length > 1 && !deleteData.size) {
            alert("Iltimos, o'chiriladigan/kamaytiriladigan tovarning razmerini tanlang!");
            return;
        }
        if (!selectedDeleteProduct) {
            alert("Tanlangan razmer bo'yicha tovar topilmadi!");
            return;
        }
        setIsSubmitting(true);
        try {
            await api.post('/api/dashboard/delete-product', {
                product_id: Number(selectedDeleteProduct.id),
                remove_all: deleteData.remove_all,
                quantity_to_remove: deleteData.remove_all ? Number(selectedDeleteProduct.quantity) : Number(deleteData.quantity_to_remove) || 1
            });

            setDeleteModal(false);
            setDeleteData({ product_id: '', product_name: '', size: '', remove_all: false, quantity_to_remove: 1 });
            await fetchData(false);
            alert("Amal muvaffaqiyatli bajarildi!");
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
                        placeholder="ID, Nomi, Kategoriya yoki Rang bo'yicha qidirish..."
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
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>🛒 Tovar Sotish</h3>
                        </div>

                        <form onSubmit={handleSellProduct} className="product-form">
                            <div className="form-group">
                                <label>Tovar Nomi bo'yicha qidirish :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Nike, Divan..."
                                    value={sellData.product_name}
                                    onChange={handleSellNameChange}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Tovar ID'si * :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: 3"
                                    value={sellData.product_id}
                                    onChange={handleSellIdChange}
                                    required
                                    className="form-input"
                                />
                            </div>

                            {sellData.product_id && sellGroupRows.length === 0 && (
                                <div className="error-text">
                                    ⚠️ Bunday ID ga ega tovar topilmadi!
                                </div>
                            )}

                            {sellGroupRows.length > 1 && (
                                <div className="form-group">
                                    <label>Razmer * :</label>
                                    <select
                                        value={sellData.size}
                                        onChange={(e) => setSellData({ ...sellData, size: e.target.value })}
                                        required
                                        className="form-input"
                                    >
                                        <option value="">-- Razmerni tanlang --</option>
                                        {sellGroupRows.map((r) => (
                                            <option key={r.id} value={r.size || ''}>
                                                {r.size || 'Standart'} (Qoldiq: {r.quantity} ta)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedSellProduct && (
                                <div className="info-banner info-success">
                                    ✅ Topildi: <b>{selectedSellProduct.title || selectedSellProduct.name}</b>
                                    ({selectedSellProduct.color || 'Rangsiz'} | O'lchami: {selectedSellProduct.size || 'Standart'})
                                    — Qoldiq: {selectedSellProduct.quantity} ta
                                </div>
                            )}

                            <div className="form-group">
                                <label>Sotilayotgan Soni (Dona) * :</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedSellProduct?.quantity || 1}
                                    value={sellData.sell_quantity}
                                    onChange={(e) => setSellData({ ...sellData, sell_quantity: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Sotish Narxi (1 dona uchun) * :</label>
                                <input
                                    type="number"
                                    value={sellData.selling_price}
                                    onChange={(e) => setSellData({ ...sellData, selling_price: e.target.value })}
                                    placeholder="350000"
                                    required
                                    className="form-input"
                                />
                            </div>

                            {selectedSellProduct && Number(sellData.selling_price) > 0 && Number(sellData.sell_quantity) > 0 && (
                                <div className="calculation-box">
                                    <div className="calc-row">
                                        <span>Jami tushum:</span>
                                        <strong>
                                            {formatSum(Number(sellData.selling_price) * Number(sellData.sell_quantity))} so'm
                                        </strong>
                                    </div>
                                    <div className="calc-row calc-total">
                                        <span>Kutilayotgan foyda:</span>
                                        <strong className={((Number(sellData.selling_price) - Number(selectedSellProduct.cost_price || 0)) * Number(sellData.sell_quantity)) >= 0 ? "profit-plus" : "profit-minus"}>
                                            {((Number(sellData.selling_price) - Number(selectedSellProduct.cost_price || 0)) * Number(sellData.sell_quantity)) >= 0 ? '+' : ''}
                                            {formatSum((Number(sellData.selling_price) - Number(selectedSellProduct.cost_price || 0)) * Number(sellData.sell_quantity))} so'm
                                        </strong>
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="submit" disabled={isSubmitting || !selectedSellProduct} className="btn btn-primary">
                                    {isSubmitting ? "Sotilmoqda..." : "Sotuvni Bajarish"}
                                </button>
                                <button type="button" onClick={() => setSellModal(false)} className="btn btn-danger">
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
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>🗑️ Tovarni O'chirish / Kamaytirish</h3>
                        </div>

                        <form onSubmit={handleDeleteProduct} className="product-form">
                            <div className="form-group">
                                <label>Tovar Nomi bo'yicha qidirish :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Nike, Divan..."
                                    value={deleteData.product_name}
                                    onChange={handleDeleteNameChange}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Tovar ID'si * :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: 3"
                                    value={deleteData.product_id}
                                    onChange={handleDeleteIdChange}
                                    required
                                    className="form-input"
                                />
                            </div>

                            {deleteData.product_id && deleteGroupRows.length === 0 && (
                                <div className="error-text">
                                    ⚠️ Bunday ID ga ega tovar topilmadi!
                                </div>
                            )}

                            {deleteGroupRows.length > 1 && (
                                <div className="form-group">
                                    <label>Razmer * :</label>
                                    <select
                                        value={deleteData.size}
                                        onChange={(e) => setDeleteData({ ...deleteData, size: e.target.value })}
                                        required
                                        className="form-input"
                                    >
                                        <option value="">-- Razmerni tanlang --</option>
                                        {deleteGroupRows.map((r) => (
                                            <option key={r.id} value={r.size || ''}>
                                                {r.size || 'Standart'} (Qoldiq: {r.quantity} ta)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedDeleteProduct && (
                                <div className="info-banner info-danger">
                                    <div><strong>O'chirilayotgan Tovar:</strong> {selectedDeleteProduct.title || selectedDeleteProduct.name}</div>
                                    <div><strong>Kategoriya:</strong> {selectedDeleteProduct.category || 'Umumiy'}</div>
                                    <div><strong>Rangi:</strong> {selectedDeleteProduct.color || '-'}</div>
                                    <div><strong>O'lchami:</strong> {selectedDeleteProduct.size || 'Standart'}</div>
                                    <div><strong>Ombordagi qoldiq:</strong> {selectedDeleteProduct.quantity} ta</div>
                                </div>
                            )}

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={deleteData.remove_all}
                                        onChange={(e) => setDeleteData({ ...deleteData, remove_all: e.target.checked })}
                                    />
                                    <span>Butunlay o'chirib tashlash (barcha qoldiqni yo'qotish)</span>
                                </label>
                            </div>

                            {!deleteData.remove_all && (
                                <div className="form-group">
                                    <label>O'chiriladigan dona soni :</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedDeleteProduct?.quantity || 1}
                                        value={deleteData.quantity_to_remove}
                                        onChange={(e) => setDeleteData({ ...deleteData, quantity_to_remove: e.target.value })}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            )}

                            <div className="modal-actions">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !selectedDeleteProduct}
                                    className="btn btn-delete"
                                >
                                    {isSubmitting ? "Bajarilmoqda..." : deleteData.remove_all ? "Butunlay O'chirish" : "Kamaytirish"}
                                </button>
                                <button type="button" onClick={() => setDeleteModal(false)} className="btn btn-secondary">
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