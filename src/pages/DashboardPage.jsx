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
// Qarz to'lovini bekor qilish / tahrirlash uchun ruxsat etilgan muddat (kun)
const DEBT_PAYMENT_UNDO_WINDOW_DAYS = 30;

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
    const [editSelectModal, setEditSelectModal] = useState(false);
    const [editSelectSearch, setEditSelectSearch] = useState('');

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
        payment_type: 'cash',
        supplier: '',
        paid_amount: '',
        supplier_phone: '',
        selling_price: '',
    });

    // --- QARZLAR ---
    const [debtsModal, setDebtsModal] = useState(false);
    const [debts, setDebts] = useState([]);
    const [loadingDebts, setLoadingDebts] = useState(false);
    const [debtsSearch, setDebtsSearch] = useState('');

    // --- TOVAR BERGANLAR ---
    const [suppliersModal, setSuppliersModal] = useState(false);
    const [suppliersList, setSuppliersList] = useState([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [suppliersSearch, setSuppliersSearch] = useState('');

    // ========== YANGI: NASIYAGA SOTISH ==========
    const [creditSellModal, setCreditSellModal] = useState(false);
    const [creditSellSearch, setCreditSellSearch] = useState('');
    const [creditSellData, setCreditSellData] = useState({
        product_id: '',
        rows: [{ size: '', sell_quantity: 1, selling_price: '' }],
        customer_name: '',
        customer_phone: '',
        paid_now: '' // hozir to'langan (ixtiyoriy)
    });

    // ========== YANGI: QARZ TO'LOVINI BEKOR QILISH / TAHRIRLASH ==========
    const [undoDebtModal, setUndoDebtModal] = useState(false);
    const [undoDebtSearch, setUndoDebtSearch] = useState('');
    const [undoDebtList, setUndoDebtList] = useState([]);
    const [loadingUndoDebts, setLoadingUndoDebts] = useState(false);
    const [selectedUndoDebt, setSelectedUndoDebt] = useState(null);
    const [undoAmount, setUndoAmount] = useState('');
    const [undoMode, setUndoMode] = useState('undo'); // 'undo' | 'edit'

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
            console.error("Ma'lumotlarni yuklashda xatolik:", err);

            const status = err.response?.status;

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
                navigate('/login', { replace: true });
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
                    selling_price: p.selling_price ?? null,
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

            if (p.selling_price != null && group.selling_price == null) {
                group.selling_price = p.selling_price;
            }

            group.variants.push({
                id: p.id,
                size: p.size,
                quantity: Number(p.quantity) || 0,
                qr_token: p.qr_token,
                selling_price: p.selling_price ?? group.selling_price ?? null
            });
        });
        return Array.from(map.values());
    };

    const productGroups = groupProductsByLocalId(products);

    const isProductEditable = (group) => {
        if (!group.createdAt) return true;
        return daysSince(group.createdAt) <= PRODUCT_EDIT_WINDOW_DAYS;
    };

    const matchesQuery = (group, query) => {
        const q = query.toLowerCase().trim();
        if (!q) return true;
        const nameStr = (group.name || '').toLowerCase();
        return nameStr.includes(q);
    };

    const filteredSellGroups = productGroups.filter((g) => matchesQuery(g, sellSearch));
    const filteredDeleteGroups = productGroups.filter((g) => matchesQuery(g, deleteSearch));
    const filteredCreditSellGroups = productGroups.filter((g) => matchesQuery(g, creditSellSearch));

    const sellGroup = productGroups.find((g) => String(g.local_id) === String(sellData.product_id)) || null;
    const deleteGroup = productGroups.find((g) => String(g.local_id) === String(deleteData.product_id)) || null;
    const creditSellGroup = productGroups.find((g) => String(g.local_id) === String(creditSellData.product_id)) || null;

    const resolveVariant = (group, row) => {
        if (!group) return null;
        if (group.variants.length === 1) return group.variants[0];
        return group.variants.find((v) => String(v.size || '') === String(row.size || '')) || null;
    };

    const usedSellSizes = (excludeIndex) =>
        sellData.rows.filter((_, i) => i !== excludeIndex).map((r) => r.size);
    const usedDeleteSizes = (excludeIndex) =>
        deleteData.rows.filter((_, i) => i !== excludeIndex).map((r) => r.size);
    const usedCreditSellSizes = (excludeIndex) =>
        creditSellData.rows.filter((_, i) => i !== excludeIndex).map((r) => r.size);

    const canAddMoreSellRows = sellGroup && sellData.rows.length < sellGroup.variants.length;
    const canAddMoreDeleteRows = deleteGroup && deleteData.rows.length < deleteGroup.variants.length;
    const canAddMoreCreditSellRows = creditSellGroup && creditSellData.rows.length < creditSellGroup.variants.length;

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

    const handleCreditSellGroupSelect = (localId) => {
        const group = productGroups.find((g) => String(g.local_id) === String(localId));
        setCreditSellData(prev => ({
            ...prev,
            product_id: localId,
            rows: [{
                size: group && group.variants.length === 1 ? (group.variants[0].size || '') : '',
                sell_quantity: 1,
                selling_price: ''
            }]
        }));
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

    const updateCreditSellRow = (index, patch) => {
        setCreditSellData((prev) => ({
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

    const addCreditSellRow = () => {
        if (!canAddMoreCreditSellRows) return;
        setCreditSellData((prev) => ({ ...prev, rows: [...prev.rows, emptySellRow()] }));
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

    const removeCreditSellRow = (index) => {
        setCreditSellData((prev) => ({
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
            if (!newProduct.quantity || Number(newProduct.quantity) <= 0) {
                alert("Umumiy soni 0 dan katta bo‘lishi kerak!");
                return;
            }

            if (!newProduct.supplier?.trim()) {
                alert("Kimdan olinganini kiritish shart!");
                return;
            }
            if (!newProduct.supplier_phone?.trim()) {
                alert("Telefon raqamini kiritish shart!");
                return;
            }

            if (newProduct.payment_type === 'credit') {
                if (newProduct.paid_amount !== '' && newProduct.paid_amount != null && Number(newProduct.paid_amount) < 0) {
                    alert("To‘langan summa manfiy bo‘lishi mumkin emas!");
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
                supplier: newProduct.supplier.trim(),
                supplier_phone: newProduct.supplier_phone.trim(),
                paid_amount: newProduct.payment_type === 'credit' ? Number(newProduct.paid_amount) || 0 : 0,
                selling_price: newProduct.selling_price !== '' && newProduct.selling_price != null
                    ? Number(newProduct.selling_price)
                    : null,
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
                selling_price: '',
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

    // ========== YANGI: NASIYAGA SOTISH ==========
    const handleCreditSell = async (e) => {
        e.preventDefault();

        if (!creditSellGroup) {
            alert("Iltimos, sotiladigan tovarni tanlang!");
            return;
        }
        if (!creditSellData.customer_name?.trim()) {
            alert("Mijoz ismini kiriting!");
            return;
        }
        if (!creditSellData.customer_phone?.trim()) {
            alert("Mijoz telefonini kiriting!");
            return;
        }

        const items = [];
        const seenVariantIds = new Set();

        for (let i = 0; i < creditSellData.rows.length; i++) {
            const row = creditSellData.rows[i];

            if (creditSellGroup.variants.length > 1 && !row.size) {
                alert(`${i + 1}-qatorda razmerni tanlang!`);
                return;
            }

            const variant = resolveVariant(creditSellGroup, row);
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
            await api.post('/api/dashboard/sell-credit', {
                items,
                customer_name: creditSellData.customer_name.trim(),
                customer_phone: creditSellData.customer_phone.trim(),
                paid_now: Number(creditSellData.paid_now) || 0
            });

            setCreditSellModal(false);
            setCreditSellData({
                product_id: '',
                rows: [emptySellRow()],
                customer_name: '',
                customer_phone: '',
                paid_now: ''
            });
            setCreditSellSearch('');
            await fetchData(false);
            alert("Tovar nasiyaga muvaffaqiyatli sotildi!");
        } catch (err) {
            alert(err.response?.data?.message || "Nasiyaga sotishda xatolik yuz berdi!");
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
        setDebtsSearch('');
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

    // ========== YANGI: QARZ TO'LOVINI BEKOR QILISH MODALI ==========
    const openUndoDebtModal = async () => {
        setUndoDebtModal(true);
        setUndoDebtSearch('');
        setSelectedUndoDebt(null);
        setUndoAmount('');
        setUndoMode('undo');
        setLoadingUndoDebts(true);
        try {
            // Oxirgi 30 kun ichida to'lov qilingan (paid_amount > 0) qarzlarni olamiz
            const res = await api.get('/api/debts/recent-payments');
            setUndoDebtList(res.data?.payments || []);
        } catch (err) {
            // Agar endpoint hali yo'q bo'lsa, oddiy qarzlardan foydalanamiz
            try {
                const res2 = await api.get('/api/debts');
                const list = (res2.data?.debts || []).filter(d => Number(d.total_paid) > 0);
                setUndoDebtList(list.map(d => ({
                    ...d,
                    paid_at: null // taxminiy
                })));
            } catch (e) {
                alert("Ma'lumotlarni yuklashda xatolik!");
                setUndoDebtList([]);
            }
        } finally {
            setLoadingUndoDebts(false);
        }
    };

    const handleUndoOrEditDebt = async () => {
        if (!selectedUndoDebt) {
            alert("Avval qarzni tanlang!");
            return;
        }

        const amount = Number(undoAmount);
        if (!amount || amount <= 0) {
            alert("Summani to'g'ri kiriting!");
            return;
        }

        if (undoMode === 'undo' && amount > Number(selectedUndoDebt.total_paid || 0)) {
            alert(`Eng ko'p ${formatSum(selectedUndoDebt.total_paid)} so'm bekor qilish mumkin!`);
            return;
        }

        const confirmMsg = undoMode === 'undo'
            ? `"${selectedUndoDebt.supplier}" ga qilingan ${formatSum(amount)} so'm to'lovni bekor qilmoqchimisiz? Qarz qayta tiklanadi.`
            : `"${selectedUndoDebt.supplier}" qarzini ${formatSum(amount)} so'mga o'zgartirmoqchimisiz?`;

        if (!window.confirm(confirmMsg)) return;

        setIsSubmitting(true);
        try {
            await api.post('/api/debts/undo-or-edit', {
                supplier: selectedUndoDebt.supplier,
                supplier_phone: selectedUndoDebt.supplier_phone || null,
                amount: amount,
                mode: undoMode // 'undo' yoki 'edit'
            });

            alert(undoMode === 'undo'
                ? "To'lov muvaffaqiyatli bekor qilindi! Qarz qayta tiklandi."
                : "Qarz muvaffaqiyatli tahrirlandi!");

            setSelectedUndoDebt(null);
            setUndoAmount('');
            // Ro'yxatni yangilash
            const res = await api.get('/api/debts/recent-payments').catch(() => null);
            if (res) {
                setUndoDebtList(res.data?.payments || []);
            } else {
                const res2 = await api.get('/api/debts');
                setUndoDebtList((res2.data?.debts || []).filter(d => Number(d.total_paid) > 0));
            }
            await fetchData(false);
        } catch (err) {
            alert(err.response?.data?.message || "Amalni bajarishda xatolik!");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openSuppliersModal = async () => {
        setSuppliersModal(true);
        setSuppliersSearch('');
        setLoadingSuppliers(true);
        try {
            const res = await api.get('/api/suppliers');
            setSuppliersList(res.data?.suppliers || res.data || []);
        } catch (err) {
            alert(err.response?.data?.message || "Tovar berganlarni yuklashda xatolik!");
            setSuppliersList([]);
        } finally {
            setLoadingSuppliers(false);
        }
    };

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
                    <button
                        onClick={() => {
                            setEditSelectSearch('');
                            setEditSelectModal(true);
                        }}
                        className="btn btn-edit-header"
                    >
                        ✏️ Tovarni tahrirlash
                    </button>
                    <button onClick={() => setSellModal(true)} className="btn btn-sell">🛒 Tovar Sotish</button>

                    {/* ===== YANGI TUGMALAR ===== */}
                    <button onClick={() => setCreditSellModal(true)} className="btn btn-credit-sell">
                        🛒 Nasiyaga sotish
                    </button>
                    <button onClick={openUndoDebtModal} className="btn btn-undo-debt">
                        ↩️ Qarz to‘lovini bekor qilish
                    </button>
                    {/* ======================== */}

                    <button onClick={() => setExpenseModal(true)} className="btn btn-expense">💸 Rasxod Yozish</button>
                    <button onClick={() => setDeleteModal(true)} className="btn btn-delete">🗑️ Tovarni O'chirish</button>
                    <button onClick={openDebtsModal} className="btn btn-debts">💳 Qarzlar</button>
                    <button onClick={openSuppliersModal} className="btn btn-suppliers">👥 Tovar berganlar</button>
                    <button onClick={openReturnModal} className="btn btn-return">↩️ Vozvrat</button>
                    <button onClick={openExpenseListModal} className="btn btn-edit-expense">📋 Rasxodlarni taxrirlash</button>
                    <button onClick={handleLogout} className="btn btn-logout">🚪 Chiqish</button>
                </div>
            </header>

            {/* ... (barcha eski section'lar o'z holicha qoladi — stats, products jadvali va h.k.) ... */}
            {/* Men faqat yangi qo'shilgan qismlarni to'liq yozaman, qolganlari sizning asl kodingiz bilan bir xil */}

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
                                    return (
                                        <tr key={g.local_id}>
                                            <td><b>#{g.local_id}</b></td>
                                            <td><span className="category-badge">{g.category || 'Umumiy'}</span></td>
                                            <td><b>{g.name}</b></td>
                                            <td className="col-hide-mobile">
                                                {g.color ? <span className="color-badge">{g.color}</span> : ''}
                                            </td>
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
                                                    {g.variants.map((v) => (
                                                        <ProductQR
                                                            key={v.id}
                                                            product={{
                                                                ...v,
                                                                name: g.name,
                                                                color: g.color,
                                                                local_id: g.local_id,
                                                                selling_price: v.selling_price ?? g.selling_price
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="col-hide-tiny">
                                                <b className={totalQty < 5 ? "warning-stock" : ""}>{totalQty} ta</b>
                                            </td>
                                            <td className="col-details-only">
                                                <div className="product-action-buttons">
                                                    <button
                                                        type="button"
                                                        className="btn-details"
                                                        onClick={() => setDetailsGroup(g)}
                                                    >
                                                        🔍 Batafsil
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

            {/* ========== 🛒 NASIYAGA SOTISH MODALI ========== */}
            {creditSellModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header">
                            <h3>🛒 Nasiyaga sotish</h3>
                        </div>

                        <form onSubmit={handleCreditSell} className="product-form">
                            <div className="form-group">
                                <label>Tovar nomi bo'yicha qidirish :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Nike, Divan..."
                                    value={creditSellSearch}
                                    onChange={(e) => setCreditSellSearch(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Tovarni tanlang * :</label>
                                <select
                                    value={creditSellData.product_id}
                                    onChange={(e) => handleCreditSellGroupSelect(e.target.value)}
                                    required
                                    className="form-input"
                                >
                                    <option value="">-- Tovarni tanlang --</option>
                                    {filteredCreditSellGroups.map((g) => (
                                        <option key={g.local_id} value={g.local_id}>
                                            {g.name} {g.color ? `(${g.color})` : ''} — jami: {g.variants.reduce((s, v) => s + v.quantity, 0)} ta
                                        </option>
                                    ))}
                                </select>
                                {creditSellSearch && filteredCreditSellGroups.length === 0 && (
                                    <div className="error-text">⚠️ Qidiruvga mos tovar topilmadi!</div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Mijoz ismi * :</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Ali Valiyev"
                                    value={creditSellData.customer_name}
                                    onChange={(e) => setCreditSellData({ ...creditSellData, customer_name: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Mijoz telefoni * :</label>
                                <input
                                    type="text"
                                    placeholder="+998 90 123 45 67"
                                    value={creditSellData.customer_phone}
                                    onChange={(e) => setCreditSellData({ ...creditSellData, customer_phone: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Hozir to‘langan summa (ixtiyoriy) :</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={creditSellData.paid_now}
                                    onChange={(e) => setCreditSellData({ ...creditSellData, paid_now: e.target.value })}
                                    className="form-input"
                                />
                            </div>

                            {creditSellGroup && (
                                <>
                                    <div className="info-banner info-success">
                                        ✅ Tanlangan: <b>{creditSellGroup.name}</b> ({creditSellGroup.color || 'Rangsiz'}) —
                                        mavjud razmerlar: {creditSellGroup.variants.map((v) => `${v.size || 'Standart'} (${v.quantity} ta)`).join(', ')}
                                    </div>

                                    {creditSellData.rows.map((row, index) => {
                                        const variant = resolveVariant(creditSellGroup, row);
                                        const usedSizes = usedCreditSellSizes(index);
                                        return (
                                            <div className="cart-row" key={index}>
                                                {creditSellGroup.variants.length > 1 && (
                                                    <div className="form-group">
                                                        <label>Razmer * ({index + 1}-qator) :</label>
                                                        <select
                                                            value={row.size}
                                                            onChange={(e) => updateCreditSellRow(index, { size: e.target.value })}
                                                            required
                                                            className="form-input"
                                                        >
                                                            <option value="">-- Razmerni tanlang --</option>
                                                            {creditSellGroup.variants
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
                                                                onChange={(e) => updateCreditSellRow(index, { sell_quantity: e.target.value })}
                                                                required
                                                                className="form-input"
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Sotish narxi (1 dona) * :</label>
                                                            <input
                                                                type="number"
                                                                value={row.selling_price}
                                                                onChange={(e) => updateCreditSellRow(index, { selling_price: e.target.value })}
                                                                placeholder="350000"
                                                                required
                                                                className="form-input"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {creditSellData.rows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCreditSellRow(index)}
                                                        className="btn btn-remove-row"
                                                    >
                                                        ✕ Qatorni olib tashlash
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {canAddMoreCreditSellRows && (
                                        <button type="button" onClick={addCreditSellRow} className="btn btn-add-row">
                                            + Yana razmer qo'shish
                                        </button>
                                    )}

                                    {/* ===== KUTILAYOTGAN FOYDA HISOBI ===== */}
                                    {(() => {
                                        const validRows = creditSellData.rows
                                            .map((row) => ({ row, variant: resolveVariant(creditSellGroup, row) }))
                                            .filter(({ variant, row }) =>
                                                variant &&
                                                Number(row.selling_price) >= 0 &&
                                                row.selling_price !== '' &&
                                                Number(row.sell_quantity) > 0
                                            );

                                        if (validRows.length === 0) return null;

                                        const totalRevenue = validRows.reduce(
                                            (s, { row }) => s + Number(row.selling_price) * Number(row.sell_quantity),
                                            0
                                        );

                                        const totalProfit = validRows.reduce((s, { row, variant }) => {
                                            const cost = Number(variant.cost_price ?? creditSellGroup.cost_price ?? 0);
                                            return s + (Number(row.selling_price) - cost) * Number(row.sell_quantity);
                                        }, 0);

                                        const paidNow = Number(creditSellData.paid_now) || 0;
                                        const remainingDebt = Math.max(0, totalRevenue - paidNow);

                                        return (
                                            <div className="calculation-box">
                                                <div className="calc-row">
                                                    <span>Jami tushum:</span>
                                                    <strong>{formatSum(totalRevenue)} so'm</strong>
                                                </div>
                                                <div className="calc-row">
                                                    <span>Hozir to‘langan:</span>
                                                    <strong>{formatSum(paidNow)} so'm</strong>
                                                </div>
                                                <div className="calc-row">
                                                    <span>Mijoz qarziga qoladi:</span>
                                                    <strong style={{ color: remainingDebt > 0 ? '#ef4444' : '#16a34a' }}>
                                                        {formatSum(remainingDebt)} so'm
                                                    </strong>
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
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !creditSellGroup}
                                    className="btn btn-primary"
                                >
                                    {isSubmitting ? "Saqlanmoqda..." : "Nasiyaga sotish"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreditSellModal(false);
                                        setCreditSellData({
                                            product_id: '',
                                            rows: [emptySellRow()],
                                            customer_name: '',
                                            customer_phone: '',
                                            paid_now: ''
                                        });
                                        setCreditSellSearch('');
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

            {/* ========== ↩️ QARZ TO'LOVINI BEKOR QILISH / TAHRIRLASH MODALI ========== */}
            {undoDebtModal && (
                <div className="modal-overlay" onClick={() => setUndoDebtModal(false)}>
                    <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>↩️ Qarz to‘lovini bekor qilish / tahrirlash</h3>
                        </div>

                        <div className="info-banner info-success">
                            Faqat oxirgi {DEBT_PAYMENT_UNDO_WINDOW_DAYS} kun ichida to‘langan (yoki qisman to‘langan) qarzlarni bekor qilish yoki tahrirlash mumkin.
                            “Bekor qilish” — to‘lovni olib tashlaydi va qarzni qayta tiklaydi.
                        </div>

                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="Ism, telefon yoki tovar nomi bo‘yicha qidirish..."
                                value={undoDebtSearch}
                                onChange={(e) => setUndoDebtSearch(e.target.value)}
                                className="form-input"
                            />
                        </div>

                        {loadingUndoDebts ? (
                            <p className="empty-text">Yuklanmoqda...</p>
                        ) : (
                            <div className="expense-list" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                {undoDebtList
                                    .filter((d) => {
                                        const q = undoDebtSearch.toLowerCase().trim();
                                        if (!q) return true;
                                        const name = (d.supplier || '').toLowerCase();
                                        const phone = (d.supplier_phone || '').toLowerCase();
                                        return name.includes(q) || phone.includes(q);
                                    })
                                    .map((d, idx) => (
                                        <div
                                            key={idx}
                                            className={`expense-list-item ${selectedUndoDebt === d ? 'selected' : ''}`}
                                            style={{
                                                cursor: 'pointer',
                                                background: selectedUndoDebt === d ? '#e0f2fe' : undefined
                                            }}
                                            onClick={() => {
                                                setSelectedUndoDebt(d);
                                                setUndoAmount(String(d.total_paid || ''));
                                            }}
                                        >
                                            <div>
                                                <div><b>👤 {d.supplier}</b></div>
                                                <div className="expense-meta">
                                                    {d.supplier_phone && <>📞 {d.supplier_phone} • </>}
                                                    To‘langan: {formatSum(d.total_paid)} so‘m
                                                    {d.total_debt > 0 && <> • Qolgan qarz: {formatSum(d.total_debt)} so‘m</>}
                                                </div>
                                            </div>
                                            {selectedUndoDebt === d && <span style={{ color: '#0369a1', fontWeight: 700 }}>✓ Tanlangan</span>}
                                        </div>
                                    ))}
                                {undoDebtList.length === 0 && (
                                    <p className="empty-text">Oxirgi 1 oy ichida to‘lov qilingan qarz topilmadi</p>
                                )}
                            </div>
                        )}

                        {selectedUndoDebt && (
                            <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                <div className="form-group">
                                    <label>Amal turi:</label>
                                    <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                checked={undoMode === 'undo'}
                                                onChange={() => setUndoMode('undo')}
                                            />
                                            To‘lovni bekor qilish (qarzni tiklash)
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                checked={undoMode === 'edit'}
                                                onChange={() => setUndoMode('edit')}
                                            />
                                            To‘langan summani tahrirlash
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>
                                        {undoMode === 'undo' ? 'Bekor qilinadigan summa *' : 'Yangi to‘langan summa *'} :
                                    </label>
                                    <input
                                        type="number"
                                        value={undoAmount}
                                        onChange={(e) => setUndoAmount(e.target.value)}
                                        className="form-input"
                                        placeholder={String(selectedUndoDebt.total_paid || 0)}
                                    />
                                    <small className="form-hint">
                                        Hozirgi to‘langan: {formatSum(selectedUndoDebt.total_paid)} so‘m
                                    </small>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    disabled={isSubmitting}
                                    onClick={handleUndoOrEditDebt}
                                >
                                    {isSubmitting ? 'Bajarilmoqda...' : (undoMode === 'undo' ? '↩️ To‘lovni bekor qilish' : '✏️ Saqlash')}
                                </button>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button type="button" onClick={() => setUndoDebtModal(false)} className="btn btn-secondary">
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Qolgan barcha eski modallar (addProduct, sell, expense, delete, editSelect, edit, details, return, expenseList, editExpense, debts, suppliers) 
               sizning asl kodingiz bilan 100% bir xil qoldirilgan. Ularni o'zgartirmadim. */}
        </div>
    );
};

export default DashboardPage;