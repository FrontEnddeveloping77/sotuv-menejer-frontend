import React, { useState, useEffect } from 'react';
import '../styles/dashboard.css';

// Vite Environment Variable bo'lmasa, avtomatik Render backend'ga yo'naltiradi
const API_URL = import.meta.env.VITE_API_URL || 'https://sotuv-menejer-backend.onrender.com';

// Sonlarni xavfsiz formatlash uchun yordamchi funksiya
const formatSum = (val) => {
    return Number(val || 0).toLocaleString('uz-UZ');
};

const DashboardPage = () => {
    const [stats, setStats] = useState({
        storeName: '',
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
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [subscriptionExpired, setSubscriptionExpired] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Modallar
    const [addProductModal, setAddProductModal] = useState(false);
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);

    // Formalar
    const [newProduct, setNewProduct] = useState({
        title: '',
        category: '',
        cost_price: '',
        color: '',
        size: '',
        quantity: '1',
        description: '',
    });

    const [sellForm, setSellForm] = useState({
        category: '',
        productId: '',
        quantity: 1,
        sellPrice: '',
    });

    const [deleteForm, setDeleteForm] = useState({
        category: '',
        productId: '',
        quantityToRemove: 1,
        removeAll: false,
    });

    const [expenseForm, setExpenseForm] = useState({
        title: '',
        amount: '',
        expense_type: 'daily',
    });

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 200);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAuthError = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    const handleResponseStatus = async (res) => {
        if (res.status === 402) {
            setSubscriptionExpired(true);
            return false;
        }
        if (res.status === 401 || res.status === 403) {
            handleAuthError();
            return false;
        }
        return true;
    };

    const fetchData = async () => {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) return handleAuthError();

        try {
            const statsRes = await fetch(`${API_URL}/api/dashboard/stats`, {
                headers: { Authorization: `Bearer ${currentToken}` },
            });
            if (!(await handleResponseStatus(statsRes))) return;
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats({
                    storeName: data.storeName || '',
                    totalProducts: data.totalProducts || 0,
                    totalStock: data.totalStock || 0,
                    totalSold: data.totalSold || 0,
                    totalRevenue: data.totalRevenue || 0,
                    totalProfit: data.totalProfit || 0,
                    totalExpense: data.totalExpense || 0,
                    dailySold: data.dailySold || 0,
                    dailyRevenue: data.dailyRevenue || 0,
                    dailyProfit: data.dailyProfit || 0,
                    dailyExpense: data.dailyExpense || 0,
                    monthlySold: data.monthlySold || 0,
                    monthlyRevenue: data.monthlyRevenue || 0,
                    monthlyProfit: data.monthlyProfit || 0,
                    monthlyExpense: data.monthlyExpense || 0,
                    yearlySold: data.yearlySold || 0,
                    yearlyRevenue: data.yearlyRevenue || 0,
                    yearlyProfit: data.yearlyProfit || 0,
                    yearlyExpense: data.yearlyExpense || 0,
                });
            }

            const prodRes = await fetch(`${API_URL}/api/products`, {
                headers: { Authorization: `Bearer ${currentToken}` },
            });
            if (!(await handleResponseStatus(prodRes))) return;
            if (prodRes.ok) {
                const prodData = await prodRes.json();
                console.log("Serverdan kelgan mahsulotlar:", prodData);

                // Serverdan kelgan ma'lumot obyekt ichidagi products massivi ekanligini hisobga olamiz
                const productsArray = Array.isArray(prodData) ? prodData : (prodData.products || []);
                setProducts(productsArray);
            }
        } catch (err) {
            console.error('Xatolik:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // React yoki JS komponentingiz ichidagi funksiya:
    const handleAddProduct = async (e) => {
        e.preventDefault();
        const currentToken = localStorage.getItem('token');
        if (!currentToken) return handleAuthError();

        // Kategoriya kiritilgan bo'lsa, uni to'liq katta harfga o'tkazib olamiz (katta-kichik harf farqlanmasligi uchun)
        const formattedCategory = newProduct.category
            ? newProduct.category.trim().toUpperCase()
            : 'UMUMIY';

        try {
            const res = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({
                    category: formattedCategory, // Formatlangan kategoriya ketadi
                    title: newProduct.title,
                    name: newProduct.title,
                    cost_price: parseFloat(newProduct.cost_price) || 0,
                    color: newProduct.color,
                    size: newProduct.size,
                    quantity: parseInt(newProduct.quantity) || 1
                })
            });

            if (!(await handleResponseStatus(res))) return;

            const data = await res.json();
            if (res.ok) {
                alert("Tovar muvaffaqiyatli qo'shildi!");
                setAddProductModal(false);
                setNewProduct({
                    title: '',
                    category: '',
                    cost_price: '',
                    color: '',
                    size: '',
                    quantity: '1',
                    description: '',
                });
                fetchData();
            } else {
                alert(data.message || "Xatolik yuz berdi!");
            }
        } catch (err) {
            console.error("So'rov yuborishda xatolik:", err);
            alert("Server bilan bog'lanishda xatolik yuz berdi!");
        }
    };

    // 1. TOVARNI SOTISH (Sotildi)
    const handleSellProduct = async (e) => {
        e.preventDefault();
        if (!sellForm.productId) {
            alert('Iltimos, tovarni tanlang!');
            return;
        }

        const currentToken = localStorage.getItem('token');
        if (!currentToken) return handleAuthError();

        try {
            const res = await fetch(`${API_URL}/api/dashboard/sell`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${currentToken}`,
                },
                body: JSON.stringify({
                    product_id: parseInt(sellForm.productId),
                    sell_quantity: parseInt(sellForm.quantity) || 1,
                    selling_price: parseFloat(sellForm.sellPrice) || 0,
                }),
            });

            if (!(await handleResponseStatus(res))) return;

            const data = await res.json();
            if (res.ok) {
                alert("Tovar muvaffaqiyatli sotildi!");
                setSellModalOpen(false);
                setSellForm({ category: '', productId: '', quantity: 1, sellPrice: '' });
                fetchData(); // Ma'lumotlar va qoldiqlar yangilanadi
            } else {
                alert(data.message || 'Sotishda xatolik yuz berdi');
            }
        } catch (err) {
            console.error("Sotishda xatolik:", err);
            alert('Server bilan bog‘lanishda xatolik yuz berdi!');
        }
    };

    // 2. TOVARNI O'CHIRISH (Ombordan olib tashlash)
    const handleDeleteProduct = async (e) => {
        e.preventDefault();
        if (!deleteForm.productId) {
            alert('Iltimos, tovarni tanlang!');
            return;
        }

        const currentToken = localStorage.getItem('token');
        if (!currentToken) return handleAuthError();

        try {
            const res = await fetch(`${API_URL}/api/dashboard/delete-product`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${currentToken}`,
                },
                body: JSON.stringify({
                    product_id: parseInt(deleteForm.productId),
                    remove_all: deleteForm.removeAll,
                    quantity_to_remove: parseInt(deleteForm.quantityToRemove) || 1,
                }),
            });

            if (!(await handleResponseStatus(res))) return;

            const data = await res.json();
            if (res.ok) {
                alert("Tovar muvaffaqiyatli o'chirildi!");
                setDeleteModalOpen(false);
                setDeleteForm({ category: '', productId: '', quantityToRemove: 1, removeAll: false });
                fetchData(); // Jadval va qoldiqlar yangilanadi
            } else {
                alert(data.message || 'O‘chirishda xatolik yuz berdi');
            }
        } catch (err) {
            console.error("O'chirishda xatolik:", err);
            alert('Server bilan bog‘lanishda xatolik yuz berdi!');
        }
    };

    // 3. RASXOD QO'SHISH
    const handleAddExpense = async (e) => {
        e.preventDefault();
        const currentToken = localStorage.getItem('token');
        if (!currentToken) return handleAuthError();

        try {
            const res = await fetch(`${API_URL}/api/dashboard/expenses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${currentToken}`,
                },
                body: JSON.stringify(expenseForm),
            });

            if (!(await handleResponseStatus(res))) return;

            const data = await res.json();
            if (res.ok) {
                alert("Rasxod muvaffaqiyatli qo'shildi!");
                setExpenseModalOpen(false);
                setExpenseForm({ title: '', amount: '', expense_type: 'daily' });
                fetchData(); // Analitika yangilanadi
            } else {
                alert(data.message || 'Rasxod saqlashda xatolik');
            }
        } catch (err) {
            console.error("Rasxod qo'shishda xatolik:", err);
            alert('Server bilan bog‘lanishda xatolik!');
        }
    };

    const categories = Array.from(new Set((products || []).map((p) => p.category || 'Umumiy')));

    const filteredProducts = selectedCategory
        ? (products || []).filter((p) => (p.category || 'Umumiy') === selectedCategory)
        : [];

    const sellModalProducts = sellForm.category
        ? (products || []).filter((p) => (p.category || 'Umumiy') === sellForm.category)
        : [];

    const deleteModalProducts = deleteForm.category
        ? (products || []).filter((p) => (p.category || 'Umumiy') === deleteForm.category)
        : [];

    const selectedProductToSell = (products || []).find((p) => p.id === parseInt(sellForm.productId));
    const selectedProductToDelete = (products || []).find((p) => p.id === parseInt(deleteForm.productId));

    const calculatedProfit =
        selectedProductToSell && sellForm.sellPrice && sellForm.quantity
            ? (parseFloat(sellForm.sellPrice || 0) - parseFloat(selectedProductToSell.cost_price || 0)) *
            parseInt(sellForm.quantity || 1)
            : 0;

    if (loading) {
        return <div className="loading-state">Yuklanmoqda...</div>;
    }

    if (subscriptionExpired) {
        return (
            <div className="expired-container">
                <div className="expired-card">
                    <h2>⚠️ To'lov muddati tugagan!</h2>
                    <p>Tizimdan foydalanishni davom ettirish uchun Telegram bot orqali obunani uzaytiring.</p>
                    <button onClick={() => window.location.reload()} className="btn btn-primary btn-full">
                        🔄 Qayta tekshirish
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Sarlavha va Tugmalar */}
            <div className="dashboard-header">
                <h2>🏪 {stats.storeName || 'Mening Do‘konim'} — Analitika Paneli</h2>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setAddProductModal(true)}>
                        ➕ Tovar Qo‘shish
                    </button>
                    <button className="btn btn-danger" onClick={() => setDeleteModalOpen(true)}>
                        🗑️ Tovarni Olib Tashlash
                    </button>
                    <button className="btn btn-expense" onClick={() => setExpenseModalOpen(true)}>
                        💸 Rasxod Qo'shish
                    </button>
                    <button className="btn btn-success" onClick={() => setSellModalOpen(true)}>
                        🛒 Sotildi (Sotish)
                    </button>
                    <button className="btn btn-logout" onClick={handleLogout}>
                        🚪 Chiqish
                    </button>
                </div>
            </div>

            {/* OMBOR VA TOVAR KO'RSATKICHLARI */}
            <div className="stats-grid stats-grid-top">
                <div className="stat-card">
                    <h4>📦 TOVAR TURLARI</h4>
                    <h3>{products.length} ta</h3>
                </div>
                <div className="stat-card">
                    <h4>🏭 OMBORDA QOLDIQ</h4>
                    <h3>{products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0)} ta</h3>
                </div>
            </div>

            {/* 📊 DAVRIY SOTUV VA FOYDA STATISTIKASI */}
            <h3 className="stats-title">📊 Sotuv va Foyda Analitikasi</h3>
            <div className="stats-grid">
                <div className="stat-card">
                    <h4>📅 BUGUN SOTILDI</h4>
                    <h3>{stats.dailySold || 0} ta</h3>
                    <p>Tushum: <b>{formatSum(stats.dailyRevenue)} so'm</b></p>
                    <p>Rasxod: <b className="text-expense">{formatSum(stats.dailyExpense)} so'm</b></p>
                    <p>Sof Foyda: <b className={(stats.dailyProfit || 0) >= 0 ? 'text-profit-positive' : 'text-profit-negative'}>{formatSum(stats.dailyProfit)} so'm</b></p>
                </div>

                <div className="stat-card">
                    <h4>🗓️ SHU OY SOTILDI</h4>
                    <h3>{stats.monthlySold || 0} ta</h3>
                    <p>Tushum: <b>{formatSum(stats.monthlyRevenue)} so'm</b></p>
                    <p>Rasxod: <b className="text-expense">{formatSum(stats.monthlyExpense)} so'm</b></p>
                    <p>Sof Foyda: <b className={(stats.monthlyProfit || 0) >= 0 ? 'text-profit-positive' : 'text-profit-negative'}>{formatSum(stats.monthlyProfit)} so'm</b></p>
                </div>

                <div className="stat-card">
                    <h4>📆 SHU YIL SOTILDI</h4>
                    <h3>{stats.yearlySold || 0} ta</h3>
                    <p>Tushum: <b>{formatSum(stats.yearlyRevenue)} so'm</b></p>
                    <p>Rasxod: <b className="text-expense">{formatSum(stats.yearlyExpense)} so'm</b></p>
                    <p>Sof Foyda: <b className={(stats.yearlyProfit || 0) >= 0 ? 'text-profit-positive' : 'text-profit-negative'}>{formatSum(stats.yearlyProfit)} so'm</b></p>
                </div>

                <div className="stat-card">
                    <h4>💰 JAMI TUSHUM</h4>
                    <h3>{formatSum(stats.totalRevenue)} so'm</h3>
                    <p>Jami sotilgan: <b>{stats.totalSold || 0} ta</b></p>
                </div>

                <div className="stat-card">
                    <h4>📈 JAMI SOF FOYDA</h4>
                    <h3 className={(stats.totalProfit || 0) >= 0 ? 'text-profit-positive' : 'text-profit-negative'}>{formatSum(stats.totalProfit)} so'm</h3>
                    <p>Jami Rasxod: <b className="text-expense">{formatSum(stats.totalExpense)} so'm</b></p>
                </div>
            </div>

            {/* KATEGORIYALAR BO'LIMI */}
            <div className="box-card category-box">
                <div className="category-header">
                    <h2>📁 Kategoriya Bo‘yicha Ko‘rish</h2>
                    {selectedCategory && (
                        <button onClick={() => setSelectedCategory(null)} className="btn btn-close">
                            ✖ Yopish
                        </button>
                    )}
                </div>

                <div className="category-list">
                    {categories.length === 0 ? (
                        <p className="empty-text">Hozircha kategoriyalar yo'q</p>
                    ) : (
                        categories.map((cat) => {
                            const count = (products || []).filter((p) => (p.category || 'Umumiy') === cat).length;
                            const isSelected = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(isSelected ? null : cat)}
                                    className={`category-btn ${isSelected ? 'active' : ''}`}
                                >
                                    📂 {cat} <span className="category-count">({count} ta)</span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* TANLANGAN KATEGORIYA TOVARLARI JADVALI */}
            {selectedCategory && (
                <div className="box-card">
                    <h3>📦 "{selectedCategory}" Kategoriya Tovar Ro'yxati</h3>
                    <div className="table-wrapper">
                        <table className="products-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Kategoriya</th>
                                    <th>Nomi</th>
                                    <th>Tannarx (Kelgan)</th>
                                    <th>Rangi / O'lchami</th>
                                    <th>Ombordagi Qoldiq</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.id}</td>
                                        <td>
                                            <span className="category-badge">{p.category || 'Umumiy'}</span>
                                        </td>
                                        <td><b>{p.title}</b></td>
                                        <td>{formatSum(p.cost_price)} so'm</td>
                                        <td>{p.color || '-'} / {p.size || '-'}</td>
                                        <td>{p.quantity || 0} ta</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 💸 RASXOD QO'SHISH MODALI */}
            {expenseModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>💸 Rasxod Qo'shish</h3>
                        <form onSubmit={handleAddExpense} className="product-form">
                            <label>Rasxod Nomi (Sababi):</label>
                            <input
                                type="text"
                                placeholder="Arenda, Tushlik, Svet, Yo'l..."
                                value={expenseForm.title}
                                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                                required
                                className="form-input"
                            />

                            <label>Rasxod Summasi (so'm):</label>
                            <input
                                type="number"
                                placeholder="50000"
                                value={expenseForm.amount}
                                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                required
                                className="form-input"
                            />

                            <label>Rasxod Turi (Davri):</label>
                            <select
                                className="form-input"
                                value={expenseForm.expense_type}
                                onChange={(e) => setExpenseForm({ ...expenseForm, expense_type: e.target.value })}
                                required
                            >
                                <option value="daily">📅 Kunlik rasxod</option>
                                <option value="monthly">🗓️ Oylik rasxod</option>
                                <option value="yearly">📆 Yillik rasxod</option>
                            </select>

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-expense">Saqlash</button>
                                <button
                                    type="button"
                                    onClick={() => setExpenseModalOpen(false)}
                                    className="btn btn-danger"
                                >
                                    Bekor qilish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ➕ TOVAR QO'SHISH MODALI */}
            {addProductModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>➕ Yangi Tovar Qo‘shish</h3>
                        <form onSubmit={handleAddProduct} className="product-form">
                            <label>Kategoriya (Ixtiyoriy):</label>
                            <input
                                type="text"
                                placeholder="Divan, Krossovka, Tufli..."
                                value={newProduct.category}
                                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                className="form-input"
                            />

                            <label>Tovar Nomi * :</label>
                            <input
                                type="text"
                                placeholder="Nike Air Max"
                                value={newProduct.title}
                                onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                                required
                                className="form-input"
                            />

                            <label>Kelgan Narxi (Tannarx) * :</label>
                            <input
                                type="number"
                                placeholder="140000"
                                value={newProduct.cost_price}
                                onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                                required
                                className="form-input"
                            />

                            <div className="form-row">
                                <div>
                                    <label>Rangi:</label>
                                    <input
                                        type="text"
                                        placeholder="Qora"
                                        value={newProduct.color}
                                        onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                                <div>
                                    <label>O'lchami:</label>
                                    <input
                                        type="text"
                                        placeholder="41, 42"
                                        value={newProduct.size}
                                        onChange={(e) => setNewProduct({ ...newProduct, size: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            <label>Soni (Sklad):</label>
                            <input
                                type="number"
                                placeholder="1"
                                value={newProduct.quantity}
                                onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                                className="form-input"
                            />

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary">Saqlash</button>
                                <button type="button" onClick={() => setAddProductModal(false)} className="btn btn-danger">Bekor qilish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 🗑️ TOVARNI OLIB TASHLASH MODALI */}
            {deleteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>🗑️ Tovarni Olib Tashlash / O'chirish</h3>
                        <form onSubmit={handleDeleteProduct} className="product-form">
                            <label>1. Kategoriyani tanlang:</label>
                            <select
                                className="form-input"
                                value={deleteForm.category}
                                onChange={(e) => setDeleteForm({ ...deleteForm, category: e.target.value, productId: '' })}
                                required
                            >
                                <option value="">-- Kategoriyani tanlang --</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        📁 {cat}
                                    </option>
                                ))}
                            </select>

                            <label>2. Tovarni tanlang:</label>
                            <select
                                className="form-input"
                                value={deleteForm.productId}
                                onChange={(e) => setDeleteForm({ ...deleteForm, productId: e.target.value })}
                                disabled={!deleteForm.category}
                                required
                            >
                                <option value="">
                                    {deleteForm.category ? '-- Tovarni tanlang --' : '-- Avval kategoriyani tanlang --'}
                                </option>
                                {deleteModalProducts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} (Omborda {p.quantity || 0} ta bor)
                                    </option>
                                ))}
                            </select>

                            <div className="checkbox-container">
                                <input
                                    type="checkbox"
                                    id="removeAllCheck"
                                    checked={deleteForm.removeAll}
                                    onChange={(e) => setDeleteForm({ ...deleteForm, removeAll: e.target.checked })}
                                    className="checkbox-input"
                                />
                                <label htmlFor="removeAllCheck" className="checkbox-label">
                                    ⚠️ Hammasini o'chirish
                                </label>
                            </div>

                            {!deleteForm.removeAll && (
                                <>
                                    <label>Nechta olib tashlansin?</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedProductToDelete ? selectedProductToDelete.quantity : 1}
                                        value={deleteForm.quantityToRemove}
                                        onChange={(e) => setDeleteForm({ ...deleteForm, quantityToRemove: e.target.value })}
                                        required
                                        className="form-input"
                                    />
                                </>
                            )}

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-danger">O'chirishni tasdiqlash</button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeleteModalOpen(false);
                                        setDeleteForm({ category: '', productId: '', quantityToRemove: 1, removeAll: false });
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

            {/* 🛒 SOTILDI MODALI */}
            {sellModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>🛒 Tovar Sotish</h3>
                        <form onSubmit={handleSellProduct} className="product-form">
                            <label>1. Kategoriyani tanlang:</label>
                            <select
                                className="form-input"
                                value={sellForm.category}
                                onChange={(e) => setSellForm({ ...sellForm, category: e.target.value, productId: '' })}
                                required
                            >
                                <option value="">-- Kategoriyani tanlang --</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        📁 {cat}
                                    </option>
                                ))}
                            </select>

                            <label>2. Tovarni tanlang:</label>
                            <select
                                className="form-input"
                                value={sellForm.productId}
                                onChange={(e) => setSellForm({ ...sellForm, productId: e.target.value })}
                                disabled={!sellForm.category}
                                required
                            >
                                <option value="">
                                    {sellForm.category ? '-- Tovarni tanlang --' : '-- Avval kategoriyani tanlang --'}
                                </option>
                                {sellModalProducts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} (Omborda {p.quantity || 0} ta bor)
                                    </option>
                                ))}
                            </select>

                            {selectedProductToSell && (
                                <div className="info-box">
                                    <p>Tannarx (Kelgan narxi): <b>{formatSum(selectedProductToSell.cost_price)} so'm</b></p>
                                    <p>Omborda qoldiq: <b>{selectedProductToSell.quantity} ta</b></p>
                                </div>
                            )}

                            <label>3. Sotuv soni:</label>
                            <input
                                type="number"
                                min="1"
                                max={selectedProductToSell ? selectedProductToSell.quantity : 1}
                                value={sellForm.quantity}
                                onChange={(e) => setSellForm({ ...sellForm, quantity: e.target.value })}
                                required
                                className="form-input"
                            />

                            <label>4. Sotish narxi (Dona uchun so'm):</label>
                            <input
                                type="number"
                                placeholder="Masalan: 180000"
                                value={sellForm.sellPrice}
                                onChange={(e) => setSellForm({ ...sellForm, sellPrice: e.target.value })}
                                required
                                className="form-input"
                            />

                            {sellForm.sellPrice && selectedProductToSell && (
                                <div className="profit-preview">
                                    Kutilayotgan sof foyda: <b className={calculatedProfit >= 0 ? 'text-profit-positive' : 'text-profit-negative'}>{formatSum(calculatedProfit)} so'm</b>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-success">Sotishni tasdiqlash</button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSellModalOpen(false);
                                        setSellForm({ category: '', productId: '', quantity: 1, sellPrice: '' });
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

            {/* Scroll To Top Button */}
            {showScrollTop && (
                <button onClick={scrollToTop} className="scroll-top-btn">
                    ⬆️
                </button>
            )}
        </div>
    );
};

export default DashboardPage;