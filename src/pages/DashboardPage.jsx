import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import '../styles/dashboard.css';

// MUHIM: Avval axios so'rovlarida na manzil (baseURL), na Authorization token
// yuborilmagan edi - shuning uchun barcha so'rovlar backendga yetib bormasdi.
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
    const [loading, setLoading] = useState(true);

    // Modallar holatlari
    const [addProductModal, setAddProductModal] = useState(false);
    const [sellModal, setSellModal] = useState(false);
    const [expenseModal, setExpenseModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);

    // Formlar holati
    // State'dan "size" olib tashlandi
    const [newProduct, setNewProduct] = useState({
        category: '',
        name: '',
        cost_price: '',
        color: '',
        quantity: ''
    });

    const [sellData, setSellData] = useState({
        product_id: '',
        sell_quantity: 1,
        selling_price: ''
    });

    const [expenseData, setExpenseData] = useState({
        title: '',
        amount: '',
        expense_type: 'daily'
    });

    const [deleteData, setDeleteData] = useState({
        product_id: '',
        remove_all: false,
        quantity_to_remove: 1
    });

    // Ma'lumotlarni yuklash
    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, productsRes] = await Promise.all([
                api.get('/api/dashboard/stats'),
                api.get('/api/products')
            ]);
            setStats(statsRes.data);
            setProducts(productsRes.data.products || productsRes.data);
        } catch (err) {
            console.error("Ma'lumotlarni yuklashda xatolik:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Pul summasini formatlash (Masalan: 100 000)
    const formatSum = (val) => {
        return Number(val || 0).toLocaleString('uz-UZ');
    };

    // 1. Tovar qo'shish (Razmersiz)
    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/api/products', {
                category: newProduct.category || 'Umumiy',
                name: newProduct.name,
                color: newProduct.color,
                cost_price: Number(newProduct.cost_price),
                quantity: Number(newProduct.quantity) || 1
            });

            setAddProductModal(false);
            setNewProduct({ category: '', name: '', color: '', cost_price: '', quantity: 1 });
            fetchData();
            alert(`Tovar saqlandi! Biriktirilgan ID: #${res.data.product?.id}`);
        } catch (err) {
            alert(err.response?.data?.message || "Tovar qo'shishda xatolik yuz berdi!");
        }
    };

    // 2. Tovar sotish
    const handleSellProduct = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/dashboard/sell', {
                product_id: Number(sellData.product_id),
                sell_quantity: Number(sellData.sell_quantity),
                selling_price: Number(sellData.selling_price)
            });

            setSellModal(false);
            setSellData({ product_id: '', sell_quantity: 1, selling_price: '' });
            fetchData();
            alert("Sotuv muvaffaqiyatli amalga oshirildi!");
        } catch (err) {
            alert(err.response?.data?.message || "Sotuvda xatolik yuz berdi!");
        }
    };

    // 3. Rasxod qo'shish
    const handleAddExpense = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/dashboard/expenses', {
                title: expenseData.title,
                amount: Number(expenseData.amount),
                expense_type: expenseData.expense_type
            });

            setExpenseModal(false);
            setExpenseData({ title: '', amount: '', expense_type: 'daily' });
            fetchData();
            alert("Rasxod kiritildi!");
        } catch (err) {
            alert(err.response?.data?.message || "Rasxod qo'shishda xatolik!");
        }
    };

    // 4. Tovarni kamaytirish / O'chirish
    const handleDeleteProduct = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/dashboard/delete-product', {
                product_id: Number(deleteData.product_id),
                remove_all: deleteData.remove_all,
                quantity_to_remove: Number(deleteData.quantity_to_remove)
            });

            setDeleteModal(false);
            setDeleteData({ product_id: '', remove_all: false, quantity_to_remove: 1 });
            fetchData();
            alert("Amal muvaffaqiyatli bajarildi!");
        } catch (err) {
            alert(err.response?.data?.message || "O'chirishda xatolik yuz berdi!");
        }
    };

    // Qidiruv bo'yicha filtrlash (ID, Nomi, Kategoriyasi va Rangi bo'yicha)
    const filteredProducts = products.filter((p) => {
        const query = searchQuery.toLowerCase();
        return (
            p.id.toString().includes(query) ||
            (p.title || p.name || '').toLowerCase().includes(query) ||
            (p.category || '').toLowerCase().includes(query) ||
            (p.color || '').toLowerCase().includes(query)
        );
    });

    if (loading) {
        return <div className="loading-spinner">Ma'lumotlar yuklanmoqda...</div>;
    }

    return (
        <div className="dashboard-container">
            {/* TEPANGI SARLAVHA VA AMALLAR TUGMALARI */}
            <header className="dashboard-header">
                <h2>🏬 {stats.storeName} Boshqaruv Paneli</h2>
                <div className="header-buttons">
                    <button onClick={() => setAddProductModal(true)} className="btn btn-add">➕ Tovar Qo'shish</button>
                    <button onClick={() => setSellModal(true)} className="btn btn-sell">🛒 Tovar Sotish</button>
                    <button onClick={() => setExpenseModal(true)} className="btn btn-expense">💸 Rasxod Yozish</button>
                    <button onClick={() => setDeleteModal(true)} className="btn btn-delete">🗑️ Tovarni O'chirish</button>
                </div>
            </header>

            {/* STATISTIKA KARTALARI */}
            <section className="stats-grid">
                <div className="stat-card">
                    <h4>Ombor Holati</h4>
                    <p><b>Jami tovar turi:</b> {stats.totalProducts} xil</p>
                    <p><b>Jami qoldiq:</b> {stats.totalStock} dona</p>
                </div>
                <div className="stat-card">
                    <h4>Bugungi Hisobot</h4>
                    <p><b>Sotildi:</b> {stats.dailySold} dona</p>
                    <p><b>Tushum:</b> {formatSum(stats.dailyRevenue)} so'm</p>
                    <p><b>Sof Foyda:</b> <span className={stats.dailyProfit >= 0 ? "profit-plus" : "profit-minus"}>{formatSum(stats.dailyProfit)} so'm</span></p>
                </div>
                <div className="stat-card">
                    <h4>Oylik Hisobot</h4>
                    <p><b>Sotildi:</b> {stats.monthlySold} dona</p>
                    <p><b>Tushum:</b> {formatSum(stats.monthlyRevenue)} so'm</p>
                    <p><b>Sof Foyda:</b> <span className={stats.monthlyProfit >= 0 ? "profit-plus" : "profit-minus"}>{formatSum(stats.monthlyProfit)} so'm</span></p>
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
                            filteredProducts.map((p) => (
                                <tr key={p.id}>
                                    <td><b>#{p.id}</b></td>
                                    <td><span className="category-badge">{p.category || 'Umumiy'}</span></td>
                                    <td><b>{p.title || p.name}</b></td>
                                    <td>{p.color ? <span className="color-badge">{p.color}</span> : '-'}</td>
                                    <td>{formatSum(p.cost_price)} so'm</td>
                                    <td><b className={p.quantity < 5 ? "warning-stock" : ""}>{p.quantity ?? 0} ta</b></td>
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

                            {/* FAQAT RANGI FIELD'I (O'lchami inputi butunlay olib tashlandi va full-width qilindi) */}
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
                                <button type="submit" className="btn btn-primary">Saqlash</button>
                                <button
                                    type="button"
                                    onClick={() => setAddProductModal(false)}
                                    className="btn btn-danger"
                                >
                                    Bekor qilish
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* 2. SOTUV MODALI */}
            {sellModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>🛒 Tovar Sotish</h3>
                        <form onSubmit={handleSellProduct} className="product-form">
                            <label>Tovar ID'si * :</label>
                            <input
                                type="number"
                                placeholder="Masalan: 101"
                                value={sellData.product_id}
                                onChange={(e) => setSellData({ ...sellData, product_id: e.target.value })}
                                required
                                className="form-input"
                            />

                            <label>Sotilayotgan Soni (Dona) * :</label>
                            <input
                                type="number"
                                min="1"
                                value={sellData.sell_quantity}
                                onChange={(e) => setSellData({ ...sellData, sell_quantity: e.target.value })}
                                required
                                className="form-input"
                            />

                            <label>Sotish Narxi (1 dona uchun) * :</label>
                            <input
                                type="number"
                                placeholder="180000"
                                value={sellData.selling_price}
                                onChange={(e) => setSellData({ ...sellData, selling_price: e.target.value })}
                                required
                                className="form-input"
                            />

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary">Sotuvni Bajarish</button>
                                <button type="button" onClick={() => setSellModal(false)} className="btn btn-danger">Bekor qilish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. RASXOD MODALI */}
            {expenseModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>💸 Rasxod Yozish</h3>
                        <form onSubmit={handleAddExpense} className="product-form">
                            <label>Rasxod Nomi/Sababi * :</label>
                            <input
                                type="text"
                                placeholder="Masalan: Tushlik yoki Arenda"
                                value={expenseData.title}
                                onChange={(e) => setExpenseData({ ...expenseData, title: e.target.value })}
                                required
                                className="form-input"
                            />

                            <label>Suma (So'm) * :</label>
                            <input
                                type="number"
                                placeholder="50000"
                                value={expenseData.amount}
                                onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                                required
                                className="form-input"
                            />

                            <label>Rasxod Turi :</label>
                            <select
                                value={expenseData.expense_type}
                                onChange={(e) => setExpenseData({ ...expenseData, expense_type: e.target.value })}
                                className="form-input"
                            >
                                <option value="daily">Kunlik</option>
                                <option value="monthly">Oylik</option>
                            </select>

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary">Saqlash</button>
                                <button type="button" onClick={() => setExpenseModal(false)} className="btn btn-danger">Bekor qilish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. O'CHIRISH MODALI */}
            {deleteModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>🗑️ Tovarni O'chirish / Kamaytirish</h3>
                        <form onSubmit={handleDeleteProduct} className="product-form">
                            <label>Tovar ID'si * :</label>
                            <input
                                type="number"
                                placeholder="Masalan: 101"
                                value={deleteData.product_id}
                                onChange={(e) => setDeleteData({ ...deleteData, product_id: e.target.value })}
                                required
                                className="form-input"
                            />

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={deleteData.remove_all}
                                    onChange={(e) => setDeleteData({ ...deleteData, remove_all: e.target.checked })}
                                />
                                Bazadan to'liq o'chirib tashlash
                            </label>

                            {!deleteData.remove_all && (
                                <>
                                    <label>Olib tashlanadigan soni :</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={deleteData.quantity_to_remove}
                                        onChange={(e) => setDeleteData({ ...deleteData, quantity_to_remove: e.target.value })}
                                        className="form-input"
                                    />
                                </>
                            )}

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-danger">Tasdiqlash</button>
                                <button type="button" onClick={() => setDeleteModal(false)} className="btn btn-primary">Bekor qilish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;