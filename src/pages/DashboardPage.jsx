import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/dashboard.css';
import '../styles/product-image-upload.css';
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

const PRODUCT_EDIT_WINDOW_DAYS = 7;
const SALE_RETURN_WINDOW_DAYS = 7;
const EXPENSE_EDIT_WINDOW_DAYS = 30;
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
        totalCustomerDebt: 0,
        enteredQty: 0,
        enteredTypes: 0,
        enteredSum: 0,
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

    const [returnModal, setReturnModal] = useState(false);
    const [salesList, setSalesList] = useState([]);
    const [salesLoading, setSalesLoading] = useState(false);
    const [returnSearch, setReturnSearch] = useState('');

    const [expenseListModal, setExpenseListModal] = useState(false);
    const [expensesList, setExpensesList] = useState([]);
    const [expensesLoading, setExpensesLoading] = useState(false);
    const [editExpenseModal, setEditExpenseModal] = useState(false);
    const [editExpenseData, setEditExpenseData] = useState({
        id: '', title: '', amount: '', expense_type: 'daily'
    });

    const [editProduct, setEditProduct] = useState({
        local_id: '',
        category: '',
        name: '',
        cost_price: '',
        selling_price: '',
        color: '',
        sizes: '',
        quantity: '',
        image_url: '',
        remove_image: false
    });

    const [editImagePreview, setEditImagePreview] = useState('');
    const [editImageFileName, setEditImageFileName] = useState('');

    const [newProduct, setNewProduct] = useState({
        category: '', name: '', cost_price: '', color: '', sizes: '', quantity: '',
        payment_type: 'cash', supplier: '', paid_amount: '', supplier_phone: '', selling_price: '',
        image_url: '',
    });

    // Taqsimot oynasi (Add va Edit uchun umumiy)
    const [sizeDistModal, setSizeDistModal] = useState(false);
    const [sizeDistRows, setSizeDistRows] = useState([]); // [{ size, quantity }]
    const [sizeDistMode, setSizeDistMode] = useState('add'); // 'add' | 'edit'
    const [pendingProductData, setPendingProductData] = useState(null);

    const [imagePreview, setImagePreview] = useState('');
    const [imageFileName, setImageFileName] = useState('');

    const [debtsModal, setDebtsModal] = useState(false);
    const [debts, setDebts] = useState([]);
    const [loadingDebts, setLoadingDebts] = useState(false);
    const [debtsSearch, setDebtsSearch] = useState('');

    const [suppliersModal, setSuppliersModal] = useState(false);
    const [suppliersList, setSuppliersList] = useState([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [suppliersSearch, setSuppliersSearch] = useState('');

    // O'chirilgan tovarlarni qaytarish
    const [restoreModal, setRestoreModal] = useState(false);
    const [deletedList, setDeletedList] = useState([]);
    const [loadingDeleted, setLoadingDeleted] = useState(false);
    const [restoreSearch, setRestoreSearch] = useState('');

    const [enteredListModal, setEnteredListModal] = useState(false);
    const [enteredList, setEnteredList] = useState([]);
    const [enteredListLoading, setEnteredListLoading] = useState(false);
    const [enteredListSearch, setEnteredListSearch] = useState('');

    // Nasiyaga sotish
    const [creditSellModal, setCreditSellModal] = useState(false);
    const [creditSellSearch, setCreditSellSearch] = useState('');
    const [creditSellData, setCreditSellData] = useState({
        product_id: '',
        rows: [{ size: '', sell_quantity: 1, selling_price: '', color: '' }],
        customer_name: '',
        customer_phone: '',
        paid_now: ''
    });

    // Qarz to'lovini bekor qilish
    const [undoDebtModal, setUndoDebtModal] = useState(false);
    const [undoDebtSearch, setUndoDebtSearch] = useState('');
    const [undoDebtList, setUndoDebtList] = useState([]);
    const [loadingUndoDebts, setLoadingUndoDebts] = useState(false);
    const [selectedUndoDebt, setSelectedUndoDebt] = useState(null);
    const [undoAmount, setUndoAmount] = useState('');
    const [undoMode, setUndoMode] = useState('undo');

    // Mijoz qarzlari
    const [customerDebtsModal, setCustomerDebtsModal] = useState(false);
    const [customerDebts, setCustomerDebts] = useState([]);
    const [loadingCustomerDebts, setLoadingCustomerDebts] = useState(false);
    const [customerDebtsSearch, setCustomerDebtsSearch] = useState('');

    const emptySellRow = () => ({ size: '', sell_quantity: 1, selling_price: '', color: '' });
    const [sellSearch, setSellSearch] = useState('');
    const [sellData, setSellData] = useState({ product_id: '', rows: [emptySellRow()] });

    const [expenseData, setExpenseData] = useState({ title: '', amount: '', expense_type: 'daily' });

    const [menuOpen, setMenuOpen] = useState(false);
    const [savingAllQrs, setSavingAllQrs] = useState(false);

    const emptyDeleteRow = () => ({ size: '', remove_all: false, quantity_to_remove: 1 });
    const [deleteSearch, setDeleteSearch] = useState('');
    const [deleteData, setDeleteData] = useState({ product_id: '', rows: [emptyDeleteRow()] });

    const handleLogout = () => {
        if (window.confirm("Tizimdan chiqishni tasdiqlaysizmi?")) {
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    const fetchData = async (showMainLoader = false) => {
        try {
            if (showMainLoader) setIsInitialLoading(true);

            const [statsRes, productsRes] = await Promise.all([
                api.get('/api/dashboard/stats'),
                api.get('/api/products')
            ]);

            setSubscriptionExpired(false);
            setSubscriptionMessage('');

            if (statsRes.data) {
                setStats((prev) => ({ ...prev, ...statsRes.data }));
            }

            const fetchedProducts = productsRes.data?.products || productsRes.data || [];
            setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
        } catch (err) {
            console.error("Ma'lumotlarni yuklashda xatolik:", err);
            const status = err.response?.status;
            if (status === 403) {
                setSubscriptionExpired(true);
                setSubscriptionMessage(err.response?.data?.message || "To'lov muddati tugagan!");
                return;
            }
            if (status === 401) {
                localStorage.removeItem('token');
                navigate('/login', { replace: true });
                return;
            }
        } finally {
            if (showMainLoader) setIsInitialLoading(false);
        }
    };

    useEffect(() => { fetchData(true); }, []);

    const formatSum = (val) => Number(val || 0).toLocaleString('uz-UZ');

    const formatExpenseType = (type) => {
        const map = {
            daily: 'Kunlik',
            monthly: 'Oylik',
            other: 'Boshqa',
            weekly: 'Haftalik',
            yearly: 'Yillik',
        };
        const key = String(type || '').toLowerCase().trim();
        return map[key] || type || '—';
    };

    // Rasmni siqish (Telegram uchun — max ~800px, JPEG)
    const compressImage = (file, maxWidth = 800, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error("Faqat rasm fayli tanlang!"));
                return;
            }
            if (file.size > 8 * 1024 * 1024) {
                reject(new Error("Rasm 8 MB dan katta bo'lmasligi kerak!"));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width;
                    let h = img.height;
                    if (w > maxWidth) {
                        h = Math.round((h * maxWidth) / w);
                        w = maxWidth;
                    }
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi!"));
                img.src = reader.result;
            };
            reader.onerror = () => reject(new Error("Faylni o'qib bo'lmadi!"));
            reader.readAsDataURL(file);
        });
    };

    const handleProductImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            setNewProduct((prev) => ({ ...prev, image_url: '' }));
            setImagePreview('');
            setImageFileName('');
            return;
        }
        try {
            const dataUrl = await compressImage(file);
            setNewProduct((prev) => ({ ...prev, image_url: dataUrl }));
            setImagePreview(dataUrl);
            setImageFileName(file.name || 'Rasm tanlandi');
        } catch (err) {
            alert(err.message || "Rasm yuklashda xatolik!");
            e.target.value = '';
            setNewProduct((prev) => ({ ...prev, image_url: '' }));
            setImagePreview('');
            setImageFileName('');
        }
    };

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
                    image_url: p.image_url || null,
                    createdAt: p.created_at || null,
                    variants: []
                });
            }
            const group = map.get(key);
            if (p.created_at && (!group.createdAt || new Date(p.created_at) < new Date(group.createdAt))) {
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
                selling_price: p.selling_price ?? group.selling_price ?? null,
                cost_price: p.cost_price
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
        return (group.name || '').toLowerCase().includes(q);
    };

    const filteredSellGroups = productGroups.filter((g) => matchesQuery(g, sellSearch));
    const filteredDeleteGroups = productGroups.filter((g) => matchesQuery(g, deleteSearch));
    const filteredCreditSellGroups = productGroups.filter((g) => matchesQuery(g, creditSellSearch));
    const filteredEditGroups = productGroups.filter((g) => matchesQuery(g, editSelectSearch));

    const sellGroup = productGroups.find((g) => String(g.local_id) === String(sellData.product_id)) || null;
    const deleteGroup = productGroups.find((g) => String(g.local_id) === String(deleteData.product_id)) || null;
    const creditSellGroup = productGroups.find((g) => String(g.local_id) === String(creditSellData.product_id)) || null;

    const resolveVariant = (group, row) => {
        if (!group) return null;
        if (group.variants.length === 1) return group.variants[0];
        return group.variants.find((v) => String(v.size || '') === String(row.size || '')) || null;
    };

    const usedSellSizes = (excludeIndex) => sellData.rows.filter((_, i) => i !== excludeIndex).map((r) => r.size);
    const usedDeleteSizes = (excludeIndex) => deleteData.rows.filter((_, i) => i !== excludeIndex).map((r) => r.size);
    const usedCreditSellSizes = (excludeIndex) => creditSellData.rows.filter((_, i) => i !== excludeIndex).map((r) => r.size);

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
                selling_price: '',
                color: group?.color || ''
            }]
        });
    };

    const handleDeleteGroupSelect = (localId) => {
        const group = productGroups.find((g) => String(g.local_id) === String(localId));
        setDeleteData({
            product_id: localId,
            rows: [{ size: group && group.variants.length === 1 ? (group.variants[0].size || '') : '', remove_all: false, quantity_to_remove: 1 }]
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
                selling_price: '',
                color: group?.color || ''
            }]
        }));
    };

    const updateSellRow = (index, patch) => {
        setSellData((prev) => ({ ...prev, rows: prev.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
    };
    const updateDeleteRow = (index, patch) => {
        setDeleteData((prev) => ({ ...prev, rows: prev.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
    };
    const updateCreditSellRow = (index, patch) => {
        setCreditSellData((prev) => ({ ...prev, rows: prev.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
    };

    const addSellRow = () => { if (canAddMoreSellRows) setSellData((prev) => ({ ...prev, rows: [...prev.rows, emptySellRow()] })); };
    const addDeleteRow = () => { if (canAddMoreDeleteRows) setDeleteData((prev) => ({ ...prev, rows: [...prev.rows, emptyDeleteRow()] })); };
    const addCreditSellRow = () => { if (canAddMoreCreditSellRows) setCreditSellData((prev) => ({ ...prev, rows: [...prev.rows, emptySellRow()] })); };

    const removeSellRow = (index) => {
        setSellData((prev) => ({ ...prev, rows: prev.rows.length > 1 ? prev.rows.filter((_, i) => i !== index) : prev.rows }));
    };
    const removeDeleteRow = (index) => {
        setDeleteData((prev) => ({ ...prev, rows: prev.rows.length > 1 ? prev.rows.filter((_, i) => i !== index) : prev.rows }));
    };
    const removeCreditSellRow = (index) => {
        setCreditSellData((prev) => ({ ...prev, rows: prev.rows.length > 1 ? prev.rows.filter((_, i) => i !== index) : prev.rows }));
    };

    const openEditProduct = (group) => {
        if (!isProductEditable(group)) {
            alert(`Bu tovar qo'shilganiga ${PRODUCT_EDIT_WINDOW_DAYS} kundan ko'p vaqt o'tgan, tahrirlab bo'lmaydi!`);
            return;
        }

        const imageUrl = group.image_url || '';

        setEditProduct({
            local_id: group.local_id,
            category: group.category || '',
            name: group.name || '',
            cost_price: group.cost_price || '',
            selling_price: group.selling_price != null ? group.selling_price : '',
            color: group.color || '',
            sizes: group.variants.map((v) => v.size).filter(Boolean).join(', '),
            quantity: group.variants.reduce((sum, v) => sum + Number(v.quantity || 0), 0),
            image_url: imageUrl
        });

        setEditImagePreview(imageUrl);
        setEditImageFileName(imageUrl ? 'Mavjud rasm' : '');
        setEditSelectModal(false);
        setEditModal(true);
    };

    const openEditSelectModal = () => {
        setEditSelectSearch('');
        setEditSelectModal(true);
    };

    const handleEditProductImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const dataUrl = await compressImage(file);

            setEditProduct((prev) => ({
                ...prev,
                image_url: dataUrl
            }));
            setEditImagePreview(dataUrl);
            setEditImageFileName(file.name || 'Rasm tanlandi');
        } catch (err) {
            alert(err.message || "Rasm yuklashda xatolik!");
            e.target.value = '';
        }
    };

    const handleEditProduct = async (e) => {
        e.preventDefault();

        if (!editProduct.local_id) { alert("Tovar ID topilmadi!"); return; }
        if (!editProduct.name.trim()) { alert("Tovar nomini kiriting!"); return; }
        if (editProduct.cost_price === '' || Number(editProduct.cost_price) < 0) { alert("Tannarxni to'g'ri kiriting!"); return; }
        if (editProduct.quantity === '' || Number(editProduct.quantity) < 0) { alert("Tovar sonini to'g'ri kiriting!"); return; }

        const totalQty = Number(editProduct.quantity);

        openSizeDistribution(
            editProduct.sizes,
            totalQty,
            'edit',
            {
                local_id: editProduct.local_id,
                category: editProduct.category || 'Umumiy',
                name: editProduct.name.trim(),
                color: editProduct.color.trim(),
                cost_price: Number(editProduct.cost_price),
                selling_price: editProduct.selling_price !== '' && editProduct.selling_price != null
                    ? Number(editProduct.selling_price) : null,
                image_url: editProduct.image_url || null,
            }
        );
    };

    const submitEditProduct = async (extra = {}) => {
        setIsSubmitting(true);
        try {
            const body = {
                category: pendingProductData?.category || editProduct.category || 'Umumiy',
                name: pendingProductData?.name || editProduct.name.trim(),
                color: pendingProductData?.color || editProduct.color.trim(),
                cost_price: pendingProductData?.cost_price ?? Number(editProduct.cost_price),
                quantity: pendingProductData?.totalQty || Number(editProduct.quantity),
                sizes: pendingProductData?.sizesStr || editProduct.sizes,
                image_url: (pendingProductData?.image_url ?? editProduct.image_url) || null,
                ...extra
            };

            if (extra.size_quantities) {
                body.size_quantities = extra.size_quantities;
                body.quantity = extra.size_quantities.reduce((s, r) => s + Number(r.quantity || 0), 0);
                body.sizes = extra.size_quantities.map(r => r.size).filter(Boolean).join(', ');
            }

            if (pendingProductData?.selling_price != null) {
                body.selling_price = pendingProductData.selling_price;
            } else if (editProduct.selling_price !== '' && editProduct.selling_price != null) {
                body.selling_price = Number(editProduct.selling_price);
            }

            const res = await api.put(`/api/products/${editProduct.local_id}`, body);

            setEditModal(false);
            setSizeDistModal(false);
            setEditImagePreview('');
            setEditImageFileName('');
            setEditProduct({
                local_id: '', category: '', name: '', cost_price: '', selling_price: '',
                color: '', sizes: '', quantity: '', image_url: ''
            });
            setSizeDistRows([]);
            setPendingProductData(null);

            await fetchData(false);
            alert(res.data?.message || "Tovar muvaffaqiyatli tahrirlandi!");
        } catch (err) {
            alert(err.response?.data?.message || "Tovarni tahrirlashda xatolik!");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openSizeDistribution = (sizesStr, totalQty, mode = 'add', extraData = {}) => {
        let sizeList = [];
        if (sizesStr && typeof sizesStr === 'string') {
            const seen = new Set();
            sizesStr.split(',').forEach(item => {
                const clean = item.trim();
                if (clean && !seen.has(clean.toLowerCase())) {
                    seen.add(clean.toLowerCase());
                    sizeList.push(clean);
                }
            });
        }

        // Razmerlar soni tovar sonidan ko‘p bo‘lsa
        if (sizeList.length > totalQty) {
            alert(`Siz kiritgan razmerlarning soni (${sizeList.length}) tovar sonidan (${totalQty}) ko‘p!`);
            return;
        }

        if (sizeList.length <= 1) {
            // Bitta yoki yo‘q → darhol yuborish
            if (mode === 'add') {
                submitAddProduct({
                    size_quantities: sizeList.length === 1
                        ? [{ size: sizeList[0], quantity: totalQty }]
                        : [{ size: '', quantity: totalQty }]
                });
            } else {
                submitEditProduct({
                    size_quantities: sizeList.length === 1
                        ? [{ size: sizeList[0], quantity: totalQty }]
                        : [{ size: '', quantity: totalQty }]
                });
            }
            return;
        }

        if (totalQty % sizeList.length === 0) {
            // Teng taqsimlash mumkin
            const per = totalQty / sizeList.length;
            const size_quantities = sizeList.map(s => ({ size: s, quantity: per }));
            if (mode === 'add') {
                submitAddProduct({ size_quantities });
            } else {
                submitEditProduct({ size_quantities });
            }
            return;
        }

        // Bo‘linmaydi → oyna ochamiz (prefill)
        const base = Math.floor(totalQty / sizeList.length);
        const remainder = totalQty % sizeList.length;

        const prefilled = sizeList.map((s, i) => ({
            size: s,
            quantity: base + (i < remainder ? 1 : 0)
        }));

        setSizeDistRows(prefilled);
        setSizeDistMode(mode);
        setPendingProductData({ ...extraData, totalQty, sizesStr });
        setSizeDistModal(true);
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();

        if (!newProduct.category?.trim()) { alert("Kategoriya kiritilishi shart!"); return; }
        if (!newProduct.name?.trim()) { alert("Tovar nomi kiritilishi shart!"); return; }
        if (!newProduct.cost_price && newProduct.cost_price !== 0) { alert("Kelgan narx kiritilishi shart!"); return; }
        if (!newProduct.quantity || Number(newProduct.quantity) <= 0) { alert("Umumiy soni 0 dan katta bo‘lishi kerak!"); return; }

        const totalQty = Number(newProduct.quantity);

        openSizeDistribution(
            newProduct.sizes,
            totalQty,
            'add',
            {
                category: newProduct.category.trim(),
                name: newProduct.name.trim(),
                color: newProduct.color.trim(),
                cost_price: Number(newProduct.cost_price) || 0,
                payment_type: newProduct.payment_type || 'cash',
                supplier: newProduct.supplier.trim(),
                supplier_phone: newProduct.supplier_phone.trim(),
                paid_amount: newProduct.payment_type === 'credit' ? Number(newProduct.paid_amount) || 0 : 0,
                selling_price: newProduct.selling_price !== '' && newProduct.selling_price != null
                    ? Number(newProduct.selling_price) : null,
                image_url: newProduct.image_url || null,
            }
        );
    };

    const submitAddProduct = async (extra = {}) => {
        setIsSubmitting(true);
        try {
            // Form maydonlari HAR DOIM yuboriladi (teng taqsimotda pendingProductData null bo'lishi mumkin)
            const body = {
                category: (pendingProductData?.category ?? newProduct.category)?.toString().trim() || '',
                name: (pendingProductData?.name ?? newProduct.name)?.toString().trim() || '',
                color: (pendingProductData?.color ?? newProduct.color)?.toString().trim() || '',
                cost_price: pendingProductData?.cost_price ?? (Number(newProduct.cost_price) || 0),
                payment_type: pendingProductData?.payment_type || newProduct.payment_type || 'cash',
                supplier: (pendingProductData?.supplier ?? newProduct.supplier)?.toString().trim() || '',
                supplier_phone: (pendingProductData?.supplier_phone ?? newProduct.supplier_phone)?.toString().trim() || '',
                paid_amount: pendingProductData?.paid_amount ?? (
                    (pendingProductData?.payment_type || newProduct.payment_type) === 'credit'
                        ? Number(newProduct.paid_amount) || 0
                        : 0
                ),
                selling_price: pendingProductData?.selling_price !== undefined
                    ? pendingProductData.selling_price
                    : (newProduct.selling_price !== '' && newProduct.selling_price != null
                        ? Number(newProduct.selling_price)
                        : null),
                image_url: (pendingProductData?.image_url ?? newProduct.image_url) || null,
                quantity: pendingProductData?.totalQty || Number(newProduct.quantity) || 0,
                sizes: pendingProductData?.sizesStr || newProduct.sizes?.trim() || '',
                ...extra
            };

            // size_quantities bo‘lsa uni ustun qilamiz
            if (extra.size_quantities) {
                body.size_quantities = extra.size_quantities;
                body.quantity = extra.size_quantities.reduce((s, r) => s + Number(r.quantity || 0), 0);
                body.sizes = extra.size_quantities.map(r => r.size).filter(Boolean).join(', ');
            }

            if (!body.name) {
                alert("Tovar nomi kiritilishi shart!");
                setIsSubmitting(false);
                return;
            }
            if (body.cost_price === undefined || body.cost_price === null || body.cost_price === '') {
                alert("Kelgan narx kiritilishi shart!");
                setIsSubmitting(false);
                return;
            }

            const res = await api.post('/api/products', body);

            setAddProductModal(false);
            setSizeDistModal(false);
            setImagePreview('');
            setImageFileName('');
            setNewProduct({
                category: '', name: '', color: '', cost_price: '', sizes: '', quantity: '',
                payment_type: 'cash', supplier: '', paid_amount: '', supplier_phone: '',
                selling_price: '', image_url: ''
            });
            setSizeDistRows([]);
            setPendingProductData(null);

            await fetchData(false);
            const displayId = res.data?.local_id || res.data?.product?.local_id || '';
            alert(res.data?.message || `Tovar saqlandi! ID: #${displayId}`);
        } catch (err) {
            alert(err.response?.data?.message || "Tovar qo‘shishda xatolik!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Yordamchi: haqiqiy yuborish
    const submitProduct = async (extra = {}) => {
        setIsSubmitting(true);
        try {
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
                    ? Number(newProduct.selling_price) : null,
                image_url: newProduct.image_url || null,
                ...extra
            };

            // Agar size_quantities berilgan bo‘lsa — uni ustun qilamiz
            if (extra.size_quantities) {
                body.size_quantities = extra.size_quantities;
                body.quantity = extra.size_quantities.reduce((s, r) => s + Number(r.quantity || 0), 0);
                body.sizes = extra.size_quantities.map(r => r.size).filter(Boolean).join(', ');
            }

            const res = await api.post('/api/products', body);

            setAddProductModal(false);
            setSizeDistModal(false);
            setImagePreview('');
            setImageFileName('');
            setNewProduct({
                category: '', name: '', color: '', cost_price: '', sizes: '', quantity: '',
                payment_type: 'cash', supplier: '', paid_amount: '', supplier_phone: '',
                selling_price: '', image_url: ''
            });
            setSizeDistRows([]);
            setPendingProductData(null);

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
        if (!sellGroup) { alert("Iltimos, sotiladigan tovarni tanlang!"); return; }

        const items = [];
        const seenVariantIds = new Set();

        for (let i = 0; i < sellData.rows.length; i++) {
            const row = sellData.rows[i];
            if (sellGroup.variants.length > 1 && !row.size) { alert(`${i + 1}-qatorda razmerni tanlang!`); return; }
            const variant = resolveVariant(sellGroup, row);
            if (!variant) { alert(`${i + 1}-qatordagi razmer bo'yicha tovar topilmadi!`); return; }
            if (seenVariantIds.has(variant.id)) { alert("Bir xil razmerni savatchada faqat bir marta tanlang!"); return; }
            seenVariantIds.add(variant.id);

            const qty = Number(row.sell_quantity);
            const price = Number(row.selling_price);
            if (!qty || qty <= 0) { alert(`${i + 1}-qatorda sotilayotgan sonni to'g'ri kiriting!`); return; }
            if (qty > variant.quantity) { alert(`${i + 1}-qatorda: omborda faqat ${variant.quantity} ta bor!`); return; }
            if (isNaN(price) || price < 0 || row.selling_price === '') { alert(`${i + 1}-qatorda sotish narxini to'g'ri kiriting!`); return; }

            // Rang tovardan olinadi — qo'lda yozilmaydi
            const productColor = (sellGroup.color || '').trim() || undefined;
            const pid = Number(variant.id);
            if (!Number.isInteger(pid) || pid <= 0) {
                alert(`${i + 1}-qatorda tovar ID topilmadi. Sahifani yangilab qayta urinib ko'ring!`);
                return;
            }
            items.push({
                product_id: pid,
                local_id: Number(sellGroup.local_id) || undefined,
                size: variant.size || row.size || '',
                sell_quantity: qty,
                selling_price: price,
                color: productColor
            });
        }

        if (items.length === 0) { alert("Kamida bitta razmer va son kiritilishi shart!"); return; }

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

    const handleCreditSell = async (e) => {
        e.preventDefault();
        if (!creditSellGroup) { alert("Iltimos, sotiladigan tovarni tanlang!"); return; }
        if (!creditSellData.customer_name?.trim()) { alert("Mijoz ismini kiriting!"); return; }
        if (!creditSellData.customer_phone?.trim()) { alert("Mijoz telefonini kiriting!"); return; }

        const items = [];
        const seenVariantIds = new Set();

        for (let i = 0; i < creditSellData.rows.length; i++) {
            const row = creditSellData.rows[i];
            if (creditSellGroup.variants.length > 1 && !row.size) { alert(`${i + 1}-qatorda razmerni tanlang!`); return; }
            const variant = resolveVariant(creditSellGroup, row);
            if (!variant) { alert(`${i + 1}-qatordagi razmer bo'yicha tovar topilmadi!`); return; }
            if (seenVariantIds.has(variant.id)) { alert("Bir xil razmerni savatchada faqat bir marta tanlang!"); return; }
            seenVariantIds.add(variant.id);

            const qty = Number(row.sell_quantity);
            const price = Number(row.selling_price);
            if (!qty || qty <= 0) { alert(`${i + 1}-qatorda sotilayotgan sonni to'g'ri kiriting!`); return; }
            if (qty > variant.quantity) { alert(`${i + 1}-qatorda: omborda faqat ${variant.quantity} ta bor!`); return; }
            if (isNaN(price) || price < 0 || row.selling_price === '') { alert(`${i + 1}-qatorda sotish narxini to'g'ri kiriting!`); return; }

            // Rang tovardan olinadi — qo'lda yozilmaydi
            const productColor = (creditSellGroup.color || '').trim() || undefined;
            const pid = Number(variant.id);
            if (!Number.isInteger(pid) || pid <= 0) {
                alert(`${i + 1}-qatorda tovar ID topilmadi. Sahifani yangilab qayta urinib ko'ring!`);
                return;
            }
            items.push({
                product_id: pid,
                local_id: Number(creditSellGroup.local_id) || undefined,
                size: variant.size || row.size || '',
                sell_quantity: qty,
                selling_price: price,
                color: productColor
            });
        }

        if (items.length === 0) { alert("Kamida bitta razmer va son kiritilishi shart!"); return; }

        setIsSubmitting(true);
        try {
            await api.post('/api/dashboard/sell-credit', {
                items,
                customer_name: creditSellData.customer_name.trim(),
                customer_phone: creditSellData.customer_phone.trim(),
                paid_now: Number(creditSellData.paid_now) || 0
            });
            setCreditSellModal(false);
            setCreditSellData({ product_id: '', rows: [emptySellRow()], customer_name: '', customer_phone: '', paid_now: '' });
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
        if (!deleteGroup) { alert("Iltimos, o'chiriladigan/kamaytiriladigan tovarni tanlang!"); return; }

        const items = [];
        const seenVariantIds = new Set();

        for (let i = 0; i < deleteData.rows.length; i++) {
            const row = deleteData.rows[i];
            if (deleteGroup.variants.length > 1 && !row.size) { alert(`${i + 1}-qatorda razmerni tanlang!`); return; }
            const variant = resolveVariant(deleteGroup, row);
            if (!variant) { alert(`${i + 1}-qatordagi razmer bo'yicha tovar topilmadi!`); return; }
            if (seenVariantIds.has(variant.id)) { alert("Bir xil razmerni ro'yxatda faqat bir marta tanlang!"); return; }
            seenVariantIds.add(variant.id);

            const removeQty = row.remove_all ? variant.quantity : (Number(row.quantity_to_remove) || 0);
            if (!removeQty || removeQty <= 0) { alert(`${i + 1}-qatorda olib tashlanadigan sonni to'g'ri kiriting!`); return; }
            if (removeQty > variant.quantity) { alert(`${i + 1}-qatorda: omborda faqat ${variant.quantity} ta bor!`); return; }

            items.push({ product_id: Number(variant.id), remove_all: !!row.remove_all, quantity_to_remove: removeQty });
        }

        if (items.length === 0) { alert("Kamida bitta razmer va son kiritilishi shart!"); return; }

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

    const openUndoDebtModal = async () => {
        setUndoDebtModal(true);
        setUndoDebtSearch('');
        setSelectedUndoDebt(null);
        setUndoAmount('');
        setUndoMode('undo');
        setLoadingUndoDebts(true);
        try {
            const res = await api.get('/api/debts/recent-payments');
            setUndoDebtList(res.data?.payments || []);
        } catch (err) {
            try {
                const res2 = await api.get('/api/debts');
                setUndoDebtList((res2.data?.debts || []).filter(d => Number(d.total_paid) > 0));
            } catch (e) {
                alert("Ma'lumotlarni yuklashda xatolik!");
                setUndoDebtList([]);
            }
        } finally {
            setLoadingUndoDebts(false);
        }
    };

    const handleUndoOrEditDebt = async () => {
        if (!selectedUndoDebt) { alert("Avval qarzni tanlang!"); return; }
        const amount = Number(undoAmount);
        if (!amount || amount <= 0) { alert("Summani to'g'ri kiriting!"); return; }
        if (undoMode === 'undo' && amount > Number(selectedUndoDebt.total_paid || 0)) {
            alert(`Eng ko'p ${formatSum(selectedUndoDebt.total_paid)} so'm bekor qilish mumkin!`);
            return;
        }

        const confirmMsg = undoMode === 'undo'
            ? `"${selectedUndoDebt.supplier}" ga qilingan ${formatSum(amount)} so'm to'lovni bekor qilmoqchimisiz?`
            : `"${selectedUndoDebt.supplier}" qarzini ${formatSum(amount)} so'mga o'zgartirmoqchimisiz?`;

        if (!window.confirm(confirmMsg)) return;

        setIsSubmitting(true);
        try {
            await api.post('/api/debts/undo-or-edit', {
                supplier: selectedUndoDebt.supplier,
                supplier_phone: selectedUndoDebt.supplier_phone || null,
                amount,
                mode: undoMode
            });
            alert(undoMode === 'undo' ? "To'lov muvaffaqiyatli bekor qilindi!" : "Qarz muvaffaqiyatli tahrirlandi!");
            setSelectedUndoDebt(null);
            setUndoAmount('');
            const res = await api.get('/api/debts/recent-payments').catch(() => null);
            if (res) setUndoDebtList(res.data?.payments || []);
            else {
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

    const openCustomerDebtsModal = async () => {
        setCustomerDebtsModal(true);
        setCustomerDebtsSearch('');
        setLoadingCustomerDebts(true);
        try {
            const res = await api.get('/api/customer-debts');
            setCustomerDebts(res.data?.debts || []);
        } catch (err) {
            alert(err.response?.data?.message || "Mijoz qarzlarini yuklashda xatolik!");
            setCustomerDebts([]);
        } finally {
            setLoadingCustomerDebts(false);
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

    const openRestoreModal = async () => {
        setRestoreModal(true);
        setRestoreSearch('');
        setLoadingDeleted(true);
        try {
            const res = await api.get('/api/products/deleted');
            setDeletedList(res.data?.products || []);
        } catch (err) {
            alert(err.response?.data?.message || "O'chirilgan tovarlarni yuklashda xatolik!");
            setDeletedList([]);
        } finally {
            setLoadingDeleted(false);
        }
    };

    const handleRestoreProduct = async (deletedId) => {
        if (!window.confirm("Ushbu tovarni omborga qaytarishni tasdiqlaysizmi?")) return;
        setIsSubmitting(true);
        try {
            const res = await api.post('/api/products/restore', { deleted_id: deletedId });
            alert(res.data?.message || "Tovar qaytarildi!");
            const listRes = await api.get('/api/products/deleted');
            setDeletedList(listRes.data?.products || []);
            await fetchData(false);
        } catch (err) {
            alert(err.response?.data?.message || "Qaytarishda xatolik!");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openReturnModal = async () => {
        setReturnSearch('');
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

    const matchesReturnSale = (sale, query) => {
        const q = String(query || '').toLowerCase().trim();
        if (!q) return true;
        const name = String(sale.title || sale.name || '').toLowerCase();
        const size = String(sale.size || '').toLowerCase();
        const color = String(sale.color || '').toLowerCase();
        return name.includes(q) || size.includes(q) || color.includes(q);
    };

    const handleReturnSale = async (saleId) => {
        if (!window.confirm("Ushbu sotuvni vozvrat qilishni tasdiqlaysizmi? Tovar omborga qaytariladi.")) return;
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

    const isExpenseEditable = (expense) => daysSince(expense.created_at) <= EXPENSE_EDIT_WINDOW_DAYS;

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
        if (!editExpenseData.title.trim()) { alert("Rasxod nomini kiriting!"); return; }
        if (!editExpenseData.amount || Number(editExpenseData.amount) <= 0) { alert("Rasxod summasini to'g'ri kiriting!"); return; }

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
        if (!window.confirm("Ushbu rasxodni o'chirishni tasdiqlaysizmi?")) return;
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
        return idStr.includes(query) || nameStr.includes(query) || categoryStr.includes(query) || colorStr.includes(query) || sizesStr.includes(query);
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
                    <p>{subscriptionMessage} To'lov qilganingizdan so'ng saytdan foydalanish huquqiga ega bo'lasiz.</p>
                    <button type="button" className="btn btn-danger" onClick={handleLogout}>🚪 Chiqish</button>
                </div>
            </div>
        );
    }


    const sanitizeFileName = (name) =>
        String(name || 'tovar')
            .replace(/[\\/:*?"<>|]+/g, '_')
            .replace(/\s+/g, '_')
            .slice(0, 80);

    /** Ombordagi barcha tovarlar QR kodlarini qurilmaga PNG qilib saqlaydi */
    const handleSaveAllQrs = async () => {
        const items = [];
        (productGroups || []).forEach((g) => {
            (g.variants || []).forEach((v) => {
                if (!v.qr_token) return;
                const price =
                    v.selling_price != null && v.selling_price !== ''
                        ? Number(v.selling_price)
                        : g.selling_price != null && g.selling_price !== ''
                            ? Number(g.selling_price)
                            : null;
                items.push({
                    token: v.qr_token,
                    name: g.name || 'tovar',
                    size: v.size || 'Standart',
                    local_id: g.local_id,
                    color: g.color || '',
                    selling_price: Number.isFinite(price) ? price : null
                });
            });
        });

        if (items.length === 0) {
            alert("Omborda QR kodi bo'lgan tovar topilmadi!");
            return;
        }

        const ok = window.confirm(
            `Jami ${items.length} ta QR kod qurilmaga saqlanadi.\n\nBrauzer bir nechta fayl yuklashni so'rashi mumkin — ruxsat bering.`
        );
        if (!ok) return;

        setSavingAllQrs(true);
        try {
            // qrcode npm paketi shart emas — tashqi QR API + canvas
            const origin = window.location.origin;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const qrLink = `${origin}/qr/${item.token}`;
                const apiUrl =
                    'https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=' +
                    encodeURIComponent(qrLink);

                const img = await new Promise((resolve, reject) => {
                    const image = new Image();
                    image.crossOrigin = 'anonymous';
                    image.onload = () => resolve(image);
                    image.onerror = () => reject(new Error('QR rasm yuklanmadi'));
                    image.src = apiUrl;
                });

                // Kichikroq QR + kattaroq yozuvlar (ProductQR uslubi)
                const canvas = document.createElement('canvas');
                const padX = 40;
                const padTop = 20;
                const textH = 160;
                const qrDrawSize = 220; // QR ni kichikroq chizamiz
                canvas.width = Math.max(qrDrawSize + padX * 2, 320);
                canvas.height = padTop + qrDrawSize + textH;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const qrX = (canvas.width - qrDrawSize) / 2;
                ctx.drawImage(img, qrX, padTop, qrDrawSize, qrDrawSize);

                const cx = canvas.width / 2;
                let ty = padTop + qrDrawSize + 32;

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Nom — katta
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
                ctx.fillText(String(item.name || '').slice(0, 28), cx, ty, canvas.width - 24);
                ty += 34;

                // Rang
                if (item.color) {
                    ctx.fillStyle = '#64748b';
                    ctx.font = '22px system-ui, -apple-system, sans-serif';
                    ctx.fillText(String(item.color).slice(0, 28), cx, ty, canvas.width - 24);
                    ty += 30;
                }

                // Razmer
                ctx.fillStyle = '#64748b';
                ctx.font = '22px system-ui, -apple-system, sans-serif';
                ctx.fillText(String(item.size || 'Standart'), cx, ty, canvas.width - 24);
                ty += 32;

                // Narx (yashil) — katta
                if (item.selling_price != null) {
                    ctx.fillStyle = '#0f766e';
                    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
                    const priceText = `${formatSum(item.selling_price)} so'm`;
                    ctx.fillText(priceText, cx, ty, canvas.width - 24);
                }

                const finalUrl = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = finalUrl;
                a.download = sanitizeFileName(`${item.local_id}_${item.name}_${item.size}.png`);
                document.body.appendChild(a);
                a.click();
                a.remove();

                await new Promise((r) => setTimeout(r, 350));
            }

            alert(`${items.length} ta QR kod saqlash yakunlandi ✅`);
        } catch (err) {
            console.error(err);
            alert(err?.message || "QR kodlarni saqlashda xatolik!");
        } finally {
            setSavingAllQrs(false);
        }
    };


    const openEnteredListModal = async () => {
        setEnteredListSearch('');
        setEnteredListModal(true);
        setEnteredListLoading(true);
        try {
            const res = await api.get('/api/products/entered');
            setEnteredList(res.data?.products || []);
            if (res.data?.summary) {
                setStats((prev) => ({
                    ...prev,
                    enteredTypes: res.data.summary.enteredTypes ?? prev.enteredTypes,
                    enteredQty: res.data.summary.enteredQty ?? prev.enteredQty,
                    enteredSum: res.data.summary.enteredSum ?? prev.enteredSum
                }));
            }
        } catch (err) {
            alert(err.response?.data?.message || "Kirgan tovarlarni yuklashda xatolik!");
        } finally {
            setEnteredListLoading(false);
        }
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h2>🏬 {stats.storeName || "Mening Do'konim"} Boshqaruv Paneli</h2>
                    <button
                        type="button"
                        className="btn-menu-toggle"
                        onClick={() => setMenuOpen(true)}
                        aria-label="Menyu"
                    >
                        ☰ Menyu
                    </button>
                </div>
            </header>

            {/* O'ngdan ochiladigan amallar menyusi */}
            <div
                className={`side-menu-overlay ${menuOpen ? 'open' : ''}`}
                onClick={() => setMenuOpen(false)}
            />
            <aside className={`side-menu ${menuOpen ? 'open' : ''}`}>
                <div className="side-menu-header">
                    <h3>⚙️ Amallar</h3>
                    <button
                        type="button"
                        className="side-menu-close"
                        onClick={() => setMenuOpen(false)}
                        aria-label="Yopish"
                    >
                        ✕
                    </button>
                </div>
                <div className="side-menu-buttons">
                    <button type="button" onClick={() => { setAddProductModal(true); setMenuOpen(false); }} className="btn btn-add">➕ Tovar Qo'shish</button>
                    <button type="button" onClick={() => { openEditSelectModal(); setMenuOpen(false); }} className="btn btn-edit-product">✏️ Tovarni tahrirlash</button>
                    <button type="button" onClick={() => { setSellModal(true); setMenuOpen(false); }} className="btn btn-sell">🛒 Tovar Sotish</button>
                    <button type="button" onClick={() => { setCreditSellModal(true); setMenuOpen(false); }} className="btn btn-credit-sell">🛒 Nasiyaga sotish</button>
                    <button type="button" onClick={() => { openUndoDebtModal(); setMenuOpen(false); }} className="btn btn-undo-debt">↩️ Qarz to‘lovini bekor qilish</button>
                    <button type="button" onClick={() => { setExpenseModal(true); setMenuOpen(false); }} className="btn btn-expense">💸 Rasxod Yozish</button>
                    <button type="button" onClick={() => { setDeleteModal(true); setMenuOpen(false); }} className="btn btn-delete">🗑️ Tovarni O'chirish</button>
                    <button type="button" onClick={() => { openRestoreModal(); setMenuOpen(false); }} className="btn btn-restore-deleted">↩️ O'chirilganlarni qaytarish</button>
                    <button type="button" onClick={() => { openDebtsModal(); setMenuOpen(false); }} className="btn btn-debts">💳 Qarzlar</button>
                    <button type="button" onClick={() => { openCustomerDebtsModal(); setMenuOpen(false); }} className="btn btn-customer-debts">👥 Qarzga tovar berganlarimiz</button>
                    <button type="button" onClick={() => { openSuppliersModal(); setMenuOpen(false); }} className="btn btn-suppliers">👥 Tovar berganlar</button>
                    <button type="button" onClick={() => { openReturnModal(); setMenuOpen(false); }} className="btn btn-return">↩️ Vozvrat</button>
                    <button type="button" onClick={() => { openExpenseListModal(); setMenuOpen(false); }} className="btn btn-edit-expense">📋 Rasxodlarni taxrirlash</button>
                    <button
                        type="button"
                        onClick={() => { setMenuOpen(false); handleSaveAllQrs(); }}
                        className="btn btn-primary"
                        disabled={savingAllQrs}
                    >
                        {savingAllQrs ? '⏳ QR saqlanmoqda...' : '📲 Barcha QR larni saqlash'}
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); handleLogout(); }} className="btn btn-logout">🚪 Chiqish</button>
                </div>
            </aside>

            <section className="stats-grid">
                <div className="stat-card">
                    <h4>Ombor Holati</h4>
                    <p><b>Jami tovar turi:</b> {stats.totalProducts || 0} xil</p>
                    <p><b>Jami qoldiq:</b> {stats.totalStock || 0} dona</p>
                    <p><b>Ombordagi tovarlar summasi:</b> {formatSum(stats.totalStockValue)} so'm</p>
                </div>
                <div
                    className="stat-card"
                    onClick={openEnteredListModal}
                    style={{ cursor: 'pointer' }}
                    title="Batafsil ro'yxatni ochish"
                >
                    <h4>📥 Do'konga kirgan tovarlar</h4>
                    <p><b>Kirgan turi:</b> {stats.enteredTypes || 0} xil</p>
                    <p><b>Kirgan soni:</b> {stats.enteredQty || 0} dona</p>
                    <p><b>Kirgan summasi:</b> {formatSum(stats.enteredSum)} so'm</p>
                    <p style={{ marginTop: 8, fontSize: 12, color: '#3b82f6' }}>Batafsil → (tugaganlar ham)</p>
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
                    <p><b>Tushum:</b> {formatSum(stats.totalRevenue)} so'm</p>
                    <p><b>Sof Foyda:</b> <span className={(stats.totalProfit || 0) >= 0 ? "profit-plus" : "profit-minus"}>{formatSum(stats.totalProfit)} so'm</span></p>
                </div>
                <div className="stat-card">
                    <h4>💳 Jami Qarzimiz</h4>
                    <p><b>Jami qarz:</b> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatSum(stats.totalDebt || 0)} so'm</span></p>
                </div>
                <div className="stat-card">
                    <h4>👤 Mijozning qarzi</h4>
                    <p><b>Jami mijoz qarzi:</b> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatSum(stats.totalCustomerDebt || 0)} so'm</span></p>
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
                                            <td className="col-hide-mobile">{g.color ? <span className="color-badge">{g.color}</span> : ''}</td>
                                            <td className="col-hide-narrow">{formatSum(g.cost_price)} so'm</td>
                                            <td className="col-hide-mobile">
                                                <div className="size-badge-list">
                                                    {(() => {
                                                        // Bir xil razmerlarni birlashtirish (QR alohida qoladi)
                                                        const sizeMap = {};
                                                        g.variants.forEach((v) => {
                                                            const key = v.size || 'Standart';
                                                            sizeMap[key] = (sizeMap[key] || 0) + (Number(v.quantity) || 0);
                                                        });
                                                        return Object.entries(sizeMap).map(([size, qty]) => (
                                                            <span key={size} className={`size-badge ${qty < 3 ? "size-badge-low" : ""}`}>
                                                                {size}: {qty} ta
                                                            </span>
                                                        ));
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="col-hide-mobile">
                                                <div className="qr-list">
                                                    {g.variants.map((v) => (
                                                        <ProductQR key={v.id} product={{ ...v, name: g.name, color: g.color, local_id: g.local_id, selling_price: v.selling_price ?? g.selling_price }} />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="col-hide-tiny"><b className={totalQty < 5 ? "warning-stock" : ""}>{totalQty} ta</b></td>
                                            <td className="col-details-only">
                                                <div className="product-action-buttons">
                                                    <button type="button" className="btn-details" onClick={() => setDetailsGroup(g)}>🔍 Batafsil</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan="9" className="no-data">Tovar topilmadi!</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ===== NASIYAGA SOTISH MODALI ===== */}
            {creditSellModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header"><h3>🛒 Nasiyaga sotish</h3></div>
                        <form onSubmit={handleCreditSell} className="product-form">
                            <div className="form-group">
                                <label>Tovar nomi bo'yicha qidirish :</label>
                                <input type="text" placeholder="Masalan: Nike, Divan..." value={creditSellSearch} onChange={(e) => setCreditSellSearch(e.target.value)} className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Tovarni tanlang * :</label>
                                <select value={creditSellData.product_id} onChange={(e) => handleCreditSellGroupSelect(e.target.value)} required className="form-input">
                                    <option value="">-- Tovarni tanlang --</option>
                                    {filteredCreditSellGroups.map((g) => (
                                        <option key={g.local_id} value={g.local_id}>
                                            {g.name} {g.color ? `(${g.color})` : ''} — jami: {g.variants.reduce((s, v) => s + v.quantity, 0)} ta
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Mijoz ismi * :</label>
                                <input type="text" placeholder="Masalan: Ali Valiyev" value={creditSellData.customer_name} onChange={(e) => setCreditSellData({ ...creditSellData, customer_name: e.target.value })} required className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Mijoz telefoni * :</label>
                                <input type="text" placeholder="+998 90 123 45 67" value={creditSellData.customer_phone} onChange={(e) => setCreditSellData({ ...creditSellData, customer_phone: e.target.value })} required className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Hozir to‘langan summa (ixtiyoriy) :</label>
                                <input type="number" placeholder="0" value={creditSellData.paid_now} onChange={(e) => setCreditSellData({ ...creditSellData, paid_now: e.target.value })} className="form-input" />
                            </div>

                            {creditSellGroup && (
                                <>
                                    <div className="info-banner info-success">
                                        ✅ Tanlangan: <b>{creditSellGroup.name}</b> ({creditSellGroup.color || 'Rangsiz'})
                                    </div>
                                    {creditSellData.rows.map((row, index) => {
                                        const variant = resolveVariant(creditSellGroup, row);
                                        const usedSizes = usedCreditSellSizes(index);
                                        return (
                                            <div className="cart-row" key={index}>
                                                {creditSellGroup.variants.length > 1 && (
                                                    <div className="form-group">
                                                        <label>Razmer * ({index + 1}-qator) :</label>
                                                        <select value={row.size} onChange={(e) => updateCreditSellRow(index, { size: e.target.value })} required className="form-input">
                                                            <option value="">-- Razmerni tanlang --</option>
                                                            {creditSellGroup.variants.filter((v) => !usedSizes.includes(v.size) || v.size === row.size).map((v) => (
                                                                <option key={v.id} value={v.size || ''}>{v.size || 'Standart'} (Qoldiq: {v.quantity} ta)</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                                {variant && (
                                                    <div className="cart-row-fields">
                                                        <div className="form-group">
                                                            <label>Soni (Dona) * :</label>
                                                            <input type="number" min="1" max={variant.quantity} value={row.sell_quantity} onChange={(e) => updateCreditSellRow(index, { sell_quantity: e.target.value })} required className="form-input" />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Sotish narxi (1 dona) * :</label>
                                                            <input type="number" value={row.selling_price} onChange={(e) => updateCreditSellRow(index, { selling_price: e.target.value })} placeholder="350000" required className="form-input" />
                                                        </div>
                                                    </div>
                                                )}
                                                {creditSellData.rows.length > 1 && (
                                                    <button type="button" onClick={() => removeCreditSellRow(index)} className="btn btn-remove-row">✕ Qatorni olib tashlash</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {canAddMoreCreditSellRows && (
                                        <button type="button" onClick={addCreditSellRow} className="btn btn-add-row">+ Yana razmer qo'shish</button>
                                    )}
                                    {(() => {
                                        const validRows = creditSellData.rows
                                            .map((row) => ({ row, variant: resolveVariant(creditSellGroup, row) }))
                                            .filter(({ variant, row }) => variant && Number(row.selling_price) >= 0 && row.selling_price !== '' && Number(row.sell_quantity) > 0);
                                        if (validRows.length === 0) return null;
                                        const totalRevenue = validRows.reduce((s, { row }) => s + Number(row.selling_price) * Number(row.sell_quantity), 0);
                                        const totalProfit = validRows.reduce((s, { row, variant }) => {
                                            const cost = Number(variant.cost_price ?? creditSellGroup.cost_price ?? 0);
                                            return s + (Number(row.selling_price) - cost) * Number(row.sell_quantity);
                                        }, 0);
                                        const paidNow = Number(creditSellData.paid_now) || 0;
                                        const remainingDebt = Math.max(0, totalRevenue - paidNow);
                                        return (
                                            <div className="calculation-box">
                                                <div className="calc-row"><span>Jami tushum:</span><strong>{formatSum(totalRevenue)} so'm</strong></div>
                                                <div className="calc-row"><span>Hozir to‘langan:</span><strong>{formatSum(paidNow)} so'm</strong></div>
                                                <div className="calc-row"><span>Mijoz qarziga qoladi:</span><strong style={{ color: remainingDebt > 0 ? '#ef4444' : '#16a34a' }}>{formatSum(remainingDebt)} so'm</strong></div>
                                                <div className="calc-row calc-total">
                                                    <span>Kutilayotgan foyda:</span>
                                                    <strong className={totalProfit >= 0 ? "profit-plus" : "profit-minus"}>{totalProfit >= 0 ? '+' : ''}{formatSum(totalProfit)} so'm</strong>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                            <div className="modal-actions">
                                <button type="submit" disabled={isSubmitting || !creditSellGroup} className="btn btn-primary">{isSubmitting ? "Saqlanmoqda..." : "Nasiyaga sotish"}</button>
                                <button type="button" onClick={() => { setCreditSellModal(false); setCreditSellData({ product_id: '', rows: [emptySellRow()], customer_name: '', customer_phone: '', paid_now: '' }); setCreditSellSearch(''); }} className="btn btn-danger">Bekor qilish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== MIJOZ QARZLARI MODALI ===== */}
            {customerDebtsModal && (
                <div className="modal-overlay" onClick={() => setCustomerDebtsModal(false)}>
                    <div className="modal-box" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
                        <h3>👥 Qarzga tovar berganlarimiz</h3>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <input type="text" placeholder="Ism yoki telefon bo‘yicha qidirish..." value={customerDebtsSearch} onChange={(e) => setCustomerDebtsSearch(e.target.value)} className="form-input" />
                        </div>
                        {loadingCustomerDebts ? (
                            <p style={{ textAlign: 'center', padding: '20px' }}>Yuklanmoqda...</p>
                        ) : customerDebts.length === 0 ? (
                            <div className="info-banner">Hozircha hech qanday mijoz qarzi yo‘q ✅</div>
                        ) : (
                            <div className="debts-list">
                                {customerDebts
                                    .filter((d) => {
                                        const q = customerDebtsSearch.toLowerCase().trim();
                                        if (!q) return true;
                                        return (d.customer_name || '').toLowerCase().includes(q) || (d.customer_phone || '').toLowerCase().includes(q);
                                    })
                                    .map((debt, index) => (
                                        <div key={index} className="debt-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                                <strong style={{ fontSize: '16px' }}>👤 {debt.customer_name}</strong>
                                                <span className="debt-amount">{formatSum(debt.debt)} so‘m</span>
                                            </div>
                                            {debt.customer_phone && <div className="debt-phone">📞 {debt.customer_phone}</div>}
                                            <div className="debt-meta">
                                                <span>🛒 {debt.sales_count} ta sotuv</span>
                                                <span>💰 Jami: {formatSum(debt.total_amount)} so‘m</span>
                                                <span>✅ To‘langan: {formatSum(debt.total_paid)} so‘m</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                style={{ marginTop: '14px', width: '100%' }}
                                                onClick={async () => {
                                                    const maxDebt = Number(debt.debt) || 0;
                                                    const input = prompt(`"${debt.customer_name}" dan qancha pul oldingiz?\n\nMaksimal qarz: ${maxDebt.toLocaleString('uz-UZ')} so'm`, maxDebt);
                                                    if (input === null) return;
                                                    const amount = Number(input);
                                                    if (!amount || amount <= 0) { alert("To'g'ri summa kiriting!"); return; }
                                                    if (amount > maxDebt) { alert(`Eng ko'p ${maxDebt.toLocaleString('uz-UZ')} so'm qabul qilish mumkin!`); return; }
                                                    try {
                                                        setLoadingCustomerDebts(true);
                                                        const res = await api.post('/api/customer-debts/pay', {
                                                            customer_name: debt.customer_name,
                                                            customer_phone: debt.customer_phone || '',
                                                            amount
                                                        });
                                                        alert(res.data?.message || "Pul muvaffaqiyatli qabul qilindi!");
                                                        const debtsRes = await api.get('/api/customer-debts');
                                                        setCustomerDebts(debtsRes.data?.debts || []);
                                                        await fetchData(false);
                                                    } catch (err) {
                                                        alert(err.response?.data?.message || "Xatolik yuz berdi!");
                                                    } finally {
                                                        setLoadingCustomerDebts(false);
                                                    }
                                                }}
                                            >
                                                💰 Pul berdi
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button type="button" onClick={() => setCustomerDebtsModal(false)} className="btn btn-danger">Yopish</button>
                        </div>
                    </div>
                </div>
            )}


            {/* ===================== TOVAR TANLASH (TAHRIRLASH) ===================== */}
            {editSelectModal && (
                <div className="modal-overlay" onClick={() => setEditSelectModal(false)}>
                    <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>✏️ Tovarni tahrirlash</h3>
                        </div>
                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                            Faqat oxirgi <b>{PRODUCT_EDIT_WINDOW_DAYS} kun</b> ichida qo&apos;shilgan tovarlar tahrirlanadi.
                        </p>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                            <input
                                type="text"
                                placeholder="Nom, kategoriya yoki rang bo'yicha qidirish..."
                                value={editSelectSearch}
                                onChange={(e) => setEditSelectSearch(e.target.value)}
                                className="form-input"
                                autoFocus
                            />
                        </div>
                        <div className="debts-list" style={{ maxHeight: 420, overflowY: 'auto' }}>
                            {filteredEditGroups.length === 0 ? (
                                <div className="info-banner">Tovar topilmadi</div>
                            ) : (
                                filteredEditGroups.map((g) => {
                                    const editable = isProductEditable(g);
                                    const totalQty = (g.variants || []).reduce((s, v) => s + (Number(v.quantity) || 0), 0);
                                    return (
                                        <div
                                            key={g.local_id}
                                            className="debt-card"
                                            style={{
                                                opacity: editable ? 1 : 0.55,
                                                cursor: editable ? 'pointer' : 'not-allowed'
                                            }}
                                            onClick={() => {
                                                if (editable) openEditProduct(g);
                                            }}
                                        >
                                            <strong>#{g.local_id} — {g.name}</strong>
                                            <div style={{ marginTop: 6, fontSize: 14, color: '#64748b' }}>
                                                {g.category || 'Umumiy'}
                                                {g.color ? ` · ${g.color}` : ''}
                                                {' · '}
                                                {totalQty} dona
                                            </div>
                                            {!editable && (
                                                <div style={{ marginTop: 8, color: '#ef4444', fontSize: 13 }}>
                                                    Muddat o&apos;tgan — tahrirlab bo&apos;lmaydi
                                                </div>
                                            )}
                                            {editable && (
                                                <button
                                                    type="button"
                                                    className="btn btn-primary"
                                                    style={{ marginTop: 10 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditProduct(g);
                                                    }}
                                                >
                                                    Tahrirlash
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="modal-actions">
                            <button type="button" onClick={() => setEditSelectModal(false)} className="btn btn-danger">
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== TOVARNI TAHRIRLASH FORMASI ===================== */}
            {editModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header">
                            <h3>✏️ Tovarni tahrirlash #{editProduct.local_id}</h3>
                        </div>
                        <form onSubmit={handleEditProduct} className="product-form">
                            <div className="form-group">
                                <label>Kategoriya :</label>
                                <input
                                    type="text"
                                    value={editProduct.category}
                                    onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Tovar nomi * :</label>
                                <input
                                    type="text"
                                    value={editProduct.name}
                                    onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Rang :</label>
                                <input
                                    type="text"
                                    value={editProduct.color}
                                    onChange={(e) => setEditProduct({ ...editProduct, color: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Kelgan narxi (Tannarx) * :</label>
                                <input
                                    type="number"
                                    value={editProduct.cost_price}
                                    onChange={(e) => setEditProduct({ ...editProduct, cost_price: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Sotish narxi (ixtiyoriy) :</label>
                                <input
                                    type="number"
                                    value={editProduct.selling_price}
                                    onChange={(e) => setEditProduct({ ...editProduct, selling_price: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Razmerlar (vergul bilan) :</label>
                                <input
                                    type="text"
                                    value={editProduct.sizes}
                                    onChange={(e) => setEditProduct({ ...editProduct, sizes: e.target.value })}
                                    className="form-input"
                                    placeholder="Masalan: 40, 41, 42"
                                />
                            </div>
                            <div className="form-group">
                                <label>Umumiy soni * :</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editProduct.quantity}
                                    onChange={(e) => setEditProduct({ ...editProduct, quantity: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group form-group-image">
                                <label>Tovar rasmi (ixtiyoriy)</label>
                                <div
                                    className={`image-upload-box${editImagePreview ? ' has-preview' : ''}`}
                                    style={
                                        editImagePreview
                                            ? {
                                                position: 'relative',
                                                borderRadius: 16,
                                                overflow: 'hidden',
                                                border: '1px solid #e2e8f0',
                                                background: '#f8fafc',
                                                padding: 12,
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                minHeight: 160
                                            }
                                            : {
                                                borderRadius: 16,
                                                border: '2px dashed #cbd5e1',
                                                background: '#f8fafc',
                                                padding: 24,
                                                textAlign: 'center'
                                            }
                                    }
                                >
                                    {editImagePreview ? (
                                        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                                            <img
                                                src={editImagePreview}
                                                alt="Preview"
                                                className="image-preview"
                                                style={{
                                                    display: 'block',
                                                    maxWidth: '100%',
                                                    maxHeight: 220,
                                                    borderRadius: 12,
                                                    objectFit: 'contain',
                                                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                title="Rasmni olib tashlash"
                                                onClick={() => {
                                                    setEditProduct((prev) => ({ ...prev, image_url: '' }));
                                                    setEditImagePreview('');
                                                    setEditImageFileName('');
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                                    color: '#fff',
                                                    fontSize: 16,
                                                    fontWeight: 700,
                                                    lineHeight: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.45)',
                                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1.08)';
                                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.55)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.45)';
                                                }}
                                            >
                                                ✕
                                            </button>
                                            <label
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    marginTop: 12,
                                                    padding: '8px 14px',
                                                    borderRadius: 10,
                                                    background: '#eff6ff',
                                                    color: '#1d4ed8',
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    border: '1px solid #bfdbfe'
                                                }}
                                            >
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleEditProductImageChange}
                                                    style={{ display: 'none' }}
                                                />
                                                🔄 Rasmni almashtirish
                                            </label>
                                        </div>
                                    ) : (
                                        <label
                                            className="image-upload-label"
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 8,
                                                cursor: 'pointer',
                                                color: '#475569',
                                                fontWeight: 600
                                            }}
                                        >
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleEditProductImageChange}
                                                className="image-upload-input"
                                                style={{ display: 'none' }}
                                            />
                                            <span style={{ fontSize: 32 }}>📷</span>
                                            <span>Rasm tanlash</span>
                                            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>
                                                PNG, JPG — max 8 MB
                                            </span>
                                        </label>
                                    )}
                                </div>
                                {editImageFileName && (
                                    <small style={{ color: '#64748b', display: 'block', marginTop: 8 }}>
                                        {editImageFileName}
                                    </small>
                                )}
                            </div>
                            <div className="modal-actions">
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                                    {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditModal(false);
                                        setEditImagePreview('');
                                        setEditImageFileName('');
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

            {/* ===================== TOVAR QO'SHISH MODALI ===================== */}
            {addProductModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header"><h3>➕ Yangi tovar qo'shish</h3></div>
                        <form onSubmit={handleAddProduct} className="product-form">
                            <div className="form-group">
                                <label>Kategoriya * :</label>
                                <input type="text" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} required className="form-input" placeholder="Masalan: Krasovka, Mayka..." />
                            </div>
                            <div className="form-group">
                                <label>Tovar nomi * :</label>
                                <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} required className="form-input" placeholder="Masalan: Nike Air..." />
                            </div>
                            <div className="form-group">
                                <label>Rang :</label>
                                <input type="text" value={newProduct.color} onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })} className="form-input" placeholder="Masalan: Qora, Oq..." />
                            </div>
                            <div className="form-group">
                                <label>Kelgan narxi (Tannarx) * :</label>
                                <input type="number" value={newProduct.cost_price} onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })} required className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Sotish narxi (ixtiyoriy) :</label>
                                <input type="number" value={newProduct.selling_price} onChange={(e) => setNewProduct({ ...newProduct, selling_price: e.target.value })} className="form-input" />
                            </div>
                            <div className="form-group form-group-image">
                                <label>Tovar rasmi (ixtiyoriy)</label>
                                <div className={`image-upload-box${imagePreview ? ' has-preview' : ''}`}>
                                    <input
                                        id="product-image-input"
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleProductImageChange}
                                        className="image-upload-input"
                                    />
                                    <label htmlFor="product-image-input" className="image-upload-btn">
                                        📷 Rasm tanlash
                                    </label>
                                    <p className="image-upload-hint">
                                        Telegram guruhiga yuboriladi. Katta rasmlar avtomatik siqiladi.
                                    </p>
                                    {imageFileName && (
                                        <p className="image-upload-filename">{imageFileName}</p>
                                    )}
                                    {imagePreview && (
                                        <div className="image-preview-wrap">
                                            <img src={imagePreview} alt="Preview" />
                                            <button
                                                type="button"
                                                className="image-preview-remove"
                                                title="Rasmni olib tashlash"
                                                onClick={() => {
                                                    setImagePreview('');
                                                    setImageFileName('');
                                                    setNewProduct((p) => ({ ...p, image_url: '' }));
                                                    const el = document.getElementById('product-image-input');
                                                    if (el) el.value = '';
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* ===== RAZMERLAR + JAMI SONI ===== */}
                            <div className="form-group">
                                <label>Razmerlar (vergul bilan) :</label>
                                <input
                                    type="text"
                                    value={newProduct.sizes}
                                    onChange={(e) => setNewProduct({ ...newProduct, sizes: e.target.value })}
                                    className="form-input"
                                    placeholder="39, 40, 41, 42 yoki L, M, XL"
                                />
                                <small style={{ color: '#64748b' }}>
                                    Bir nechta razmer bo‘lsa, umumiy son razmerlarga taqsimlanadi.
                                </small>
                            </div>

                            <div className="form-group">
                                <label>Jami soni * :</label>
                                <input
                                    type="number"
                                    value={newProduct.quantity}
                                    onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                                    required
                                    className="form-input"
                                    min="1"
                                />
                            </div>

                            {/* ===== TENG TAQSIMOT PREVIEW / OGOHLANTIRISH ===== */}
                            {(() => {
                                const sizesStr = newProduct.sizes || '';
                                const totalQty = Number(newProduct.quantity) || 0;
                                if (!sizesStr || totalQty <= 0) return null;

                                const sizeList = [];
                                const seen = new Set();
                                sizesStr.split(',').forEach(item => {
                                    const clean = item.trim();
                                    if (clean && !seen.has(clean.toLowerCase())) {
                                        seen.add(clean.toLowerCase());
                                        sizeList.push(clean);
                                    }
                                });

                                if (sizeList.length === 0) return null;

                                if (sizeList.length > totalQty) {
                                    return (
                                        <div style={{
                                            marginTop: 8, marginBottom: 12, padding: '10px 14px',
                                            background: '#fef2f2', border: '1px solid #fecaca',
                                            borderRadius: 10, fontSize: 14, color: '#b91c1c'
                                        }}>
                                            ⚠️ Razmerlar soni ({sizeList.length}) tovar sonidan ({totalQty}) ko‘p!
                                        </div>
                                    );
                                }

                                if (totalQty % sizeList.length !== 0) {
                                    return (
                                        <div style={{
                                            marginTop: 8, marginBottom: 12, padding: '10px 14px',
                                            background: '#fffbeb', border: '1px solid #fde68a',
                                            borderRadius: 10, fontSize: 14, color: '#92400e'
                                        }}>
                                            ℹ️ Son razmerlarga teng bo‘linmaydi. Saqlashda har bir razmer uchun sonni belgilaysiz.
                                        </div>
                                    );
                                }

                                const per = totalQty / sizeList.length;
                                return (
                                    <div style={{
                                        marginTop: 8, marginBottom: 12, padding: '12px 14px',
                                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                                        borderRadius: 10, fontSize: 14
                                    }}>
                                        <div style={{ fontWeight: 600, marginBottom: 6, color: '#166534' }}>
                                            Teng taqsimot:
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                                            {sizeList.map((s, i) => (
                                                <span key={i} style={{ color: '#15803d' }}>
                                                    <b>{s}</b>: {per} ta
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="form-group">
                                <label>To'lov turi * :</label>
                                <select value={newProduct.payment_type} onChange={(e) => setNewProduct({ ...newProduct, payment_type: e.target.value })} className="form-input">
                                    <option value="cash">Naqd</option>
                                    <option value="credit">Nasiya (qarzga)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Kimdan olingan (ixtiyoriy) :</label>
                                <input type="text" value={newProduct.supplier} onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })} className="form-input" placeholder="Masalan: Ali aka..." />
                            </div>
                            <div className="form-group">
                                <label>Telefon (ixtiyoriy) :</label>
                                <input type="text" value={newProduct.supplier_phone} onChange={(e) => setNewProduct({ ...newProduct, supplier_phone: e.target.value })} className="form-input" placeholder="+998..." />
                            </div>
                            {newProduct.payment_type === 'credit' && (
                                <div className="form-group">
                                    <label>Hozir to'langan summa :</label>
                                    <input type="number" value={newProduct.paid_amount} onChange={(e) => setNewProduct({ ...newProduct, paid_amount: e.target.value })} className="form-input" />
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? "Saqlanmoqda..." : "Saqlash"}</button>
                                <button type="button" onClick={() => setAddProductModal(false)} className="btn btn-danger">Bekor qilish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== RAZMER SONLARINI BELGILASH MODALI (Add + Edit) ===== */}
            {sizeDistModal && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>📏 Har bir razmer uchun sonni belgilang</h3>
                        </div>
                        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
                            Umumiy son: <b>{pendingProductData?.totalQty || 0}</b> dona.<br />
                            Har bir razmerga qancha qo‘yishni o‘zingiz yozing. Jami teng bo‘lishi shart.
                        </p>

                        {sizeDistRows.map((row, index) => (
                            <div key={index} className="form-group" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                                <label style={{ minWidth: 80, fontWeight: 600, fontSize: 15 }}>
                                    {row.size || 'Standart'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={row.quantity}
                                    onChange={(e) => {
                                        const next = [...sizeDistRows];
                                        next[index] = { ...next[index], quantity: e.target.value };
                                        setSizeDistRows(next);
                                    }}
                                    className="form-input"
                                    style={{ maxWidth: 120 }}
                                />
                                <span style={{ color: '#64748b' }}>dona</span>
                            </div>
                        ))}

                        <div style={{
                            marginTop: 14,
                            padding: '10px 14px',
                            background: '#f1f5f9',
                            borderRadius: 8,
                            fontWeight: 600,
                            display: 'flex',
                            justifyContent: 'space-between'
                        }}>
                            <span>Jami:</span>
                            <span>
                                {sizeDistRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}
                                {' / '}
                                {pendingProductData?.totalQty || 0} dona
                            </span>
                        </div>

                        <div className="modal-actions" style={{ marginTop: 18 }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                                onClick={async () => {
                                    const total = sizeDistRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
                                    const expected = Number(pendingProductData?.totalQty || 0);

                                    if (total !== expected) {
                                        alert(`Jami son ${expected} ga teng bo‘lishi kerak! Hozir ${total} ta.`);
                                        return;
                                    }
                                    if (total <= 0) {
                                        alert("Kamida 1 ta tovar bo‘lishi kerak!");
                                        return;
                                    }

                                    const size_quantities = sizeDistRows.map(r => ({
                                        size: r.size,
                                        quantity: Number(r.quantity) || 0
                                    }));

                                    if (sizeDistMode === 'add') {
                                        await submitAddProduct({ size_quantities });
                                    } else {
                                        await submitEditProduct({ size_quantities });
                                    }
                                }}
                            >
                                {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => {
                                    setSizeDistModal(false);
                                    setSizeDistRows([]);
                                    setPendingProductData(null);
                                }}
                            >
                                Bekor qilish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== ODDIY SOTISH MODALI ===================== */}
            {sellModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header"><h3>🛒 Tovar sotish</h3></div>
                        <form onSubmit={handleSellProduct} className="product-form">
                            <div className="form-group">
                                <label>Tovar nomi bo'yicha qidirish :</label>
                                <input type="text" placeholder="Masalan: Nike..." value={sellSearch} onChange={(e) => setSellSearch(e.target.value)} className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Tovarni tanlang * :</label>
                                <select value={sellData.product_id} onChange={(e) => handleSellGroupSelect(e.target.value)} required className="form-input">
                                    <option value="">-- Tovarni tanlang --</option>
                                    {filteredSellGroups.map((g) => (
                                        <option key={g.local_id} value={g.local_id}>
                                            {g.name} {g.color ? `(${g.color})` : ''} — jami: {g.variants.reduce((s, v) => s + v.quantity, 0)} ta
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {sellGroup && (
                                <>
                                    <div className="info-banner info-success">✅ Tanlangan: <b>{sellGroup.name}</b></div>
                                    {sellData.rows.map((row, index) => {
                                        const variant = resolveVariant(sellGroup, row);
                                        const usedSizes = usedSellSizes(index);
                                        return (
                                            <div className="cart-row" key={index}>
                                                {sellGroup.variants.length > 1 && (
                                                    <div className="form-group">
                                                        <label>Razmer * :</label>
                                                        <select value={row.size} onChange={(e) => updateSellRow(index, { size: e.target.value })} required className="form-input">
                                                            <option value="">-- Tanlang --</option>
                                                            {sellGroup.variants.filter((v) => !usedSizes.includes(v.size) || v.size === row.size).map((v) => (
                                                                <option key={v.id} value={v.size || ''}>{v.size || 'Standart'} (Qoldiq: {v.quantity})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                                {variant && (
                                                    <div className="cart-row-fields">
                                                        <div className="form-group">
                                                            <label>Soni * :</label>
                                                            <input type="number" min="1" max={variant.quantity} value={row.sell_quantity} onChange={(e) => updateSellRow(index, { sell_quantity: e.target.value })} required className="form-input" />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Sotish narxi * :</label>
                                                            <input type="number" value={row.selling_price} onChange={(e) => updateSellRow(index, { selling_price: e.target.value })} required className="form-input" />
                                                        </div>
                                                    </div>
                                                )}
                                                {sellData.rows.length > 1 && (
                                                    <button type="button" onClick={() => removeSellRow(index)} className="btn btn-remove-row">✕</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {canAddMoreSellRows && <button type="button" onClick={addSellRow} className="btn btn-add-row">+ Yana razmer</button>}
                                    {(() => {
                                        const validRows = sellData.rows
                                            .map((row) => ({ row, variant: resolveVariant(sellGroup, row) }))
                                            .filter(({ variant, row }) => variant && Number(row.selling_price) >= 0 && row.selling_price !== '' && Number(row.sell_quantity) > 0);
                                        if (validRows.length === 0) return null;
                                        const totalQty = validRows.reduce((s, { row }) => s + Number(row.sell_quantity), 0);
                                        const totalRevenue = validRows.reduce((s, { row }) => s + Number(row.selling_price) * Number(row.sell_quantity), 0);
                                        const totalProfit = validRows.reduce((s, { row, variant }) => {
                                            const cost = Number(variant.cost_price ?? sellGroup.cost_price ?? 0);
                                            return s + (Number(row.selling_price) - cost) * Number(row.sell_quantity);
                                        }, 0);
                                        return (
                                            <div className="calculation-box">
                                                <div className="calc-row"><span>Jami soni:</span><strong>{totalQty} dona</strong></div>
                                                <div className="calc-row"><span>Jami tushum:</span><strong>{formatSum(totalRevenue)} so'm</strong></div>
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
                                <button type="submit" disabled={isSubmitting || !sellGroup} className="btn btn-primary">{isSubmitting ? "Saqlanmoqda..." : "Sotish"}</button>
                                <button type="button" onClick={() => { setSellModal(false); setSellData({ product_id: '', rows: [emptySellRow()] }); setSellSearch(''); }} className="btn btn-danger">Bekor qilish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===================== RASXOD YOZISH MODALI ===================== */}
            {expenseModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-header"><h3>💸 Rasxod yozish</h3></div>
                        <form onSubmit={handleAddExpense} className="product-form">
                            <div className="form-group">
                                <label>Rasxod nomi * :</label>
                                <input type="text" value={expenseData.title} onChange={(e) => setExpenseData({ ...expenseData, title: e.target.value })} required className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Summa * :</label>
                                <input type="number" value={expenseData.amount} onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })} required className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Turi :</label>
                                <select value={expenseData.expense_type} onChange={(e) => setExpenseData({ ...expenseData, expense_type: e.target.value })} className="form-input">
                                    <option value="daily">Kunlik</option>
                                    <option value="monthly">Oylik</option>
                                    <option value="other">Boshqa</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? "Saqlanmoqda..." : "Saqlash"}</button>
                                <button type="button" onClick={() => setExpenseModal(false)} className="btn btn-danger">Bekor qilish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===================== TOVARNI O'CHIRISH MODALI ===================== */}
            {deleteModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header"><h3>🗑️ Tovarni o'chirish / kamaytirish</h3></div>
                        <form onSubmit={handleDeleteProduct} className="product-form">
                            <div className="form-group">
                                <label>Tovar nomi bo'yicha qidirish :</label>
                                <input type="text" value={deleteSearch} onChange={(e) => setDeleteSearch(e.target.value)} className="form-input" placeholder="Masalan: Oscar, Nike..." />
                            </div>
                            <div className="form-group">
                                <label>Tovarni tanlang * :</label>
                                <select value={deleteData.product_id} onChange={(e) => handleDeleteGroupSelect(e.target.value)} required className="form-input">
                                    <option value="">-- Tanlang --</option>
                                    {filteredDeleteGroups.map((g) => (
                                        <option key={g.local_id} value={g.local_id}>
                                            {g.name} {g.color ? `(${g.color})` : ''} — jami: {g.variants.reduce((s, v) => s + v.quantity, 0)} ta
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {deleteGroup && (
                                <>
                                    <div className="info-banner info-success">
                                        ✅ Tanlangan: <b>{deleteGroup.name}</b> {deleteGroup.color ? `(${deleteGroup.color})` : ''}
                                    </div>
                                    {deleteData.rows.map((row, index) => {
                                        const variant = resolveVariant(deleteGroup, row);
                                        const usedSizes = usedDeleteSizes(index);
                                        return (
                                            <div className="cart-row" key={index}>
                                                {deleteGroup.variants.length > 1 && (
                                                    <div className="form-group">
                                                        <label>Razmer * ({index + 1}-qator) :</label>
                                                        <select value={row.size} onChange={(e) => updateDeleteRow(index, { size: e.target.value })} required className="form-input">
                                                            <option value="">-- Razmerni tanlang --</option>
                                                            {deleteGroup.variants.filter((v) => !usedSizes.includes(v.size) || v.size === row.size).map((v) => (
                                                                <option key={v.id} value={v.size || ''}>{v.size || 'Standart'} (Qoldiq: {v.quantity} ta)</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                                {variant && (
                                                    <div className="cart-row-fields">
                                                        <div className="form-group">
                                                            <label>Olib tashlanadigan son * :</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={variant.quantity}
                                                                value={row.quantity_to_remove}
                                                                onChange={(e) => updateDeleteRow(index, { quantity_to_remove: e.target.value, remove_all: false })}
                                                                disabled={row.remove_all}
                                                                className="form-input"
                                                            />
                                                        </div>
                                                        <div className="form-group" style={{ marginTop: 8 }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={row.remove_all}
                                                                    onChange={(e) => updateDeleteRow(index, {
                                                                        remove_all: e.target.checked,
                                                                        quantity_to_remove: e.target.checked ? variant.quantity : row.quantity_to_remove
                                                                    })}
                                                                />
                                                                Hammasini o'chirish ({variant.quantity} ta)
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                                {deleteData.rows.length > 1 && (
                                                    <button type="button" onClick={() => removeDeleteRow(index)} className="btn btn-remove-row">✕ Qatorni olib tashlash</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {canAddMoreDeleteRows && (
                                        <button type="button" onClick={addDeleteRow} className="btn btn-add-row">+ Yana razmer qo'shish</button>
                                    )}
                                </>
                            )}
                            <div className="modal-actions">
                                <button type="submit" disabled={isSubmitting || !deleteGroup} className="btn btn-primary">{isSubmitting ? "Bajarilmoqda..." : "Bajarish"}</button>
                                <button type="button" onClick={() => { setDeleteModal(false); setDeleteData({ product_id: '', rows: [emptyDeleteRow()] }); setDeleteSearch(''); }} className="btn btn-danger">Bekor qilish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===================== VOZVRAT MODALI ===================== */}
            {returnModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header"><h3>↩️ Vozvrat</h3></div>

                        <div className="form-group" style={{ marginBottom: 12 }}>
                            <input
                                type="text"
                                placeholder="Nom, rang yoki razmer bo‘yicha qidirish..."
                                value={returnSearch}
                                onChange={(e) => setReturnSearch(e.target.value)}
                                className="form-input"
                                autoFocus
                            />
                        </div>

                        {salesLoading ? <p>Yuklanmoqda...</p> : (
                            <div className="debts-list">
                                {(() => {
                                    const list = (salesList || [])
                                        .filter((s) => !s.returned)
                                        .filter((s) => matchesReturnSale(s, returnSearch));

                                    if (list.length === 0) {
                                        return (
                                            <div className="info-banner">
                                                {returnSearch.trim()
                                                    ? 'Qidiruv bo‘yicha sotuv topilmadi'
                                                    : "Vozvrat qilinadigan sotuv yo'q"}
                                            </div>
                                        );
                                    }

                                    return list.map((sale) => (
                                        <div key={sale.id} className="debt-card">
                                            {sale.image_url && (
                                                <img
                                                    src={sale.image_url}
                                                    alt={sale.title}
                                                    style={{
                                                        width: '100%',
                                                        maxHeight: 180,
                                                        objectFit: 'contain',
                                                        borderRadius: 10,
                                                        marginBottom: 10
                                                    }}
                                                />
                                            )}
                                            <strong>{sale.title}</strong>
                                            <div>
                                                {sale.size || 'Standart'}
                                                {sale.color ? ` · ${sale.color}` : ''}
                                                {' — '}
                                                {sale.quantity} dona — {formatSum(sale.selling_price)} so'm
                                            </div>
                                            <div style={{ fontSize: 13, color: '#64748b' }}>
                                                {new Date(sale.sold_at).toLocaleString('uz-UZ')}
                                            </div>
                                            {isSaleReturnable(sale) ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-primary"
                                                    style={{ marginTop: 10 }}
                                                    onClick={() => handleReturnSale(sale.id)}
                                                    disabled={isSubmitting}
                                                >
                                                    Vozvrat qilish
                                                </button>
                                            ) : (
                                                <span style={{ color: '#ef4444', fontSize: 13 }}>Muddat o'tgan</span>
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button
                                type="button"
                                onClick={() => {
                                    setReturnModal(false);
                                    setReturnSearch('');
                                }}
                                className="btn btn-danger"
                            >
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== QARZLAR (SUPPLIER) MODALI ===================== */}
            {debtsModal && (
                <div className="modal-overlay" onClick={() => setDebtsModal(false)} style={{ zIndex: 9999 }}>
                    <div className="modal-box" style={{ maxWidth: 720, zIndex: 10000 }} onClick={(e) => e.stopPropagation()}>
                        <h3>💳 Qarzlar (Tovar berganlar)</h3>

                        <div className="form-group" style={{ marginBottom: 12 }}>
                            <input
                                type="text"
                                placeholder="Ism yoki telefon bo‘yicha qidirish..."
                                value={debtsSearch}
                                onChange={(e) => setDebtsSearch(e.target.value)}
                                className="form-input"
                            />
                        </div>

                        {loadingDebts ? (
                            <p style={{ textAlign: 'center', padding: 20 }}>Yuklanmoqda...</p>
                        ) : debts.length === 0 ? (
                            <div className="info-banner">Hozircha hech qanday qarz yo‘q ✅</div>
                        ) : (
                            <div className="debts-list">
                                {debts
                                    .filter((d) => {
                                        const q = debtsSearch.toLowerCase().trim();
                                        if (!q) return true;
                                        const name = (d.supplier || '').toLowerCase();
                                        const phone = (d.supplier_phone || '').toLowerCase();
                                        return name.includes(q) || phone.includes(q);
                                    })
                                    .map((debt, index) => (
                                        <div key={index} className="debt-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                                <strong style={{ fontSize: 16 }}>{debt.supplier}</strong>
                                                <span className="debt-amount" style={{ background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: 8, fontWeight: 700 }}>
                                                    {formatSum(debt.debt)} so‘m
                                                </span>
                                            </div>

                                            {debt.supplier_phone && (
                                                <div className="debt-phone" style={{ marginTop: 6 }}>📞 {debt.supplier_phone}</div>
                                            )}

                                            {(debt.categories || []).length > 0 && (
                                                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {debt.categories.map((cat, i) => (
                                                        <span key={i} style={{
                                                            background: '#e0f2fe',
                                                            color: '#0369a1',
                                                            padding: '2px 10px',
                                                            borderRadius: 20,
                                                            fontSize: 12,
                                                            fontWeight: 500
                                                        }}>
                                                            {cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                                                Jami tannarx: {formatSum(debt.total_cost)} • To‘langan: {formatSum(debt.total_paid)}
                                            </div>

                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                style={{ marginTop: 14, width: '100%', background: '#16a34a' }}
                                                onClick={async () => {
                                                    const maxDebt = Number(debt.debt) || 0;
                                                    const input = prompt(
                                                        `"${debt.supplier}" ga qancha to‘laysiz?\n\nMaksimal qarz: ${maxDebt.toLocaleString('uz-UZ')} so'm`,
                                                        maxDebt
                                                    );
                                                    if (input === null) return;

                                                    const amount = Number(input);
                                                    if (!amount || amount <= 0) {
                                                        alert("To‘g‘ri summa kiriting!");
                                                        return;
                                                    }
                                                    if (amount > maxDebt) {
                                                        alert(`Eng ko‘p ${maxDebt.toLocaleString('uz-UZ')} so'm to‘lash mumkin!`);
                                                        return;
                                                    }

                                                    try {
                                                        setLoadingDebts(true);
                                                        await api.post('/api/debts/pay', {
                                                            supplier: debt.supplier,
                                                            supplier_phone: debt.supplier_phone || '',
                                                            amount
                                                        });
                                                        alert("To‘lov muvaffaqiyatli qabul qilindi!");
                                                        const res = await api.get('/api/debts');
                                                        setDebts(res.data?.debts || []);
                                                        await fetchData(false);
                                                    } catch (err) {
                                                        alert(err.response?.data?.message || "Xatolik yuz berdi!");
                                                    } finally {
                                                        setLoadingDebts(false);
                                                    }
                                                }}
                                            >
                                                💰 Pul berdim
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button type="button" onClick={() => setDebtsModal(false)} className="btn btn-danger">
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== TOVAR BERGANLAR MODALI ===================== */}
            {suppliersModal && (
                <div className="modal-overlay" onClick={() => setSuppliersModal(false)}>
                    <div className="modal-box" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
                        <h3>👥 Tovar berganlar</h3>
                        <input
                            type="text"
                            placeholder="Ism, telefon yoki kategoriya bo'yicha qidirish..."
                            value={suppliersSearch}
                            onChange={(e) => setSuppliersSearch(e.target.value)}
                            className="form-input"
                            style={{ marginBottom: 12 }}
                        />
                        {loadingSuppliers ? (
                            <p style={{ textAlign: 'center', padding: 20 }}>Yuklanmoqda...</p>
                        ) : (suppliersList || []).length === 0 ? (
                            <div className="info-banner">Hali hech kimdan tovar olinmagan</div>
                        ) : (
                            <div className="debts-list">
                                {(suppliersList || [])
                                    .filter((s) => {
                                        const q = suppliersSearch.toLowerCase().trim();
                                        if (!q) return true;
                                        const name = (s.supplier || s.name || '').toLowerCase();
                                        const phone = (s.supplier_phone || '').toLowerCase();
                                        const cats = (s.categories || []).join(' ').toLowerCase();
                                        return name.includes(q) || phone.includes(q) || cats.includes(q);
                                    })
                                    .map((s, i) => {
                                        const categories = s.categories || [];
                                        return (
                                            <div key={i} className="debt-card">
                                                <strong style={{ fontSize: 16 }}>{s.supplier || s.name}</strong>
                                                {s.supplier_phone && (
                                                    <div style={{ marginTop: 4 }}>📞 {s.supplier_phone}</div>
                                                )}
                                                {categories.length > 0 && (
                                                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                        {categories.map((cat, idx) => (
                                                            <span
                                                                key={idx}
                                                                style={{
                                                                    background: '#e0f2fe',
                                                                    color: '#0369a1',
                                                                    padding: '3px 10px',
                                                                    borderRadius: 20,
                                                                    fontSize: 13,
                                                                    fontWeight: 500
                                                                }}
                                                            >
                                                                {cat}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button type="button" onClick={() => setSuppliersModal(false)} className="btn btn-danger">
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== QARZ TO'LOVINI BEKOR QILISH MODALI ===================== */}
            {undoDebtModal && (
                <div className="modal-overlay" onClick={() => setUndoDebtModal(false)}>
                    <div className="modal-box" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
                        <h3>↩️ Qarz to‘lovini bekor qilish / tahrirlash</h3>
                        <input type="text" placeholder="Qidirish..." value={undoDebtSearch} onChange={(e) => setUndoDebtSearch(e.target.value)} className="form-input" style={{ marginBottom: 12 }} />
                        {loadingUndoDebts ? <p>Yuklanmoqda...</p> : (
                            <div className="debts-list">
                                {(undoDebtList || []).filter(d => {
                                    const q = undoDebtSearch.toLowerCase();
                                    if (!q) return true;
                                    return (d.supplier || '').toLowerCase().includes(q);
                                }).map((debt, i) => (
                                    <div key={i} className="debt-card" style={{ cursor: 'pointer', border: selectedUndoDebt === debt ? '2px solid #3b82f6' : undefined }} onClick={() => setSelectedUndoDebt(debt)}>
                                        <strong>{debt.supplier}</strong>
                                        <div>To'langan: {formatSum(debt.total_paid || debt.paid || 0)} so'm</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedUndoDebt && (
                            <div style={{ marginTop: 16 }}>
                                <div className="form-group">
                                    <label>Amal turi:</label>
                                    <select value={undoMode} onChange={(e) => setUndoMode(e.target.value)} className="form-input">
                                        <option value="undo">To'lovni bekor qilish</option>
                                        <option value="edit">Summani tahrirlash</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Summa:</label>
                                    <input type="number" value={undoAmount} onChange={(e) => setUndoAmount(e.target.value)} className="form-input" />
                                </div>
                                <button type="button" className="btn btn-primary" onClick={handleUndoOrEditDebt} disabled={isSubmitting}>
                                    {isSubmitting ? "Bajarilmoqda..." : "Bajarish"}
                                </button>
                            </div>
                        )}
                        <div className="modal-actions">
                            <button type="button" onClick={() => setUndoDebtModal(false)} className="btn btn-danger">Yopish</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== RASXODLARNI TAHRIRLASH RO'YXATI ===================== */}
            {expenseListModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-wide">
                        <div className="modal-header"><h3>📋 Rasxodlarni tahrirlash</h3></div>
                        {expensesLoading ? <p>Yuklanmoqda...</p> : (
                            <div className="debts-list">
                                {expensesList.map((exp) => (
                                    <div key={exp.id} className="debt-card">
                                        <strong>{exp.title}</strong>
                                        <div>{formatSum(exp.amount)} so'm — {formatExpenseType(exp.expense_type)}</div>
                                        <div style={{ fontSize: 13, color: '#64748b' }}>{new Date(exp.created_at).toLocaleString('uz-UZ')}</div>
                                        {isExpenseEditable(exp) && (
                                            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                                                <button type="button" className="btn btn-primary" onClick={() => openEditExpense(exp)}>Tahrirlash</button>
                                                <button type="button" className="btn btn-danger" onClick={() => handleDeleteExpense(exp.id)}>O'chirish</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button type="button" onClick={() => setExpenseListModal(false)} className="btn btn-danger">Yopish</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== RASXODNI TAHRIRLASH MODALI ===================== */}
            {editExpenseModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-header"><h3>✏️ Rasxodni tahrirlash</h3></div>
                        <form onSubmit={handleEditExpense} className="product-form">
                            <div className="form-group">
                                <label>Nomi * :</label>
                                <input type="text" value={editExpenseData.title} onChange={(e) => setEditExpenseData({ ...editExpenseData, title: e.target.value })} required className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Summa * :</label>
                                <input type="number" value={editExpenseData.amount} onChange={(e) => setEditExpenseData({ ...editExpenseData, amount: e.target.value })} required className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Turi :</label>
                                <select value={editExpenseData.expense_type} onChange={(e) => setEditExpenseData({ ...editExpenseData, expense_type: e.target.value })} className="form-input">
                                    <option value="daily">Kunlik</option>
                                    <option value="monthly">Oylik</option>
                                    <option value="other">Boshqa</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? "Saqlanmoqda..." : "Saqlash"}</button>
                                <button type="button" onClick={() => setEditExpenseModal(false)} className="btn btn-danger">Bekor qilish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===================== O'CHIRILGAN TOVARLARNI QAYTARISH ===================== */}
            {restoreModal && (
                <div className="modal-overlay" onClick={() => setRestoreModal(false)}>
                    <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>↩️ O'chirilgan tovarlarni qaytarish</h3>
                        </div>
                        <p className="restore-hint">
                            Faqat oxirgi <b>7 kun</b> ichida o'chirilgan tovarlar qaytariladi.
                        </p>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                            <input
                                type="text"
                                placeholder="Nomi, razmer yoki kategoriya bo'yicha qidirish..."
                                value={restoreSearch}
                                onChange={(e) => setRestoreSearch(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        {loadingDeleted ? (
                            <p style={{ textAlign: 'center', padding: 24 }}>Yuklanmoqda...</p>
                        ) : deletedList.length === 0 ? (
                            <div className="info-banner">7 kun ichida o'chirilgan tovar yo'q ✅</div>
                        ) : (
                            <div className="debts-list restore-list">
                                {deletedList
                                    .filter((p) => {
                                        const q = restoreSearch.toLowerCase().trim();
                                        if (!q) return true;
                                        return (
                                            (p.name || '').toLowerCase().includes(q) ||
                                            (p.size || '').toLowerCase().includes(q) ||
                                            (p.category || '').toLowerCase().includes(q) ||
                                            (p.color || '').toLowerCase().includes(q) ||
                                            String(p.local_id || '').includes(q)
                                        );
                                    })
                                    .map((p) => (
                                        <div key={p.id} className="debt-card restore-card">
                                            <div className="restore-card-top">
                                                <strong>#{p.local_id} — {p.name}</strong>
                                                <span className="restore-date">
                                                    {new Date(p.deleted_at).toLocaleString('uz-UZ')}
                                                </span>
                                            </div>
                                            <div className="restore-meta">
                                                <span>📏 {p.size || 'Standart'}</span>
                                                <span>🎨 {p.color || '—'}</span>
                                                <span>📦 {p.quantity} dona</span>
                                                <span>💰 {formatSum(p.cost_price)} so'm</span>
                                            </div>
                                            {p.category && <span className="category-badge">{p.category}</span>}
                                            <button
                                                type="button"
                                                className="btn btn-restore-action"
                                                disabled={isSubmitting}
                                                onClick={() => handleRestoreProduct(p.id)}
                                            >
                                                ↩️ Omborga qaytarish
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button type="button" onClick={() => setRestoreModal(false)} className="btn btn-danger">
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== BATAFSIL MODALI ===================== */}

            {/* ===================== DO'KONGA KIRGAN TOVARLAR RO'YXATI ===================== */}
            {enteredListModal && (
                <div className="modal-overlay" onClick={() => setEnteredListModal(false)}>
                    <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📥 Do&apos;konga kirgan barcha tovarlar</h3>
                        </div>
                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                            Ombor + to&apos;liq sotilgan + o&apos;chirilganlar. Oldingi tovarlar ham shu yerda.
                        </p>
                        <input
                            type="text"
                            placeholder="Nom, kategoriya, rang yoki ID..."
                            value={enteredListSearch}
                            onChange={(e) => setEnteredListSearch(e.target.value)}
                            className="form-input"
                            style={{ marginBottom: 12 }}
                        />
                        {enteredListLoading ? (
                            <p style={{ textAlign: 'center', padding: 24 }}>Yuklanmoqda...</p>
                        ) : (
                            <div className="debts-list" style={{ maxHeight: 480, overflowY: 'auto' }}>
                                {(() => {
                                    const q = enteredListSearch.toLowerCase().trim();
                                    const list = (enteredList || []).filter((p) => {
                                        if (!q) return true;
                                        return (
                                            String(p.name || '').toLowerCase().includes(q) ||
                                            String(p.category || '').toLowerCase().includes(q) ||
                                            String(p.color || '').toLowerCase().includes(q) ||
                                            String(p.local_id || '').includes(q) ||
                                            (p.sizes || []).join(' ').toLowerCase().includes(q)
                                        );
                                    });
                                    if (list.length === 0) {
                                        return <div className="info-banner">Ma&apos;lumot topilmadi</div>;
                                    }
                                    return list.map((p) => (
                                        <div key={p.local_id} className="debt-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                                                <strong>#{p.local_id} — {p.name}</strong>
                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        padding: '4px 10px',
                                                        borderRadius: 20,
                                                        background: p.status === 'omborda' ? '#dcfce7' : '#fee2e2',
                                                        color: p.status === 'omborda' ? '#166534' : '#991b1b',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {p.status === 'omborda' ? 'Omborda' : "To'liq sotilgan / tugagan"}
                                                </span>
                                            </div>
                                            <div style={{ marginTop: 8, fontSize: 14, color: '#64748b' }}>
                                                {p.category || '—'}
                                                {p.color && p.color !== '—' ? ` · ${p.color}` : ''}
                                                {(p.sizes || []).length > 0 ? ` · ${p.sizes.join(', ')}` : ''}
                                            </div>
                                            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 14 }}>
                                                <div><b>Kirgan:</b> {p.entered_qty} dona</div>
                                                <div><b>Qoldiq:</b> {p.remaining_qty} dona</div>
                                                <div><b>Sotilgan:</b> {p.sold_qty} dona</div>
                                                <div><b>Summa:</b> {formatSum(p.entered_sum)} so&apos;m</div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button type="button" onClick={() => setEnteredListModal(false)} className="btn btn-danger">
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {detailsGroup && (
                <div className="modal-overlay" onClick={() => setDetailsGroup(null)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3>🔍 {detailsGroup.name}</h3>
                        <p><b>ID:</b> #{detailsGroup.local_id}</p>
                        <p><b>Kategoriya:</b> {detailsGroup.category || 'Umumiy'}</p>
                        <p><b>Rang:</b> {detailsGroup.color || '-'}</p>
                        <p><b>Tannarx:</b> {formatSum(detailsGroup.cost_price)} so'm</p>
                        <p><b>Razmerlar:</b></p>
                        <ul>
                            {detailsGroup.variants.map((v) => (
                                <li key={v.id}>{v.size || 'Standart'}: {v.quantity} ta</li>
                            ))}
                        </ul>
                        {detailsGroup.variants?.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <p><b>QR kodlar:</b></p>
                                <div className="qr-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                                    {detailsGroup.variants.map((v) => (
                                        <ProductQR
                                            key={v.id}
                                            product={{
                                                ...v,
                                                name: detailsGroup.name,
                                                color: detailsGroup.color,
                                                local_id: detailsGroup.local_id,
                                                selling_price: v.selling_price ?? detailsGroup.selling_price
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="modal-actions">
                            <button type="button" onClick={() => setDetailsGroup(null)} className="btn btn-danger">Yopish</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DashboardPage;