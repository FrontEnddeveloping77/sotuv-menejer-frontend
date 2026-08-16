import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/dashboard.css';
import '../styles/qr-modal.css';
import ProductQR from '../components/ProductQR';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://sotuv-menejer-backend.onrender.com';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Tovarni tahrirlash uchun ruxsat etilgan muddat (kun)
const PRODUCT_EDIT_WINDOW_DAYS = 7;
// Sotuvni vozvrat qilish uchun ruxsat etilgan muddat (kun)
const SALE_RETURN_WINDOW_DAYS = 7;
// Rasxodni tahrirlash/o'chirish uchun ruxsat etilgan muddat (kun)
const EXPENSE_EDIT_WINDOW_DAYS = 30;

const daysSince = (dateValue) => {
    if (!dateValue) return Infinity;
    const then = new Date(dateValue).getTime();
    if (Number.isNaN(then)) return Infinity;
    return (Date.now() - then) / (1000 * 60 * 60 * 24);
};

const DashboardPage = () => {
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        storeName: "Mening Do'konim",
        totalProducts: 0,
        totalStock: 0,
        totalStockValue: 0,
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
        totalDebt: 0,
    });

    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subscriptionExpired, setSubscriptionExpired] = useState(false);
    const [subscriptionMessage, setSubscriptionMessage] = useState('');

    const [addProductModal, setAddProductModal] = useState(false);
    const [sellModal, setSellModal] = useState(false);
    const [expenseModal, setExpenseModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [detailsGroup, setDetailsGroup] = useState(null);
    const [editModal, setEditModal] = useState(false);

    // --- VOZVRAT (SOTUVLAR RO'YXATI) ---
    const [returnModal, setReturnModal] = useState(false);
    const [salesList, setSalesList] = useState([]);
    const [salesLoading, setSalesLoading] = useState(false);

    // --- RASXODLAR RO'YXATI VA TAHRIRLASH ---
    const [expenseListModal, setExpenseListModal] = useState(false);
    const [expensesList, setExpensesList] = useState([]);
    const [expensesLoading, setExpensesLoading] = useState(false);
    const [editExpenseModal, setEditExpenseModal] = useState(false);
    const [editExpenseData, setEditExpenseData] = useState({
        id: '',
        title: '',
        amount: '',
        expense_type: 'daily'
    });

    const [editProduct, setEditProduct] = useState({
        local_id: '',
        category: '',
        name: '',
        cost_price: '',
        color: '',
        sizes: '',
        quantity: ''
    });

    const [newProduct, setNewProduct] = useState({
        category: '',
        name: '',
        cost_price: '',
        color: '',
        sizes: '',
        quantity: '',
        payment_type: 'cash',   // default Naqd
        supplier: '',           // nasiya bo‘lsa
        paid_amount: '',        // nasiya bo‘lsa
        supplier_phone: '',
    });

    // --- QARZLAR ---
    const [debtsModal, setDebtsModal] = useState(false);
    const [debts, setDebts] = useState([]);
    const [loadingDebts, setLoadingDebts] = useState(false);

    const emptySellRow = () => ({ size: '', sell_quantity: 1, selling_price: '' });
    const [sellSearch, setSellSearch] = useState('');
    const [sellData, setSellData] = useState({
        product_id: '',
        rows: [emptySellRow()]
    });

    const [expenseData, setExpenseData] = useState({
        title: '',
        amount: '',
        expense_type: 'daily'
    });

    const emptyDeleteRow = () => ({ size: '', remove_all: false, quantity_to_remove: 1 });
    const [deleteSearch, setDeleteSearch] = useState('');
    const [deleteData, setDeleteData] = useState({
        product_id: '',
        rows: [emptyDeleteRow()]
    });

    const handleLogout = () => {
        if (window.confirm("Tizimdan chiqishni tasdiqlaysizmi?")) {
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    const fetchData = async (showMainLoader = false) => {
        try {
            if (showMainLoader) {
                setIsInitialLoading(true);
            }

            const [statsRes, productsRes] = await Promise.all([
                api.get('/api/dashboard/stats'),
                api.get('/api/products')
            ]);

            // API muvaffaqiyatli javob bergan bo'lsa,
            // subscription lockni olib tashlaymiz
            setSubscriptionExpired(false);
            setSubscriptionMessage('');

            if (statsRes.data) {
                setStats((prev) => ({
                    ...prev,
                    ...statsRes.data
                }));
            }

            const fetchedProducts =
                productsRes.data?.products ||
                productsRes.data ||
                [];

            setProducts(
                Array.isArray(fetchedProducts)
                    ? fetchedProducts
                    : []
            );

        } catch (err) {
            console.error(
                "Ma'lumotlarni yuklashda xatolik:",
                err
            );

            const status =
                err.response?.status;

            if (status === 403) {
                setSubscriptionExpired(true);

                setSubscriptionMessage(
                    err.response?.data?.message ||
                    "To'lov muddati tugagan!"
                );

                return;
            }

            if (status === 401) {
                localStorage.removeItem('token');
                navigate('/login', {
                    replace: true
                });

                return;
            }

        } finally {
            if (showMainLoader) {
                setIsInitialLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData(true);
    }, []);

    const formatSum = (val) => {
        return Number(val || 0).toLocaleString('uz-UZ');
    };

    // --- RAZMERLARGA KO'RA GURUHLASH ---
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
                    createdAt: p.created_at || null,
                    variants: []
                });
            }

            const group = map.get(key);

            if (
                p.created_at &&
                (
                    !group.createdAt ||
                    new Date(p.created_at) < new Date(group.createdAt)
                )
            ) {
                group.createdAt = p.created_at;
            }

            group.variants.push({
                id: p.id,
                size: p.size,
                quantity: Number(p.quantity) || 0,
                qr_token: p.qr_token
            });
        });
        return Array.from(map.values());
    };

    const productGroups = groupProductsByLocalId(products);

    const isProductEditable = (group) => {
        if (!group.createdAt) return true;
        return daysSince(group.createdAt) <= PRODUCT_EDIT_WINDOW_DAYS;
    };

    // --- SOTUV VA O'CHIRISH UCHUN QIDIRUV: ENDI FAQAT NOM BO'YICHA ---
    const matchesQuery = (group, query) => {
        const q = query.toLowerCase().trim();
        if (!q) return true;
        const nameStr = (group.name || '').toLowerCase();
        return nameStr.includes(q);
    };

    const filteredSellGroups = productGroups.filter((g) => matchesQuery(g, sellSearch));
    const filteredDeleteGroups = productGroups.filter((g) => matchesQuery(g, deleteSearch));

    const sellGroup = productGroups.find((g) => String(g.local_id) === String(sellData.product_id)) || null;
    const deleteGroup = productGroups.find((g) => String(g.local_id) === String(deleteData.product_id)) || null;

    const resolveVariant = (group, row) => {
        if (!group) return null;
        if (group.variants.length === 1) return group.variants[0];
        return group.variants.find((v) => String(v.size || '') === String(row.size || '')) || null;
    };

    const usedSellSizes = (excludeIndex) =>
        sellData.rows.filter((_, i) => i !== excludeIndex).map((r) => r.size);
    const usedDeleteSizes = (excludeIndex) =>
        deleteData.rows.filter((_, i) => i !== excludeIndex).map((r) => r.size);

    const canAddMoreSellRows = sellGroup && sellData.rows.length < sellGroup.variants.length;
    const canAddMoreDeleteRows = deleteGroup && deleteData.rows.length < deleteGroup.variants.length;

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

    const openEditProduct = (group) => {
        if (!isProductEditable(group)) {
            alert(
                `Bu tovar qo'shilganiga ${PRODUCT_EDIT_WINDOW_DAYS} kundan ko'p vaqt o'tgan, tahrirlab bo'lmaydi!`
            );
            return;
        }

        setEditProduct({
            local_id: group.local_id,
            category: group.category || '',
            name: group.name || '',
            cost_price: group.cost_price || '',
            color: group.color || '',
            sizes: group.variants
                .map((v) => v.size)
                .filter(Boolean)
                .join(', '),
            quantity: group.variants.reduce(
                (sum, v) => sum + Number(v.quantity || 0),
                0
            )
        });

        setEditModal(true);
    };

    const handleEditProduct = async (e) => {
        e.preventDefault();

        if (!editProduct.local_id) {
            alert("Tovar ID topilmadi!");
            return;
        }

        if (!editProduct.name.trim()) {
            alert("Tovar nomini kiriting!");
            return;
        }

        if (!editProduct.cost_price || Number(editProduct.cost_price) < 0) {
            alert("Tannarxni to'g'ri kiriting!");
            return;
        }

        if (!editProduct.quantity || Number(editProduct.quantity) < 0) {
            alert("Tovar sonini to'g'ri kiriting!");
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await api.put(
                `/api/products/${editProduct.local_id}`,
                {
                    category: editProduct.category || 'Umumiy',
                    name: editProduct.name.trim(),
                    color: editProduct.color.trim(),
                    cost_price: Number(editProduct.cost_price),
                    quantity: Number(editProduct.quantity),
                    sizes: editProduct.sizes
                }
            );

            setEditModal(false);

            setEditProduct({
                local_id: '',
                category: '',
                name: '',
                cost_price: '',
                color: '',
                sizes: '',
                quantity: ''
            });

            await fetchData(false);

            alert(
                res.data?.message ||
                "Tovar muvaffaqiyatli tahrirlandi!"
            );
        } catch (err) {
            console.error("Tovarni tahrirlash xatosi:", err);

            alert(
                err.response?.data?.message ||
                "Tovarni tahrirlashda xatolik yuz berdi!"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (!newProduct.category?.trim()) {
                alert("Kategoriya kiritilishi shart!");
                return;
            }
            if (!newProduct.name?.trim()) {
                alert("Tovar nomi kiritilishi shart!");
                return;
            }
            if (!newProduct.cost_price && newProduct.cost_price !== 0) {
                alert("Kelgan narx kiritilishi shart!");
                return;
            }
            if (!newProduct.color?.trim()) {
                alert("Rang kiritilishi shart!");
                return;
            }
            if (!newProduct.quantity || Number(newProduct.quantity) <= 0) {
                alert("Umumiy soni 0 dan katta bo‘lishi kerak!");
                return;
            }

            if (newProduct.payment_type === 'credit') {
                if (!newProduct.supplier?.trim()) {
                    alert("Nasiya bo‘lsa, kimdan olinganini kiritish shart!");
                    return;
                }
                if (!newProduct.supplier_phone?.trim()) {
                    alert("Nasiya bo‘lsa, telefon raqamini kiritish shart!");
                    return;
                }
                if (newProduct.paid_amount === '' || newProduct.paid_amount === null || Number(newProduct.paid_amount) < 0) {
                    alert("To‘langan summani to‘g‘ri kiriting!");
                    return;
                }
            }

            const body = {
                category: newProduct.category.trim(),
                name: newProduct.name.trim(),
                color: newProduct.color.trim(),
                cost_price: Number(newProduct.cost_price) || 0,
                quantity: Number(newProduct.quantity) || 1,
                sizes: newProduct.sizes?.trim() || '',
                payment_type: newProduct.payment_type || 'cash',
                supplier: newProduct.payment_type === 'credit' ? newProduct.supplier.trim() : null,
                supplier_phone: newProduct.payment_type === 'credit' ? newProduct.supplier_phone.trim() : null,
                paid_amount: newProduct.payment_type === 'credit' ? Number(newProduct.paid_amount) || 0 : 0,
            };

            const res = await api.post('/api/products', body);

            setAddProductModal(false);
            setNewProduct({
                category: '',
                name: '',
                color: '',
                cost_price: '',
                sizes: '',
                quantity: '',
                payment_type: 'cash',
                supplier: '',
                paid_amount: '',
                supplier_phone: '',
            });

            await fetchData(false);

            const displayId = res.data?.local_id || res.data?.product?.local_id || '';
            alert(res.data?.message || `Tovar saqlandi! Biriktirilgan ID: #${displayId}`);
        } catch (err) {
            alert(err.response?.data?.message || "Tovar qo‘shishda xatolik yuz berdi!");
        } finally {
            setIsSubmitting(false);
        }
    };

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

    const openDebtsModal = async () => {
        setDebtsModal(true);
        setLoadingDebts(true);
        try {
            const res = await api.get('/api/debts');
            setDebts(res.data?.debts || []);
        } catch (err) {
            alert(err.response?.data?.message || "Qarzlarni yuklashda xatolik!");
            setDebts([]);
        } finally {
            setLoadingDebts(false);
        }
    };

    // --- VOZVRAT (SOTUVLAR) ---

    const openReturnModal = async () => {
        setReturnModal(true);
        setSalesLoading(true);
        try {
            const res = await api.get('/api/sales');
            setSalesList(res.data?.sales || []);
        } catch (err) {
            alert(err.response?.data?.message || "Sotuvlarni yuklashda xatolik!");
        } finally {
            setSalesLoading(false);
        }
    };

    const isSaleReturnable = (sale) => {
        if (sale.returned) return false;
        return daysSince(sale.sold_at) <= SALE_RETURN_WINDOW_DAYS;
    };

    const handleReturnSale = async (saleId) => {
        if (!window.confirm("Ushbu sotuvni vozvrat qilishni tasdiqlaysizmi? Tovar omborga qaytariladi.")) {
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/api/sales/${saleId}/return`);
            alert("Tovar muvaffaqiyatli vozvrat qilindi!");

            const res = await api.get('/api/sales');
            setSalesList(res.data?.sales || []);
            await fetchData(false);
        } catch (err) {
            alert(err.response?.data?.message || "Vozvrat qilishda xatolik!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RASXODLAR RO'YXATI / TAHRIRLASH / O'CHIRISH ---

    const openExpenseListModal = async () => {
        setExpenseListModal(true);
        setExpensesLoading(true);
        try {
            const res = await api.get('/api/expenses');
            setExpensesList(res.data?.expenses || []);
        } catch (err) {
            alert(err.response?.data?.message || "Rasxodlarni yuklashda xatolik!");
        } finally {
            setExpensesLoading(false);
        }
    };

    const isExpenseEditable = (expense) => {
        return daysSince(expense.created_at) <= EXPENSE_EDIT_WINDOW_DAYS;
    };

    const openEditExpense = (expense) => {
        if (!isExpenseEditable(expense)) {
            alert(`Bu rasxod qo'shilganiga 1 oydan ko'p vaqt o'tgan, tahrirlab bo'lmaydi!`);
            return;
        }

        setEditExpenseData({
            id: expense.id,
            title: expense.title,
            amount: expense.amount,
            expense_type: expense.expense_type || 'daily'
        });

        setEditExpenseModal(true);
    };

    const handleEditExpense = async (e) => {
        e.preventDefault();

        if (!editExpenseData.title.trim()) {
            alert("Rasxod nomini kiriting!");
            return;
        }

        if (!editExpenseData.amount || Number(editExpenseData.amount) <= 0) {
            alert("Rasxod summasini to'g'ri kiriting!");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.put(`/api/expenses/${editExpenseData.id}`, {
                title: editExpenseData.title.trim(),
                amount: Number(editExpenseData.amount),
                expense_type: editExpenseData.expense_type
            });

            setEditExpenseModal(false);
            alert("Rasxod muvaffaqiyatli tahrirlandi!");

            const res = await api.get('/api/expenses');
            setExpensesList(res.data?.expenses || []);
            await fetchData(false);
        } catch (err) {
            alert(err.response?.data?.message || "Rasxodni tahrirlashda xatolik!");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm("Ushbu rasxodni o'chirishni tasdiqlaysizmi?")) {
            return;
        }

        setIsSubmitting(true);
        try {
            await api.delete(`/api/expenses/${expenseId}`);
            alert("Rasxod muvaffaqiyatli o'chirildi!");

            const res = await api.get('/api/expenses');
            setExpensesList(res.data?.expenses || []);
            await fetchData(false);
        } catch (err) {
            alert(err.response?.data?.message || "Rasxodni o'chirishda xatolik!");
        } finally {
            setIsSubmitting(false);
        }
    };

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

    if (subscriptionExpired) {
        return (
            <div className="subscription-expired-screen">
                <div className="subscription-expired-card">
                    <div className="subscription-expired-icon">🔒</div>
                    <h2>To'lov muddati tugadi</h2>
                    <p>
                        {subscriptionMessage}
                        {' '}To'lov qilganingizdan so'ng saytdan foydalanish
                        huquqiga ega bo'lasiz.
                    </p>
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleLogout}
                    >
                        🚪 Chiqish
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h2>🏬 {stats.storeName || "Mening Do'konim"} Boshqaruv Paneli</h2>
                <div className="header-buttons">
                    <button onClick={() => setAddProductModal(true)} className="btn btn-add">➕ Tovar Qo'shish</button>
                    <button onClick={() => setSellModal(true)} className="btn btn-sell">🛒 Tovar Sotish</button>
                    <button onClick={() => setExpenseModal(true)} className="btn btn-expense">💸 Rasxod Yozish</button>
                    <button onClick={() => setDeleteModal(true)} className="btn btn-delete">🗑️ Tovarni O'chirish</button>
                    <button onClick={openDebtsModal} className="btn btn-debts">💳 Qarzlar</button>
                    <button onClick={openReturnModal} className="btn btn-return">↩️ Vozvrat</button>
                    <button onClick={openExpenseListModal} className="btn btn-edit-expense">📋 Rasxodlarni taxrirlash</button>
                    <button onClick={handleLogout} className="btn btn-logout">🚪 Chiqish</button>
                </div>
            </header>

            <section className="stats-grid">
                <div className="stat-card">
                    <h4>Ombor Holati</h4>
                    <p><b>Jami tovar turi:</b> {stats.totalProducts || 0} xil</p>
                    <p><b>Jami qoldiq:</b> {stats.totalStock || 0} dona</p>
                    <p><b>Ombordagi tovarlar summasi:</b> {formatSum(stats.totalStockValue)} so'm</p>
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
                <div className="stat-card">
                    <h4>Umumiy Hisobot (Butun Davr)</h4>
                    <p><b>Jami sotilgan:</b> {stats.totalSold || 0} dona</p>
                    <p><b>Jami tushum:</b> {formatSum(stats.totalRevenue)} so'm</p>
                    <p><b>Jami sof foyda:</b> <span className={(stats.totalProfit || 0) >= 0 ? "profit-plus" : "profit-minus"}>{formatSum(stats.totalProfit)} so'm</span></p>
                </div>

                {/* YANGI KARTA – JAMI QARZ */}
                <div className="stat-card">
                    <h4>💳 Jami Qarzimiz</h4>
                    <p><b>Jami qarz:</b> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatSum(stats.totalDebt || 0)} so'm</span></p>
                </div>
            </section>

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

                <div className="table-wrapper">
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Kategoriya</th>
                                <th>Tovar Nomi</th>
                                <th className="col-hide-mobile">Rangi</th>
                                <th className="col-hide-narrow">Kelgan Narxi (Tannarx)</th>
                                <th className="col-hide-mobile">O'lchamlar / Qoldiq</th>
                                <th className="col-hide-mobile">QR</th>
                                <th className="col-hide-tiny">Jami Qoldiq</th>
                                <th className="col-details-only">Amal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGroups.length > 0 ? (
                                filteredGroups.map((g) => {
                                    const totalQty = g.variants.reduce((sum, v) => sum + v.quantity, 0);
                                    const editable = isProductEditable(g);
                                    return (
                                        <tr key={g.local_id}>
                                            <td><b>#{g.local_id}</b></td>
                                            <td><span className="category-badge">{g.category || 'Umumiy'}</span></td>
                                            <td><b>{g.name}</b></td>
                                            <td className="col-hide-mobile">{g.color ? <span className="color-badge">{g.color}</span> : '-'}</td>
                                            <td className="col-hide-narrow">{formatSum(g.cost_price)} so'm</td>
                                            <td className="col-hide-mobile">
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
                                            <td className="col-hide-mobile">
                                                <div className="qr-list">
                                                    {g.variants.map((v) => <ProductQR key={v.id} product={{ ...v, name: g.name }} />)}
                                                </div>
                                            </td>
                                            <td className="col-hide-tiny"><b className={totalQty < 5 ? "warning-stock" : ""}>{totalQty} ta</b></td>
                                            <td className="col-details-only">
                                                <div className="product-action-buttons">

                                                    <button
                                                        type="button"
                                                        className="btn-details"
                                                        onClick={() => setDetailsGroup(g)}
                                                    >
                                                        🔍 Batafsil
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn-edit-product"
                                                        onClick={() => openEditProduct(g)}
                                                        disabled={!editable}
                                                        title={!editable ? `${PRODUCT_EDIT_WINDOW_DAYS} kundan ko'p vaqt o'tgan, tahrirlab bo'lmaydi` : ''}
                                                    >
                                                        ✏️ Tahrirlash
                                                    </button>

                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="9" className="no-data">Tovar topilmadi!</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {addProductModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>➕ Yangi Tovar Qo‘shish</h3>
                        <form onSubmit={handleAddProduct} className="product-form">

                            {/* Kategoriya - majburiy */}
                            <div className="form-group">
                                <label>Kategoriya * :</label>
                                <input
                                    type="text"
                                    placeholder="Divan, Krossovka, Tufli..."
                                    value={newProduct.category}
                                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>

                            {/* Tovar nomi - majburiy */}
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

                            {/* Tan narxi + To‘lov turi */}
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
                                <label>To‘lov turi * :</label>
                                <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="payment_type"
                                            value="cash"
                                            checked={newProduct.payment_type === 'cash'}
                                            onChange={(e) => setNewProduct({
                                                ...newProduct,
                                                payment_type: e.target.value,
                                                supplier: '',
                                                paid_amount: ''
                                            })}
                                        />
                                        Naqd
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="payment_type"
                                            value="credit"
                                            checked={newProduct.payment_type === 'credit'}
                                            onChange={(e) => setNewProduct({ ...newProduct, payment_type: e.target.value })}
                                        />
                                        Nasiya
                                    </label>
                                </div>
                            </div>

                            {/* Nasiya tanlanganda chiqadigan maydonlar */}
                            {newProduct.payment_type === 'credit' && (
                                <>
                                    {/* 1. Kimdan olindi */}
                                    <div className="form-group">
                                        <label>Kimdan olindi * :</label>
                                        <input
                                            type="text"
                                            placeholder="Masalan: Ali aka, Optom bozor..."
                                            value={newProduct.supplier || ''}
                                            onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })}
                                            required
                                            className="form-input"
                                        />
                                    </div>

                                    {/* 2. TELEFON RAQAMI (yangi qo‘shiladigan qism) */}
                                    <div className="form-group">
                                        <label>Telefon raqami * :</label>
                                        <input
                                            type="text"
                                            placeholder="+998 90 123 45 67"
                                            value={newProduct.supplier_phone || ''}
                                            onChange={(e) => setNewProduct({ ...newProduct, supplier_phone: e.target.value })}
                                            required
                                            className="form-input"
                                        />
                                    </div>

                                    {/* 3. To‘langan summa */}
                                    <div className="form-group">
                                        <label>To‘langan summa * :</label>
                                        <input
                                            type="number"
                                            placeholder="Masalan: 50000"
                                            value={newProduct.paid_amount || ''}
                                            onChange={(e) => setNewProduct({ ...newProduct, paid_amount: e.target.value })}
                                            required
                                            className="form-input"
                                        />
                                        <small className="form-hint">
                                            Qancha pul oldindan berilganini kiriting
                                        </small>
                                    </div>
                                </>
                            )}

                            {/* Rang - ixtiyoriy */}
                            <div className="form-group">
                                <label>Rangi (xohlasangiz qo‘shing):</label>
                                <input
                                    type="text"
                                    placeholder="Qora"
                                    value={newProduct.color}
                                    onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                                    className="form-input"
                                />
                            </div>

                            {/* Razmerlar - majburiy */}
                            <div className="form-group">
                                <label>Razmerlar * :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: 39, 40, 41, 42, 43"
                                    value={newProduct.sizes}
                                    onChange={(e) => setNewProduct({ ...newProduct, sizes: e.target.value })}
                                    required
                                    className="form-input"
                                />
                                <small className="form-hint">
                                    Bir nechta razmer kiritsangiz, pastdagi "Umumiy Soni" ular orasida
                                    avtomatik ravishda (imkon qadar teng) taqsimlanadi.
                                </small>
                            </div>

                            {/* Umumiy soni - majburiy */}
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

                            {/* Taqsimot ko‘rsatish */}
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

            {/* 🛒 TOVAR SOTISH MODALI — endi FAQAT NOM bo'yicha qidiradi */}
            {sellModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header">
                            <h3>🛒 Tovar Sotish</h3>
                        </div>

                        <form onSubmit={handleSellProduct} className="product-form">
                            <div className="form-group">
                                <label>Tovar nomi bo'yicha qidirish :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Nike, Divan..."
                                    value={sellSearch}
                                    onChange={(e) => setSellSearch(e.target.value)}
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
                                            {g.name} {g.color ? `(${g.color})` : ''} — jami: {g.variants.reduce((s, v) => s + v.quantity, 0)} ta
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

            {/* 🗑️ TOVARNI O'CHIRISH MODALI — endi FAQAT NOM bo'yicha qidiradi, o'z holatini ishlatadi */}
            {deleteModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header">
                            <h3>🗑️ Tovarni O'chirish / Kamaytirish</h3>
                        </div>

                        <form onSubmit={handleDeleteProduct} className="product-form">
                            <div className="form-group">
                                <label>Tovar nomi bo'yicha qidirish :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Nike, Divan..."
                                    value={deleteSearch}
                                    onChange={(e) => setDeleteSearch(e.target.value)}
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
                                            {g.name} {g.color ? `(${g.color})` : ''} — jami: {g.variants.reduce((s, v) => s + v.quantity, 0)} ta
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

            {editModal && (
                <div
                    className="modal-overlay"
                    onClick={() => {
                        if (!isSubmitting) {
                            setEditModal(false);
                        }
                    }}
                >
                    <div
                        className="modal-box"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>
                                ✏️ Tovarni Tahrirlash #{editProduct.local_id}
                            </h3>
                        </div>

                        <form
                            onSubmit={handleEditProduct}
                            className="product-form"
                        >

                            <div className="form-group">
                                <label>Kategoriya:</label>

                                <input
                                    type="text"
                                    value={editProduct.category}
                                    placeholder="Divan, Krossovka, Tufli..."
                                    onChange={(e) =>
                                        setEditProduct({
                                            ...editProduct,
                                            category: e.target.value
                                        })
                                    }
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Tovar Nomi *:</label>

                                <input
                                    type="text"
                                    value={editProduct.name}
                                    required
                                    onChange={(e) =>
                                        setEditProduct({
                                            ...editProduct,
                                            name: e.target.value
                                        })
                                    }
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Kelgan Narxi (Tannarx) *:</label>

                                <input
                                    type="number"
                                    min="0"
                                    value={editProduct.cost_price}
                                    required
                                    onChange={(e) =>
                                        setEditProduct({
                                            ...editProduct,
                                            cost_price: e.target.value
                                        })
                                    }
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Rangi:</label>

                                <input
                                    type="text"
                                    value={editProduct.color}
                                    placeholder="Qora"
                                    onChange={(e) =>
                                        setEditProduct({
                                            ...editProduct,
                                            color: e.target.value
                                        })
                                    }
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Razmerlar:</label>

                                <input
                                    type="text"
                                    value={editProduct.sizes}
                                    placeholder="39, 40, 41, 42"
                                    onChange={(e) =>
                                        setEditProduct({
                                            ...editProduct,
                                            sizes: e.target.value
                                        })
                                    }
                                    className="form-input"
                                />

                                <small className="form-hint">
                                    Razmerlarni vergul bilan ajrating.
                                </small>
                            </div>

                            <div className="form-group">
                                <label>Umumiy Soni *:</label>

                                <input
                                    type="number"
                                    min="0"
                                    value={editProduct.quantity}
                                    required
                                    onChange={(e) =>
                                        setEditProduct({
                                            ...editProduct,
                                            quantity: e.target.value
                                        })
                                    }
                                    className="form-input"
                                />
                            </div>

                            <div className="info-banner info-success">
                                ⚠️ Tovar ma'lumotlari yangilanadi.
                                Mavjud sotuvlar o‘zgartirilmaydi. Tovar faqat
                                qo'shilganiga {PRODUCT_EDIT_WINDOW_DAYS} kun bo'lmagunicha tahrirlanadi.
                            </div>

                            <div className="modal-actions">

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? "Saqlanmoqda..."
                                        : "💾 Saqlash"}
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    disabled={isSubmitting}
                                    onClick={() => setEditModal(false)}
                                >
                                    Bekor qilish
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            )}

            {detailsGroup && (
                <div className="modal-overlay" onClick={() => setDetailsGroup(null)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🔍 Tovar Tafsilotlari — #{detailsGroup.local_id}</h3>
                        </div>

                        <div className="details-info">
                            <p><b>Nomi:</b> {detailsGroup.name}</p>
                            <p><b>Kategoriya:</b> {detailsGroup.category || 'Umumiy'}</p>
                            <p><b>Rangi:</b> {detailsGroup.color || '-'}</p>
                            <p><b>Kelgan narxi:</b> {formatSum(detailsGroup.cost_price)} so'm</p>
                        </div>

                        <div className="details-section">
                            <h4>O'lchamlar / Qoldiq</h4>
                            <div className="size-badge-list">
                                {detailsGroup.variants.map((v) => (
                                    <span
                                        key={v.id}
                                        className={`size-badge ${v.quantity < 3 ? "size-badge-low" : ""}`}
                                    >
                                        {v.size ? v.size : "Standart"}: {v.quantity} ta
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="details-section">
                            <h4>QR Kodlar</h4>
                            <div className="qr-list">
                                {detailsGroup.variants.map((v) => (
                                    <ProductQR key={v.id} product={{ ...v, name: detailsGroup.name }} />
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                onClick={() => setDetailsGroup(null)}
                                className="btn btn-secondary"
                            >
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ↩️ VOZVRAT MODALI */}
            {returnModal && (
                <div className="modal-overlay" onClick={() => setReturnModal(false)}>
                    <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>↩️ Tovarni Vozvrat Qilish</h3>
                        </div>

                        <div className="info-banner info-success">
                            Faqat oxirgi {SALE_RETURN_WINDOW_DAYS} kun ichida sotilgan va hali vozvrat
                            qilinmagan tovarlarni qaytarish mumkin.
                        </div>

                        {salesLoading ? (
                            <p className="empty-text">Yuklanmoqda...</p>
                        ) : (
                            <div className="expense-list">
                                {salesList.filter((s) => !s.returned).length === 0 ? (
                                    <p className="empty-text">Sotuvlar topilmadi!</p>
                                ) : (
                                    salesList
                                        .filter((s) => !s.returned)
                                        .map((s) => {
                                            const returnable = isSaleReturnable(s);
                                            return (
                                                <div className="expense-list-item" key={s.id}>
                                                    <div>
                                                        <div>
                                                            <b>{s.title}</b> {s.size ? `(${s.size})` : ''}
                                                        </div>
                                                        <div className="expense-meta">
                                                            {s.quantity} dona × {formatSum(s.selling_price)} so'm = {formatSum(Number(s.selling_price) * Number(s.quantity))} so'm
                                                            {' '}— {new Date(s.sold_at).toLocaleString('uz-UZ')}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn-return btn-small"
                                                        disabled={!returnable || isSubmitting}
                                                        title={!returnable ? `${SALE_RETURN_WINDOW_DAYS} kundan ko'p vaqt o'tgan, vozvrat qilib bo'lmaydi` : ''}
                                                        onClick={() => handleReturnSale(s.id)}
                                                    >
                                                        ↩️ Vozvrat
                                                    </button>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button type="button" onClick={() => setReturnModal(false)} className="btn btn-secondary">
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 📋 RASXODLAR RO'YXATI MODALI */}
            {expenseListModal && (
                <div className="modal-overlay" onClick={() => setExpenseListModal(false)}>
                    <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📋 Rasxodlar Ro'yxati</h3>
                        </div>

                        <div className="info-banner info-success">
                            Faqat oxirgi {EXPENSE_EDIT_WINDOW_DAYS} kun (1 oy) ichida qo'shilgan rasxodlarni
                            tahrirlash yoki o'chirish mumkin.
                        </div>

                        {expensesLoading ? (
                            <p className="empty-text">Yuklanmoqda...</p>
                        ) : (
                            <div className="expense-list">
                                {expensesList.length === 0 ? (
                                    <p className="empty-text">Rasxodlar topilmadi!</p>
                                ) : (
                                    expensesList.map((exp) => {
                                        const editable = isExpenseEditable(exp);
                                        return (
                                            <div className="expense-list-item" key={exp.id}>
                                                <div>
                                                    <div><b>{exp.title}</b> — {formatSum(exp.amount)} so'm</div>
                                                    <div className="expense-meta">
                                                        {exp.expense_type === 'monthly' ? 'Oylik' : exp.expense_type === 'yearly' ? 'Yillik' : 'Kunlik'}
                                                        {' '}— {new Date(exp.created_at).toLocaleString('uz-UZ')}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-edit-expense btn-small"
                                                        disabled={!editable || isSubmitting}
                                                        title={!editable ? "1 oydan ko'p vaqt o'tgan, tahrirlab bo'lmaydi" : ''}
                                                        onClick={() => openEditExpense(exp)}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-delete-expense btn-small"
                                                        disabled={!editable || isSubmitting}
                                                        title={!editable ? "1 oydan ko'p vaqt o'tgan, o'chirib bo'lmaydi" : ''}
                                                        onClick={() => handleDeleteExpense(exp.id)}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button type="button" onClick={() => setExpenseListModal(false)} className="btn btn-secondary">
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✏️ RASXODNI TAHRIRLASH MODALI */}
            {editExpenseModal && (
                <div
                    className="modal-overlay"
                    onClick={() => {
                        if (!isSubmitting) setEditExpenseModal(false);
                    }}
                >
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>✏️ Rasxodni Tahrirlash</h3>
                        </div>
                        <form onSubmit={handleEditExpense} className="product-form">
                            <div className="form-group">
                                <label>Rasxod Nomi/Sababi * :</label>
                                <input
                                    type="text"
                                    value={editExpenseData.title}
                                    onChange={(e) => setEditExpenseData({ ...editExpenseData, title: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Summa (So'm) * :</label>
                                <input
                                    type="number"
                                    value={editExpenseData.amount}
                                    onChange={(e) => setEditExpenseData({ ...editExpenseData, amount: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Rasxod Turi :</label>
                                <select
                                    value={editExpenseData.expense_type}
                                    onChange={(e) => setEditExpenseData({ ...editExpenseData, expense_type: e.target.value })}
                                    className="form-input"
                                >
                                    <option value="daily">Kunlik</option>
                                    <option value="monthly">Oylik</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? "Saqlanmoqda..." : "💾 Saqlash"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    disabled={isSubmitting}
                                    onClick={() => setEditExpenseModal(false)}
                                >
                                    Bekor qilish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 💳 QARZLAR MODALI */}
            {debtsModal && (
                <div className="modal-overlay" onClick={() => setDebtsModal(false)}>
                    <div className="modal-box" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
                        <h3>💳 Qarzlar ro‘yxati</h3>

                        {loadingDebts ? (
                            <p style={{ textAlign: 'center', padding: '20px' }}>Yuklanmoqda...</p>
                        ) : debts.length === 0 ? (
                            <div className="info-banner">
                                Hozircha hech qanday qarz yo‘q ✅
                            </div>
                        ) : (
                            <div className="debts-list">
                                {debts.map((debt, index) => (
                                    <div key={index} className="debt-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                            <strong style={{ fontSize: '16px' }}>👤 {debt.supplier}</strong>
                                            <span className="debt-amount">
                                                {Number(debt.total_debt).toLocaleString('uz-UZ')} so‘m
                                            </span>
                                        </div>

                                        {debt.supplier_phone && (
                                            <div className="debt-phone">
                                                📞 {debt.supplier_phone}
                                            </div>
                                        )}

                                        <div className="debt-meta">
                                            <span>📦 {debt.products_count} ta tovar</span>
                                            <span>💰 Tannarx: {Number(debt.total_cost).toLocaleString('uz-UZ')} so‘m</span>
                                            <span>✅ To‘langan: {Number(debt.total_paid).toLocaleString('uz-UZ')} so‘m</span>
                                        </div>

                                        {/* ===== QARZNI TO‘LASH TUGMASI ===== */}
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            style={{ marginTop: '12px', width: '100%' }}
                                            onClick={() => {
                                                alert(`"${debt.supplier}" ga bo'lgan ${Number(debt.total_debt).toLocaleString('uz-UZ')} so'm qarzni to'lash funksiyasi tez orada qo'shiladi`);
                                            }}
                                        >
                                            💰 Qarzni to‘lash
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button
                                type="button"
                                onClick={() => setDebtsModal(false)}
                                className="btn btn-danger"
                            >
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;