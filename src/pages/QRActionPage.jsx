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
                setProduct(res.data.product);
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

    // -----------------------------------------
    // YUKLANMOQDA
    // -----------------------------------------

    if (loading) {
        return (
            <main className="qr-page">
                <div className="qr-card">
                    <div className="qr-spinner" />

                    <p>
                        Ma’lumot yuklanmoqda...
                    </p>
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
                    <div className="qr-icon">
                        ⚠️
                    </div>

                    <h2>
                        QR kodi topilmadi
                    </h2>

                    <p>
                        {error}
                    </p>
                </div>
            </main>
        );
    }

    // -----------------------------------------
    // NATIJA
    // -----------------------------------------

    if (result) {
        const isSell =
            result.type === 'sell';

        if (isSell) {
            const data = result.data;

            return (
                <main className="qr-page">
                    <div className="qr-card success-card">

                        <div className="success-icon">
                            ✓
                        </div>

                        <h2>
                            Sotuv muvaffaqiyatli!
                        </h2>

                        <p>
                            {data.product.name}
                            {' — '}
                            {data.product.size ||
                                'Standart'}
                        </p>

                        <div className="result-grid">

                            <span>
                                Sotilgan summa
                            </span>

                            <b>
                                {money(
                                    data.selling_price
                                )}{' '}
                                so‘m
                            </b>

                            <span>
                                Kelgan narxi
                            </span>

                            <b>
                                {money(
                                    data.product
                                        .cost_price
                                )}{' '}
                                so‘m
                            </b>

                            <span>
                                {data.profit >= 0
                                    ? 'Foyda'
                                    : 'Ziyon'}
                            </span>

                            <b>
                                {money(
                                    Math.abs(
                                        data.profit
                                    )
                                )}{' '}
                                so‘m
                            </b>

                            <span>
                                Qoldiq
                            </span>

                            <b>
                                {data.remaining_quantity}{' '}
                                dona
                            </b>

                        </div>

                        <div
                            style={{
                                marginTop: '20px',
                                padding: '14px',
                                borderRadius: '12px',
                                background:
                                    data.profit >= 0
                                        ? '#e8f7ee'
                                        : '#fdecec',
                                textAlign: 'center'
                            }}
                        >
                            {data.profit >= 0
                                ? '📈 Foydali sotuv'
                                : '📉 Ziyon bilan sotuv'}
                        </div>

                    </div>
                </main>
            );
        }

        return (
            <main className="qr-page">
                <div className="qr-card success-card">

                    <div className="success-icon">
                        🗑️
                    </div>

                    <h2>
                        Tovar o‘chirildi!
                    </h2>

                    <p>
                        {result.message}
                    </p>

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
            : Number(soldAmount) -
            Number(product.cost_price || 0);

    // -----------------------------------------
    // ASOSIY QR OYNASI
    // -----------------------------------------

    return (
        <main className="qr-page">

            <div className="qr-card">

                <div className="qr-icon">
                    📦
                </div>

                <div className="qr-label">
                    OMBORDAGI TOVAR
                </div>

                <h1>
                    {product.name}
                </h1>

                <div className="product-details">

                    <span>
                        🆔 #{product.local_id}
                    </span>

                    <span>
                        📏 {product.size ||
                            'Standart'}
                    </span>

                    <span>
                        🎨 {product.color ||
                            'Ko‘rsatilmagan'}
                    </span>

                    <span>
                        📦 {product.quantity}{' '}
                        dona
                    </span>

                </div>

                {/* KELGAN NARXI */}

                <div className="cost-box">
                    💰 Kelgan narxi:{' '}
                    <b>
                        {money(
                            product.cost_price
                        )}{' '}
                        so‘m
                    </b>
                </div>

                {error && (
                    <div className="qr-error">
                        ⚠️ {error}
                    </div>
                )}

                {/* -------------------------------- */}
                {/* TANLOV */}
                {/* -------------------------------- */}

                {mode === 'choice' && (
                    <div className="qr-actions">

                        <button
                            className="qr-action delete"
                            onClick={() =>
                                setMode('delete')
                            }
                        >
                            🗑️

                            <span>
                                O‘chirib yuborish
                            </span>

                            <small>
                                Tovarni ombordan
                                chiqarish
                            </small>
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

                            <span>
                                Sotish
                            </span>

                            <small>
                                1 dona sotuvini
                                qayd etish
                            </small>
                        </button>

                    </div>
                )}

                {/* -------------------------------- */}
                {/* O'CHIRISH */}
                {/* -------------------------------- */}

                {mode === 'delete' && (
                    <div className="qr-confirm">

                        <h3>
                            🗑️ O‘chirishni
                            tasdiqlang
                        </h3>

                        <p>
                            Bu QR kodga biriktirilgan{' '}
                            <b>
                                {product.name}
                            </b>{' '}
                            tovar qatori ombordan
                            butunlay chiqariladi.
                        </p>

                        <div className="confirm-actions">

                            <button
                                className="qr-secondary"
                                onClick={() =>
                                    setMode('choice')
                                }
                                disabled={submitting}
                            >
                                Ortga
                            </button>

                            <button
                                className="qr-danger"
                                onClick={
                                    handleDelete
                                }
                                disabled={submitting}
                            >
                                {submitting
                                    ? 'O‘chirilmoqda...'
                                    : 'Ha, o‘chirilsin'}
                            </button>

                        </div>

                    </div>
                )}

                {/* -------------------------------- */}
                {/* SOTISH */}
                {/* -------------------------------- */}

                {mode === 'sell' && (
                    <form
                        className="qr-sell-form"
                        onSubmit={handleSell}
                    >

                        <h3>
                            💰 Tovarni sotish
                        </h3>

                        <p
                            style={{
                                marginBottom:
                                    '15px'
                            }}
                        >
                            <b>
                                {product.name}
                            </b>

                            {' — '}

                            {product.size ||
                                'Standart'}
                        </p>

                        {/* KELGAN NARXI */}

                        <div className="cost-box">
                            💰 Kelgan narxi:{' '}
                            <b>
                                {money(
                                    product.cost_price
                                )}{' '}
                                so‘m
                            </b>
                        </div>

                        {/* SELLER KIRITADIGAN SUMMA */}

                        <label>
                            💵 Sotilgan summa
                        </label>

                        <input
                            autoFocus
                            type="number"
                            min="1"
                            step="1"
                            value={soldAmount}
                            onChange={(e) =>
                                setSoldAmount(
                                    e.target.value
                                )
                            }
                            placeholder="Masalan: 250000"
                            required
                            disabled={submitting}
                        />

                        {/* FOYDA PREVIEW */}

                        {profitPreview !==
                            null && (
                                <div
                                    className={
                                        profitPreview >=
                                            0
                                            ? 'profit-preview positive'
                                            : 'profit-preview negative'
                                    }
                                >
                                    {profitPreview >=
                                        0
                                        ? '📈 Kutilayotgan foyda'
                                        : '📉 Kutilayotgan ziyon'}
                                    :{' '}
                                    <b>
                                        {money(
                                            Math.abs(
                                                profitPreview
                                            )
                                        )}{' '}
                                        so‘m
                                    </b>
                                </div>
                            )}

                        <div className="confirm-actions">

                            <button
                                type="button"
                                className="qr-secondary"
                                onClick={() => {
                                    setMode(
                                        'choice'
                                    );
                                    setSoldAmount(
                                        ''
                                    );
                                    setError('');
                                }}
                                disabled={submitting}
                            >
                                Ortga
                            </button>

                            <button
                                type="submit"
                                className="qr-primary"
                                disabled={
                                    submitting
                                }
                            >
                                {submitting
                                    ? 'Saqlanmoqda...'
                                    : '✅ Sotishni tasdiqlash'}
                            </button>

                        </div>

                    </form>
                )}

            </div>

        </main>
    );
}