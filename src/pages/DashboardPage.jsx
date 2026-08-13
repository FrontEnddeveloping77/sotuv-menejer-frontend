import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/dashboard.css';

const [deleteId, setDeleteId] = useState('');
const [selectedDeleteProduct, setSelectedDeleteProduct] = useState(null);

// ID kiritilganda o'chiriladigan tovarni avtomatik topish
const handleDeleteIdChange = (e) => {
    const value = e.target.value;
    setDeleteId(value);

    if (!value.trim()) {
        setSelectedDeleteProduct(null);
        return;
    }

    // ID, local_id yoki tartib raqamiga qarab tovar topiladi
    const foundProduct = products.find((p, index) =>
        String(p.local_id || p.id) === value.trim() ||
        String(index + 1) === value.trim() ||
        String(products.length - index) === value.trim()
    );

    if (foundProduct) {
        setSelectedDeleteProduct(foundProduct);
    } else {
        setSelectedDeleteProduct(null);
    }
};

// Nomi bo'yicha qidirib topish (o'chirish uchun)
const handleDeleteNameChange = (e) => {
    const value = e.target.value;

    const foundProduct = products.find(p =>
        (p.title || p.name || '').toLowerCase().includes(value.toLowerCase())
    );

    if (foundProduct) {
        setSelectedDeleteProduct(foundProduct);
        setDeleteId(foundProduct.local_id || foundProduct.id);
    } else {
        setSelectedDeleteProduct(null);
    }
};

// Tovarni o'chirish so'rovini yuborish
const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!selectedDeleteProduct) return;

    if (!window.confirm(`Haqiqatan ham "${selectedDeleteProduct.title || selectedDeleteProduct.name}" tovarini o'chirmoqchimisiz?`)) {
        return;
    }

    setIsSubmitting(true);
    try {
        await api.delete(`/api/products/${selectedDeleteProduct.id}`);
        setDeleteModal(false);
        setDeleteId('');
        setSelectedDeleteProduct(null);
        await fetchData(false);
        alert("Tovar muvaffaqiyatli o'chirildi!");
    } catch (err) {
        alert(err.response?.data?.message || "Tovarni o'chirishda xatolik yuz berdi!");
    } finally {
        setIsSubmitting(false);
    }
};

const [searchId, setSearchId] = useState('');
const [searchName, setSearchName] = useState('');

// ID kiritilganda tovar ma'lumotlarini avtomatik to'ldirish
const handleIdChange = (e) => {
    const value = e.target.value;
    setSearchId(value);

    if (!value.trim()) {
        setSelectedProduct(null);
        setSearchName('');
        setSellingPrice(0);
        return;
    }

    // ID bo'yicha tovar topish (local_id, id yoki tartib raqamiga qaraydi)
    const foundProduct = products.find((p, index) =>
        String(p.local_id || p.id) === value.trim() ||
        String(index + 1) === value.trim() ||
        String(products.length - index) === value.trim()
    );

    if (foundProduct) {
        setSelectedProduct(foundProduct);
        setSearchName(foundProduct.title || foundProduct.name || '');
        setSellingPrice(foundProduct.selling_price || 0);
    } else {
        setSelectedProduct(null);
        setSearchName('');
    }
};

// Nomi bo'yicha qidirilganda
const handleNameChange = (e) => {
    const value = e.target.value;
    setSearchName(value);

    const foundProduct = products.find(p =>
        (p.title || p.name || '').toLowerCase().includes(value.toLowerCase())
    );

    if (foundProduct) {
        setSelectedProduct(foundProduct);
        setSearchId(foundProduct.local_id || foundProduct.id);
        setSellingPrice(foundProduct.selling_price || 0);
    }
};

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
        quantity: ''
    });

    // Sotish formasi
    const [sellData, setSellData] = useState({
        product_id: '',
        product_name: '',
        sell_quantity: 1,
        selling_price: ''
    });

    const [expenseData, setExpenseData] = useState({
        title: '',
        amount: '',
        expense_type: 'daily'
    });

    // O'chirish formasi
    const [deleteData, setDeleteData] = useState({
        product_id: '',
        product_name: '',
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

    // --- SOTUV VA O'CHIRISH UCHUN QIDIRUV MANTIG'I ---

    // Sotish modalida nomi bo'yicha mos keladigan tovarlar
    const matchedSellProducts = (products || []).filter((p) => {
        if (!sellData.product_name) return false;
        const name = (p.title || p.name || '').toLowerCase();
        return name.includes(sellData.product_name.toLowerCase());
    });

    // O'chirish modalida nomi bo'yicha mos keladigan tovarlar
    const matchedDeleteProducts = (products || []).filter((p) => {
        if (!deleteData.product_name) return false;
        const name = (p.title || p.name || '').toLowerCase();
        return name.includes(deleteData.product_name.toLowerCase());
    });

    // Sotuv uchun aynan tanlangan tovarning to'liq ma'lumoti (tannarx, qoldiq va h.k.)
    // Bu real vaqtda foyda hisoblash uchun kerak.
    const selectedSellProduct = products.find((p) => String(p.id) === String(sellData.product_id));

    // Sotuv modalida ID kiritilganda nomni avto-to'ldirish
    const handleSellIdChange = (idVal) => {
        const found = products.find((p) => String(p.id) === String(idVal));
        setSellData((prev) => ({
            ...prev,
            product_id: idVal,
            product_name: found ? (found.title || found.name) : prev.product_name
        }));
    };

    // Sotuv modalida Nomi kiritilganda
    const handleSellNameChange = (nameVal) => {
        const matches = products.filter((p) => (p.title || p.name || '').toLowerCase().includes(nameVal.toLowerCase()));

        let newId = sellData.product_id;
        if (matches.length === 1) {
            newId = matches[0].id;
        }

        setSellData((prev) => ({
            ...prev,
            product_name: nameVal,
            product_id: matches.length === 1 ? newId : prev.product_id
        }));
    };

    // Sotuv modalida ro'yxatdan tovar tanlanganda
    const handleSelectSellProduct = (productId) => {
        const found = products.find((p) => String(p.id) === String(productId));
        if (found) {
            setSellData((prev) => ({
                ...prev,
                product_id: found.id,
                product_name: found.title || found.name
            }));
        }
    };

    // O'chirish modalida ID kiritilganda nomni avto-to'ldirish
    const handleDeleteIdChange = (idVal) => {
        const found = products.find((p) => String(p.id) === String(idVal));
        setDeleteData((prev) => ({
            ...prev,
            product_id: idVal,
            product_name: found ? (found.title || found.name) : prev.product_name
        }));
    };

    // O'chirish modalida Nomi kiritilganda
    const handleDeleteNameChange = (nameVal) => {
        const matches = products.filter((p) => (p.title || p.name || '').toLowerCase().includes(nameVal.toLowerCase()));

        let newId = deleteData.product_id;
        if (matches.length === 1) {
            newId = matches[0].id;
        }

        setDeleteData((prev) => ({
            ...prev,
            product_name: nameVal,
            product_id: matches.length === 1 ? newId : prev.product_id
        }));
    };

    // O'chirish modalida ro'yxatdan tovar tanlanganda
    const handleSelectDeleteProduct = (productId) => {
        const found = products.find((p) => String(p.id) === String(productId));
        if (found) {
            setDeleteData((prev) => ({
                ...prev,
                product_id: found.id,
                product_name: found.title || found.name
            }));
        }
    };

    // 1. Tovar qo'shish
    const handleAddProduct = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await api.post('/api/products', {
                category: newProduct.category || 'Umumiy',
                name: newProduct.name,
                color: newProduct.color,
                cost_price: Number(newProduct.cost_price) || 0,
                quantity: Number(newProduct.quantity) || 1
            });

            setAddProductModal(false);
            setNewProduct({ category: '', name: '', color: '', cost_price: '', quantity: '' });
            await fetchData(false);

            const displayId = res.data?.product?.local_id || res.data?.product?.id || '';
            alert(res.data?.message || `Tovar saqlandi! Biriktirilgan ID: #${displayId}`);

        } catch (err) {
            alert(err.response?.data?.message || "Tovar qo'shishda xatolik yuz berdi!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 2. Tovar sotish
    const handleSellProduct = async (e) => {
        e.preventDefault();
        if (!sellData.product_id) {
            alert("Iltimos, tovarni tanlang yoki ID'sini kiriting!");
            return;
        }
        setIsSubmitting(true);
        try {
            await api.post('/api/dashboard/sell', {
                product_id: Number(sellData.product_id),
                sell_quantity: Number(sellData.sell_quantity) || 1,
                selling_price: Number(sellData.selling_price) || 0
            });

            setSellModal(false);
            setSellData({ product_id: '', product_name: '', sell_quantity: 1, selling_price: '' });
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

    // 4. Tovarni kamaytirish / O'chirish
    const handleDeleteProduct = async (e) => {
        e.preventDefault();
        if (!deleteData.product_id) {
            alert("Iltimos, tovarni tanlang yoki ID'sini kiriting!");
            return;
        }
        setIsSubmitting(true);
        try {
            await api.post('/api/dashboard/delete-product', {
                product_id: Number(deleteData.product_id),
                remove_all: deleteData.remove_all,
                quantity_to_remove: Number(deleteData.quantity_to_remove) || 1
            });

            setDeleteModal(false);
            setDeleteData({ product_id: '', product_name: '', remove_all: false, quantity_to_remove: 1 });
            await fetchData(false);
            alert("Amal muvaffaqiyatli bajarildi!");
        } catch (err) {
            alert(err.response?.data?.message || "O'chirishda xatolik yuz berdi!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Qidiruv bo'yicha filtrlash (Asosiy jadval uchun)
    const filteredProducts = (products || []).filter((p) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;

        const idStr = p.id ? p.id.toString() : '';
        const nameStr = (p.title || p.name || '').toLowerCase();
        const categoryStr = (p.category || '').toLowerCase();
        const colorStr = (p.color || '').toLowerCase();

        return (
            idStr.includes(query) ||
            nameStr.includes(query) ||
            categoryStr.includes(query) ||
            colorStr.includes(query)
        );
    });

    if (isInitialLoading) {
        return <div className="loading-spinner">Ma'lumotlar yuklanmoqda...</div>;
    }

    return (
        <div className="dashboard-container">
            {/* TEPANGI SARLAVHA VA AMALLAR TUGMALARI */}
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
                            <th>Qoldiq (Dona)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map((p, index) => (
                                <tr key={p.id}>
                                    <td><b>#{filteredProducts.length - index}</b></td>
                                    <td><span className="category-badge">{p.category || 'Umumiy'}</span></td>
                                    <td><b>{p.title || p.name}</b></td>
                                    <td>{p.color ? <span className="color-badge">{p.color}</span> : '-'}</td>
                                    <td>{formatSum(p.cost_price)} so'm</td>
                                    <td><b className={(p.quantity || 0) < 5 ? "warning-stock" : ""}>{p.quantity ?? 0} ta</b></td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="no-data">Tovar topilmadi!</td>
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
                            <div className="form-group">
                                <label>Soni (Sklad):</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="1"
                                    value={newProduct.quantity}
                                    onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
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

            {/* Tovar Sotish Modali */}
            {sellModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>🛒 Tovar Sotish</h2>
                            <button className="close-btn" onClick={() => setSellModal(false)}>&times;</button>
                        </div>

                        <form onSubmit={handleSellProduct}>
                            {/* Tovar Nomi bo'yicha qidirish */}
                            <div className="form-group">
                                <label>Tovar Nomi bo'yicha qidirish :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Nike, Divan..."
                                    value={searchName}
                                    onChange={handleNameChange}
                                />
                            </div>

                            {/* Tovar ID'si bo'yicha qidirish */}
                            <div className="form-group">
                                <label>Tovar ID'si (Ixtiyoriy) :</label>
                                <input
                                    type="number"
                                    placeholder="Masalan: 3"
                                    value={searchId}
                                    onChange={handleIdChange}
                                />
                            </div>

                            {/* Topilgan tovar haqida ma'lumot (ko'rsatkich) */}
                            {selectedProduct && (
                                <div style={{
                                    backgroundColor: '#e0f2fe',
                                    color: '#0369a1',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    marginBottom: '10px'
                                }}>
                                    ✅ Topildi: <b>{selectedProduct.title || selectedProduct.name}</b> ({selectedProduct.color || 'Rangsiz'}) — Qoldiq: {selectedProduct.quantity} ta
                                </div>
                            )}

                            <div className="form-group">
                                <label>Sotilayotgan Soni (Dona) * :</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedProduct?.quantity || 1}
                                    value={sellQuantity}
                                    onChange={(e) => setSellQuantity(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Sotish Narxi (1 dona uchun) * :</label>
                                <input
                                    type="number"
                                    value={sellingPrice}
                                    onChange={(e) => setSellingPrice(e.target.value)}
                                    placeholder="350000"
                                    required
                                />
                            </div>

                            {/* Kutilayotgan Foyda va Tushum Bloki */}
                            {selectedProduct && Number(sellingPrice) > 0 && Number(sellQuantity) > 0 && (
                                <div style={{
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    marginTop: '15px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569' }}>
                                        <span>Jami tushum:</span>
                                        <strong style={{ color: '#0f172a' }}>
                                            {formatSum(Number(sellingPrice) * Number(sellQuantity))} so'm
                                        </strong>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
                                        <span style={{ fontWeight: '600', color: '#0f172a' }}>Kutilayotgan foyda:</span>
                                        <strong style={{
                                            color: ((Number(sellingPrice) - Number(selectedProduct.cost_price || 0)) * Number(sellQuantity)) >= 0 ? '#16a34a' : '#dc2626'
                                        }}>
                                            {((Number(sellingPrice) - Number(selectedProduct.cost_price || 0)) * Number(sellQuantity)) >= 0 ? '+' : ''}
                                            {formatSum((Number(sellingPrice) - Number(selectedProduct.cost_price || 0)) * Number(sellQuantity))} so'm
                                        </strong>
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setSellModal(false)} className="btn-secondary">
                                    Bekor qilish
                                </button>
                                <button type="submit" disabled={isSubmitting || !selectedProduct} className="btn-primary">
                                    {isSubmitting ? "Sotilmoqda..." : "Sotuvni Bajarish"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 💸 RASXOD MODALI */}
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

            {/* Tovarni O'chirish Modali */}
            {deleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>🗑️ Tovarni O'chirish</h2>
                            <button className="close-btn" onClick={() => setDeleteModal(false)}>&times;</button>
                        </div>

                        <form onSubmit={handleConfirmDelete}>
                            {/* Tovar Nomi bo'yicha qidiruv */}
                            <div className="form-group">
                                <label>Tovar Nomi bo'yicha qidirish :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Nike, Divan..."
                                    onChange={handleDeleteNameChange}
                                />
                            </div>

                            {/* Tovar ID'si bo'yicha qidiruv */}
                            <div className="form-group">
                                <label>Tovar ID'si bo'yicha :</label>
                                <input
                                    type="number"
                                    placeholder="Masalan: 3"
                                    value={deleteId}
                                    onChange={handleDeleteIdChange}
                                    required
                                />
                            </div>

                            {/* Topilgan tovar va uning ma'lumotlari ko'rsatkichi */}
                            {selectedDeleteProduct ? (
                                <div style={{
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#991b1b',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    marginTop: '15px',
                                    fontSize: '14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    <div><strong>O'chirilayotgan Tovar:</strong> {selectedDeleteProduct.title || selectedDeleteProduct.name}</div>
                                    <div><strong>Kategoriya:</strong> {selectedDeleteProduct.category || 'Umumiy'}</div>
                                    <div><strong>Rangi:</strong> {selectedDeleteProduct.color || '-'}</div>
                                    <div><strong>Ombordagi qoldiq:</strong> {selectedDeleteProduct.quantity} ta</div>
                                </div>
                            ) : deleteId ? (
                                <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '10px' }}>
                                    ⚠️ Bunday ID ga ega tovar topilmadi!
                                </div>
                            ) : null}

                            <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setDeleteModal(false)} className="btn-secondary">
                                    Bekor qilish
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !selectedDeleteProduct}
                                    className="btn-danger"
                                    style={{
                                        backgroundColor: selectedDeleteProduct ? '#dc2626' : '#fca5a5',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '10px 18px',
                                        borderRadius: '6px',
                                        cursor: selectedDeleteProduct ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    {isSubmitting ? "O'chirilmoqda..." : "Tovarni O'chirish"}
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