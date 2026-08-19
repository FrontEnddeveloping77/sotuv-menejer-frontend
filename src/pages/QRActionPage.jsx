import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/qr-action.css';

const BASE_URL =
    import.meta.env.VITE_API_URL ||
    'https://sotuv-menejer-backend.onrender.com';

const api = axios.create({
    baseURL: BASE_URL
});

const money = (value) =>
    Number(value || 0).toLocaleString('uz-UZ');

export default function QRActionPage() {
    const { token } = useParams();

    const [product, setProduct] = useState(null);
    const [mode, setMode] = useState('choice');

    // Seller kiritadigan SOTILGAN SUMMA
    const [soldAmount, setSoldAmount] = useState('');

    // Nasiyaga sotish uchun
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paidNow, setPaidNow] = useState('');

    // Tahrirlash uchun
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');
    const [editCost, setEditCost] = useState('');
    const [editSize, setEditSize] = useState('');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    // -----------------------------------------
    // QR orqali mahsulotni olish
    // -----------------------------------------

    useEffect(() => {
        api.get(`/api/qr/${token}`)
            .then((res) => {
                const p = res.data.product;
                setProduct(p);
                // Tahrirlash formasi uchun boshlang'ich qiymatlar
                setEditName(p.name || '');
                setEditColor(p.color || '');
                setEditCost(p.cost_price || '');
                setEditSize(p.size || '');
            })
            .catch((err) => {
                setError(
                    err.response?.data?.message ||
                    'QR kodi topilmadi!'
                );
            })
            .finally(() => {
                setLoading(false);
            });
    }, [token]);

    // -----------------------------------------
    // O'CHIRISH
    // -----------------------------------------

    const handleDelete = async () => {
        const confirmed = window.confirm(
            'Bu tovarni ombordan butunlay chiqarishni tasdiqlaysizmi?'
        );

        if (!confirmed) return;

        setSubmitting(true);
        setError('');

        try {
            const res = await api.post(
                `/api/qr/${token}/delete`
            );

            setResult({
                type: 'delete',
                message: res.data.message
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'O‘chirishda xatolik yuz berdi!'
            );
        } finally {
            setSubmitting(false);
        }
    };

    // -----------------------------------------
    // SOTISH
    // -----------------------------------------

    const handleSell = async (event) => {
        event.preventDefault();

        const amount = Number(
            String(soldAmount).replace(/\s/g, '')
        );

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            setError(
                'Sotilgan summani to‘g‘ri kiriting!'
            );
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const res = await api.post(
                `/api/qr/${token}/sell`,
                {
                    selling_price: amount
                }
            );

            setResult({
                type: 'sell',
                data: res.data
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Sotuvda xatolik yuz berdi!'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreditSell = async (event) => {
        event.preventDefault();
        const amount = Number(String(soldAmount).replace(/\s/g, ''));
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Sotilgan summani to‘g‘ri kiriting!');
            return;
        }
        if (!customerName.trim()) { setError('Mijoz ismini kiriting!'); return; }
        if (!customerPhone.trim()) { setError('Mijoz telefonini kiriting!'); return; }

        setSubmitting(true);
        setError('');
        try {
            const res = await api.post(`/api/qr/${token}/sell-credit`, {
                selling_price: amount,
                customer_name: customerName.trim(),
                customer_phone: customerPhone.trim(),
                paid_now: Number(paidNow) || 0
            });
            setResult({ type: 'credit-sell', data: res.data });
        } catch (err) {
            setError(err.response?.data?.message || 'Nasiyaga sotishda xatolik!');
        } finally {
            setSubmitting(false);
        }
    };

    // -----------------------------------------
    // Rasm komponenti (agar image_url bo'lsa)
    // -----------------------------------------

    const ProductImage = ({ src, alt, style }) => {
        if (!src) return null;
        return (
            <div
                style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 16,
                    ...style
                }}
            >
                <img
                    src={src}
                    alt={alt || 'Tovar rasmi'}
                    style={{
                        maxWidth: '100%',
                        maxHeight: 220,
                        objectFit: 'contain',
                        borderRadius: 14,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
            </div>
        );
    };

    // -----------------------------------------
    // YUKLANMOQDA
    // -----------------------------------------

    if (loading) {
        return (
            <main className="qr-page">
                <div className="qr-card">
                    <div className="qr-spinner" />
                    <p>Ma’lumot yuklanmoqda...</p>
                </div>
            </main>
        );
    }

    // -----------------------------------------
    // QR TOPILMADI
    // -----------------------------------------

    if (error && !product) {
        return (
            <main className="qr-page">
                <div className="qr-card">
                    <div className="qr-icon">⚠️</div>
                    <h2>QR kodi topilmadi</h2>
                    <p>{error}</p>
                </div>
            </main>
        );
    }

    // -----------------------------------------
    // NATIJA
    // -----------------------------------------

    if (result) {
        if (result.type === 'sell' || result.type === 'credit-sell') {
            const data = result.data;
            const imgSrc =
                data.product?.image_url ||
                product?.image_url ||
                null;

            return (
                <main className="qr-page">
                    <div className="qr-card success-card">
                        <div className="success-icon">✓</div>
                        <h2>
                            {result.type === 'credit-sell'
                                ? 'Nasiyaga sotildi!'
                                : 'Sotuv muvaffaqiyatli!'}
                        </h2>

                        <ProductImage
                            src={imgSrc}
                            alt={data.product?.name || product?.name}
                        />

                        <p>
                            {data.product?.name || product.name}
                            {' — '}
                            {data.product?.size || product.size || 'Standart'}
                        </p>

                        {result.type === 'credit-sell' && data.customer_name && (
                            <div style={{ marginBottom: 12, padding: 12, background: '#f0f9ff', borderRadius: 10 }}>
                                <div>👤 {data.customer_name}</div>
                                {data.customer_phone && <div>📞 {data.customer_phone}</div>}
                                {data.paid_now > 0 && <div>💵 Hozir to‘langan: {money(data.paid_now)} so‘m</div>}
                            </div>
                        )}

                        <div className="result-grid">
                            <span>Sotilgan summa</span>
                            <b>{money(data.selling_price)} so‘m</b>

                            <span>Kelgan narxi</span>
                            <b>{money(data.product?.cost_price || product.cost_price)} so‘m</b>

                            <span>{(data.profit ?? 0) >= 0 ? 'Foyda' : 'Ziyon'}</span>
                            <b>{money(Math.abs(data.profit ?? 0))} so‘m</b>

                            <span>Qoldiq</span>
                            <b>{data.remaining_quantity ?? 0} dona</b>
                        </div>

                        <div
                            style={{
                                marginTop: '20px',
                                padding: '14px',
                                borderRadius: '12px',
                                background: (data.profit ?? 0) >= 0 ? '#e8f7ee' : '#fdecec',
                                textAlign: 'center'
                            }}
                        >
                            {(data.profit ?? 0) >= 0
                                ? '📈 Foydali sotuv'
                                : '📉 Ziyon bilan sotuv'}
                        </div>
                    </div>
                </main>
            );
        }

        if (result.type === 'edit') {
            return (
                <main className="qr-page">
                    <div className="qr-card success-card">
                        <div className="success-icon">✏️</div>
                        <h2>Tovar tahrirlandi!</h2>
                        <p>{result.message}</p>
                        <button
                            className="qr-primary"
                            style={{ marginTop: 16 }}
                            onClick={() => {
                                setResult(null);
                                setMode('choice');
                            }}
                        >
                            Ortga qaytish
                        </button>
                    </div>
                </main>
            );
        }

        return (
            <main className="qr-page">
                <div className="qr-card success-card">
                    <div className="success-icon">🗑️</div>
                    <h2>Tovar o‘chirildi!</h2>
                    <ProductImage src={product?.image_url} alt={product?.name} />
                    <p>{result.message}</p>
                </div>
            </main>
        );
    }

    // -----------------------------------------
    // FOYDA PREVIEW
    // -----------------------------------------

    const profitPreview =
        soldAmount === ''
            ? null
            : Number(soldAmount) - Number(product.cost_price || 0);

    // -----------------------------------------
    // ASOSIY QR OYNASI
    // -----------------------------------------

    return (
        <main className="qr-page">
            <div className="qr-card">

                <div className="qr-icon">📦</div>
                <div className="qr-label">OMBORDAGI TOVAR</div>

                {/* Tovar rasmi (agar mavjud bo'lsa) */}
                <ProductImage src={product.image_url} alt={product.name} />

                <h1>{product.name}</h1>

                <div className="product-details">
                    <span>🆔 #{product.local_id}</span>
                    <span>📏 {product.size || 'Standart'}</span>
                    <span>🎨 {product.color || 'Ko‘rsatilmagan'}</span>
                    <span>📦 {product.quantity} dona</span>
                </div>

                <div className="cost-box">
                    💰 Kelgan narxi:{' '}
                    <b>{money(product.cost_price)} so‘m</b>
                </div>

                {error && (
                    <div className="qr-error">⚠️ {error}</div>
                )}

                {/* ===================== TANLOV ===================== */}
                {mode === 'choice' && (
                    <div className="qr-actions">

                        <button
                            className="qr-action delete"
                            onClick={() => setMode('delete')}
                        >
                            🗑️
                            <span>O‘chirib yuborish</span>
                            <small>Tovarni ombordan chiqarish</small>
                        </button>

                        <button
                            className="qr-action sell"
                            onClick={() => {
                                setMode('sell');
                                setSoldAmount('');
                                setError('');
                            }}
                        >
                            💰
                            <span>Sotish</span>
                            <small>1 dona sotuvini qayd etish</small>
                        </button>

                        <button
                            className="qr-action"
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff' }}
                            onClick={() => {
                                setMode('credit-sell');
                                setSoldAmount('');
                                setCustomerName('');
                                setCustomerPhone('');
                                setPaidNow('');
                                setError('');
                            }}
                        >
                            🛒
                            <span>Nasiyaga sotish</span>
                            <small>Mijozga qarzga berish</small>
                        </button>
                    </div>
                )}

                {/* ===================== O'CHIRISH ===================== */}
                {mode === 'delete' && (
                    <div className="qr-confirm">
                        <h3>🗑️ O‘chirishni tasdiqlang</h3>
                        <ProductImage
                            src={product.image_url}
                            alt={product.name}
                            style={{ marginTop: 8, marginBottom: 12 }}
                        />
                        <p>
                            Bu QR kodga biriktirilgan{' '}
                            <b>{product.name}</b> tovar qatori ombordan
                            butunlay chiqariladi.
                        </p>
                        <div className="confirm-actions">
                            <button
                                className="qr-secondary"
                                onClick={() => setMode('choice')}
                                disabled={submitting}
                            >
                                Ortga
                            </button>
                            <button
                                className="qr-danger"
                                onClick={handleDelete}
                                disabled={submitting}
                            >
                                {submitting ? 'O‘chirilmoqda...' : 'Ha, o‘chirilsin'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ===================== SOTISH ===================== */}
                {mode === 'sell' && (
                    <form className="qr-sell-form" onSubmit={handleSell}>
                        <h3>💰 Tovarni sotish</h3>
                        <ProductImage
                            src={product.image_url}
                            alt={product.name}
                            style={{ marginBottom: 12 }}
                        />
                        <p style={{ marginBottom: '15px' }}>
                            <b>{product.name}</b> — {product.size || 'Standart'}
                        </p>

                        <div className="cost-box">
                            💰 Kelgan narxi: <b>{money(product.cost_price)} so‘m</b>
                        </div>

                        <label>💵 Sotilgan summa</label>
                        <input
                            autoFocus
                            type="number"
                            min="1"
                            step="1"
                            value={soldAmount}
                            onChange={(e) => setSoldAmount(e.target.value)}
                            placeholder="Masalan: 250000"
                            required
                            disabled={submitting}
                        />

                        {profitPreview !== null && (
                            <div className={profitPreview >= 0 ? 'profit-preview positive' : 'profit-preview negative'}>
                                {profitPreview >= 0 ? '📈 Kutilayotgan foyda' : '📉 Kutilayotgan ziyon'}:{' '}
                                <b>{money(Math.abs(profitPreview))} so‘m</b>
                            </div>
                        )}

                        <div className="confirm-actions">
                            <button
                                type="button"
                                className="qr-secondary"
                                onClick={() => {
                                    setMode('choice');
                                    setSoldAmount('');
                                    setError('');
                                }}
                                disabled={submitting}
                            >
                                Ortga
                            </button>
                            <button type="submit" className="qr-primary" disabled={submitting}>
                                {submitting ? 'Saqlanmoqda...' : '✅ Sotishni tasdiqlash'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ===================== NASIYAGA SOTISH ===================== */}
                {mode === 'credit-sell' && (
                    <form className="qr-sell-form" onSubmit={handleCreditSell}>
                        <h3>🛒 Nasiyaga sotish</h3>
                        <ProductImage
                            src={product.image_url}
                            alt={product.name}
                            style={{ marginBottom: 12 }}
                        />
                        <p style={{ marginBottom: '15px' }}>
                            <b>{product.name}</b> — {product.size || 'Standart'}
                        </p>

                        <div className="cost-box">
                            💰 Kelgan narxi: <b>{money(product.cost_price)} so‘m</b>
                        </div>

                        <label>👤 Mijoz ismi *</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Ali Valiyev"
                            required
                            disabled={submitting}
                        />

                        <label>📞 Mijoz telefoni *</label>
                        <input
                            type="text"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="+998 90 123 45 67"
                            required
                            disabled={submitting}
                        />

                        <label>💵 Sotilgan summa *</label>
                        <input
                            type="number"
                            min="1"
                            value={soldAmount}
                            onChange={(e) => setSoldAmount(e.target.value)}
                            placeholder="250000"
                            required
                            disabled={submitting}
                        />

                        <label>💰 Hozir to‘langan (ixtiyoriy)</label>
                        <input
                            type="number"
                            min="0"
                            value={paidNow}
                            onChange={(e) => setPaidNow(e.target.value)}
                            placeholder="0"
                            disabled={submitting}
                        />

                        {profitPreview !== null && (
                            <div className={profitPreview >= 0 ? 'profit-preview positive' : 'profit-preview negative'}>
                                {profitPreview >= 0 ? '📈 Kutilayotgan foyda' : '📉 Kutilayotgan ziyon'}:{' '}
                                <b>{money(Math.abs(profitPreview))} so‘m</b>
                            </div>
                        )}

                        <div className="confirm-actions">
                            <button
                                type="button"
                                className="qr-secondary"
                                onClick={() => {
                                    setMode('choice');
                                    setSoldAmount('');
                                    setCustomerName('');
                                    setCustomerPhone('');
                                    setPaidNow('');
                                    setError('');
                                }}
                                disabled={submitting}
                            >
                                Ortga
                            </button>
                            <button type="submit" className="qr-primary" disabled={submitting}>
                                {submitting ? 'Saqlanmoqda...' : '✅ Nasiyaga sotish'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}