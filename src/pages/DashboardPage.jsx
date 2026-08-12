import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DashboardPage.css';

const DashboardPage = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [stats, setStats] = useState({ totalRevenue: 0, totalSold: 0, totalProfit: 0, totalExpense: 0 });

    const [addProductModal, setAddProductModal] = useState(false);
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Yangi Tovar Formasi (title o'rniga name ishlatamiz)
    const [newProduct, setNewProduct] = useState({
        category: '',
        name: '', // title -> name qilindi
        cost_price: '',
        color: '',
        sizesInput: [{ size: '', quantity: '' }]
    });

    // Sotish Formasi (size qo'shildi)
    const [sellForm, setSellForm] = useState({
        category: '',
        productId: '',
        size: '',
        quantity: 1,
        sellPrice: ''
    });

    // O'chirish / Kamaytirish Formasi (size qo'shildi)
    const [deleteForm, setDeleteForm] = useState({
        category: '',
        productId: '',
        size: '',
        quantityToRemove: 1,
        removeAll: false
    });

    // Rasxod Formasi
    const [expenseForm, setExpenseForm] = useState({
        title: '',
        amount: '',
        expense_type: 'daily'
    });

    useEffect(() => {
        fetchData();
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchData = async () => {
        try {
            const [prodRes, statsRes] = await Promise.all([
                axios.get('/api/products'),
                axios.get('/api/stats')
            ]);
            setProducts(prodRes.data.products || prodRes.data);
            setStats(statsRes.data);

            // Unikal kategoriyalarni yig'ish
            const cats = [...new Set((prodRes.data.products || prodRes.data).map(p => p.category || 'Umumiy'))];
            setCategories(cats);
        } catch (err) {
            console.error("Ma'lumotlarni olishda xatolik:", err);
        }
    };

    const formatSum = (num) => {
        return Number(num || 0).toLocaleString('uz-UZ');
    };

    // Dinamik o'lchamlar inputlarini boshqarish
    const handleSizeInputChange = (index, field, value) => {
        const updatedSizes = [...newProduct.sizesInput];
        updatedSizes[index][field] = value;
        setNewProduct({ ...newProduct, sizesInput: updatedSizes });
    };

    const addSizeInputRow = () => {
        setNewProduct({
            ...newProduct,
            sizesInput: [...newProduct.sizesInput, { size: '', quantity: '' }]
        });
    };

    const removeSizeInputRow = (index) => {
        const updatedSizes = newProduct.sizesInput.filter((_, i) => i !== index);
        setNewProduct({ ...newProduct, sizesInput: updatedSizes });
    };

    // Tovar qo'shish
    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const formattedSizes = newProduct.sizesInput.map(item => ({
                size: item.size,
                quantity: Number(item.quantity)
            }));

            await axios.post('/api/products', {
                category: newProduct.category || 'Umumiy',
                name: newProduct.name, // name yuborilyapti
                cost_price: Number(newProduct.cost_price),
                color: newProduct.color,
                sizes: formattedSizes
            });

            setAddProductModal(false);
            setNewProduct({ category: '', name: '', cost_price: '', color: '', sizesInput: [{ size: '', quantity: '' }] });
            fetchData();
            alert("Tovar muvaffaqiyatli qo'shildi! 🎉");
        } catch (err) {
            console.error("Tovar qo'shishda xatolik:", err);
            alert(err.response?.data?.message || "Tovar qo'shishda xatolik yuz berdi!");
        }
    };

    // Rasxod qo'shish
    const handleAddExpense = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/expenses', {
                title: expenseForm.title,
                amount: Number(expenseForm.amount),
                expense_type: expenseForm.expense_type
            });
            setExpenseModalOpen(false);
            setExpenseForm({ title: '', amount: '', expense_type: 'daily' });
            fetchData();
        } catch (err) {
            console.error("Rasxod qo'shishda xatolik:", err);
            alert("Rasxod qo'shishda xatolik yuz berdi!");
        }
    };

    // Tovar sotish
    const handleSellProduct = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/sales', {
                product_id: Number(sellForm.productId),
                size: sellForm.size,
                quantity: Number(sellForm.quantity),
                sell_price: Number(sellForm.sellPrice)
            });
            setSellModalOpen(false);
            setSellForm({ category: '', productId: '', size: '', quantity: 1, sellPrice: '' });
            fetchData();
            alert("Sotuv muvaffaqiyatli amalga oshirildi! 🎉");
        } catch (err) {
            console.error("Sotishda xatolik:", err);
            alert(err.response?.data?.message || "Sotish jarayonida xatolik yuz berdi!");
        }
    };

    // Tovarni o'chirish / kamaytirish
    const handleDeleteProduct = async (e) => {
        e.preventDefault();
        try {
            await axios.delete(`/api/products/${deleteForm.productId}`, {
                data: {
                    size: deleteForm.size,
                    quantity: Number(deleteForm.quantityToRemove),
                    remove_all: deleteForm.removeAll
                }
            });
            setDeleteModalOpen(false);
            setDeleteForm({ category: '', productId: '', size: '', quantityToRemove: 1, removeAll: false });
            fetchData();
            alert("Tovar muvaffaqiyatli yangilandi/o'chirildi!");
        } catch (err) {
            console.error("O'chirishda xatolik:", err);
            alert(err.response?.data?.message || "O'chirishda xatolik yuz berdi!");
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const filteredProducts = selectedCategory
        ? products.filter(p => (p.category || 'Umumiy') === selectedCategory)
        : products;

    const sellModalProducts = sellForm.category
        ? products.filter(p => (p.category || 'Umumiy') === sellForm.category)
        : [];

    const deleteModalProducts = deleteForm.category
        ? products.filter(p => (p.category || 'Umumiy') === deleteForm.category)
        : [];

    const selectedProductToSell = sellModalProducts.find(p => p.id === Number(sellForm.productId));
    const selectedProductToDelete = deleteModalProducts.find(p => p.id === Number(deleteForm.productId));

    // Jami ombardagi qoldiqni hisoblash (sizes massividan kelib chiqib)
    const getTotalQuantity = (p) => {
        if (Array.isArray(p.sizes)) {
            return p.sizes.reduce((sum, s) => sum + (s.quantity || 0), 0);
        }
        return p.quantity || 0;
    };

    const calculatedProfit = selectedProductToSell
        ? (Number(sellForm.sellPrice || 0) - Number(selectedProductToSell.cost_price)) * Number(sellForm.quantity || 0)
        : 0;

    return (
        <div className="dashboard-container">
            {/* Statistika kartochkalari */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h4>💰 JAMI TUSHUM</h4>
                    <h3>{formatSum(stats.totalRevenue)} so'm</h3>
                    <p>Jami sotilgan: <b>{stats.totalSold || 0} ta</b></p>
                </div>

                <div className="stat-card">
                    <h4>📈 JAMI SOF FOYDA</h4>
                    <h3 className={(stats.totalProfit || 0) >= 0 ? 'text-profit-positive' : 'text-profit-negative'}>
                        {formatSum(stats.totalProfit)} so'm
                    </h3>
                    <p>Jami Rasxod: <b className="text-expense">{formatSum(stats.totalExpense)} so'm</b></p>
                </div>
            </div>

            {/* ASOSIY BOSHQARUV TUGMALARI */}
            <div className="action-buttons-grid" style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button onClick={() => setAddProductModal(true)} className="btn btn-primary">
                    ➕ Tovar Qo'shish
                </button>
                <button onClick={() => setSellModalOpen(true)} className="btn btn-success">
                    🛒 Tovar Sotish
                </button>
                <button onClick={() => setDeleteModalOpen(true)} className="btn btn-danger">
                    🗑️ Tovar O'chirish / Kamaytirish
                </button>
                <button onClick={() => setExpenseModalOpen(true)} className="btn btn-expense" style={{ background: '#ff9800', color: '#fff' }}>
                    💸 Rasxod Qo'shish
                </button>
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
                                    <th>Rangi / O'lchamlari</th>
                                    <th>Ombordagi Jami Qoldiq</th>
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
                                        <td>
                                            {p.color || '-'} / {
                                                Array.isArray(p.sizes)
                                                    ? p.sizes.map(s => `${s.size} (${s.quantity}ta)`).join(', ')
                                                    : (p.size || '-')
                                            }
                                        </td>
                                        <td><b>{getTotalQuantity(p)} ta</b></td>
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

            {/* ➕ TOVAR QO'SHISH MODALI (Dinamik o'lchamlar bilan) */}
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
                                value={newProduct.name} // newProduct.title o'rniga name
                                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} // title -> name
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

                            <label>Rangi:</label>
                            <input
                                type="text"
                                placeholder="Qora"
                                value={newProduct.color}
                                onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                                className="form-input"
                            />

                            <label>O'lchamlar va Miqdorlar:</label>
                            {newProduct.sizesInput.map((item, index) => (
                                <div key={index} className="size-input-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="O'lcham (masalan: 41)"
                                        value={item.size}
                                        onChange={(e) => handleSizeInputChange(index, 'size', e.target.value)}
                                        required
                                        className="form-input"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Miqdori"
                                        value={item.quantity}
                                        onChange={(e) => handleSizeInputChange(index, 'quantity', e.target.value)}
                                        required
                                        className="form-input"
                                    />
                                    {newProduct.sizesInput.length > 1 && (
                                        <button type="button" onClick={() => removeSizeInputRow(index)} className="btn btn-danger">✖</button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={addSizeInputRow} className="btn btn-secondary" style={{ marginBottom: '15px' }}>
                                + O'lcham qo'shish
                            </button>

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
                                onChange={(e) => setDeleteForm({ ...deleteForm, category: e.target.value, productId: '', size: '' })}
                                required
                            >
                                <option value="">-- Kategoriyani tanlang --</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>📁 {cat}</option>
                                ))}
                            </select>

                            <label>2. Tovarni tanlang:</label>
                            <select
                                className="form-input"
                                value={deleteForm.productId}
                                onChange={(e) => setDeleteForm({ ...deleteForm, productId: e.target.value, size: '' })}
                                disabled={!deleteForm.category}
                                required
                            >
                                <option value="">{deleteForm.category ? '-- Tovarni tanlang --' : '-- Avval kategoriyani tanlang --'}</option>
                                {deleteModalProducts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} (Jami {getTotalQuantity(p)} ta bor)
                                    </option>
                                ))}
                            </select>

                            {selectedProductToDelete && Array.isArray(selectedProductToDelete.sizes) && (
                                <>
                                    <label>3. O'lchamni tanlang:</label>
                                    <select
                                        className="form-input"
                                        value={deleteForm.size}
                                        onChange={(e) => setDeleteForm({ ...deleteForm, size: e.target.value })}
                                        required
                                    >
                                        <option value="">-- O'lchamni tanlang --</option>
                                        {selectedProductToDelete.sizes.map((s, idx) => (
                                            <option key={idx} value={s.size}>
                                                O'lcham: {s.size} (Omborda: {s.quantity} ta)
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}

                            <div className="checkbox-container">
                                <input
                                    type="checkbox"
                                    id="removeAllCheck"
                                    checked={deleteForm.removeAll}
                                    onChange={(e) => setDeleteForm({ ...deleteForm, removeAll: e.target.checked })}
                                    className="checkbox-input"
                                />
                                <label htmlFor="removeAllCheck" className="checkbox-label">
                                    ⚠️ Tanlangan o'lchamni butunlay o'chirish
                                </label>
                            </div>

                            {!deleteForm.removeAll && (
                                <>
                                    <label>Nechta olib tashlansin?</label>
                                    <input
                                        type="number"
                                        min="1"
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
                                        setDeleteForm({ category: '', productId: '', size: '', quantityToRemove: 1, removeAll: false });
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
                                onChange={(e) => setSellForm({ ...sellForm, category: e.target.value, productId: '', size: '' })}
                                required
                            >
                                <option value="">-- Kategoriyani tanlang --</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>📁 {cat}</option>
                                ))}
                            </select>

                            <label>2. Tovarni tanlang:</label>
                            <select
                                className="form-input"
                                value={sellForm.productId}
                                onChange={(e) => setSellForm({ ...sellForm, productId: e.target.value, size: '' })}
                                disabled={!sellForm.category}
                                required
                            >
                                <option value="">{sellForm.category ? '-- Tovarni tanlang --' : '-- Avval kategoriyani tanlang --'}</option>
                                {sellModalProducts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} (Jami {getTotalQuantity(p)} ta bor)
                                    </option>
                                ))}
                            </select>

                            {selectedProductToSell && Array.isArray(selectedProductToSell.sizes) && (
                                <>
                                    <label>3. O'lchamni tanlang:</label>
                                    <select
                                        className="form-input"
                                        value={sellForm.size}
                                        onChange={(e) => setSellForm({ ...sellForm, size: e.target.value })}
                                        required
                                    >
                                        <option value="">-- O'lchamni tanlang --</option>
                                        {selectedProductToSell.sizes.map((s, idx) => (
                                            <option key={idx} value={s.size} disabled={s.quantity <= 0}>
                                                O'lcham: {s.size} (Qoldiq: {s.quantity} ta)
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {selectedProductToSell && (
                                <div className="info-box">
                                    <p>Tannarx (Kelgan narxi): <b>{formatSum(selectedProductToSell.cost_price)} so'm</b></p>
                                </div>
                            )}

                            <label>4. Sotuv soni:</label>
                            <input
                                type="number"
                                min="1"
                                value={sellForm.quantity}
                                onChange={(e) => setSellForm({ ...sellForm, quantity: e.target.value })}
                                required
                                className="form-input"
                            />

                            <label>5. Sotish narxi (Dona uchun so'm):</label>
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
                                    Kutilayotgan sof foyda: <b className={calculatedProfit >= 0 ? 'text-profit-positive' : 'text-profit-negative'}>
                                        {formatSum(calculatedProfit)} so'm
                                    </b>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-success">Sotishni tasdiqlash</button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSellModalOpen(false);
                                        setSellForm({ category: '', productId: '', size: '', quantity: 1, sellPrice: '' });
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