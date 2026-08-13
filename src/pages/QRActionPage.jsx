import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/qr-action.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://sotuv-menejer-backend.onrender.com';
const api = axios.create({ baseURL: BASE_URL });
const money = (v) => Number(v || 0).toLocaleString('uz-UZ');

export default function QRActionPage() {
    const { token } = useParams();
    const [product, setProduct] = useState(null);
    const [mode, setMode] = useState('choice');
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => {
        api.get(`/api/qr/${token}`)
            .then((res) => setProduct(res.data.product))
            .catch((err) => setError(err.response?.data?.message || 'QR kodi topilmadi!'))
            .finally(() => setLoading(false));
    }, [token]);

    const handleDelete = async () => {
        if (!window.confirm('Bu tovarni ombordan butunlay chiqarishni tasdiqlaysizmi?')) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await api.post(`/api/qr/${token}/delete`);
            setResult({ type: 'delete', message: res.data.message });
        } catch (err) {
            setError(err.response?.data?.message || 'O‘chirishda xatolik yuz berdi!');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSell = async (e) => {
        e.preventDefault();
        const sellingPrice = Number(price);
        if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
            setError('Sotuv narxini to‘g‘ri kiriting!');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const res = await api.post(`/api/qr/${token}/sell`, { selling_price: sellingPrice });
            setResult({ type: 'sell', data: res.data });
        } catch (err) {
            setError(err.response?.data?.message || 'Sotuvda xatolik yuz berdi!');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <main className="qr-page"><div className="qr-card"><div className="qr-spinner" /> <p>Ma’lumot yuklanmoqda...</p></div></main>;
    if (error && !product) return <main className="qr-page"><div className="qr-card"><div className="qr-icon">⚠️</div><h2>QR kodi topilmadi</h2><p>{error}</p></div></main>;
    if (result) {
        const isSell = result.type === 'sell';
        return <main className="qr-page"><div className="qr-card success-card">
            <div className="success-icon">{isSell ? '✓' : '🗑️'}</div>
            <h2>{isSell ? 'Sotuv muvaffaqiyatli!' : 'Tovar o‘chirildi!'}</h2>
            {isSell ? <>
                <p>{result.data.product.name} — {result.data.product.size || 'Standart'}</p>
                <div className="result-grid">
                    <span>Sotuv narxi</span><b>{money(result.data.selling_price)} so‘m</b>
                    <span>Tannarx</span><b>{money(result.data.product.cost_price)} so‘m</b>
                    <span>{result.data.profit >= 0 ? 'Foyda' : 'Ziyon'}</span><b>{money(Math.abs(result.data.profit))} so‘m</b>
                    <span>Qoldiq</span><b>{result.data.remaining_quantity} dona</b>
                </div>
            </> : <p>{result.message}</p>}
        </div></main>;
    }

    const profitPreview = price === '' ? null : Number(price) - Number(product.cost_price || 0);

    return <main className="qr-page">
        <div className="qr-card">
            <div className="qr-icon">📦</div>
            <div className="qr-label">OMBORDAGI TOVAR</div>
            <h1>{product.name}</h1>
            <div className="product-details">
                <span>🆔 #{product.local_id}</span>
                <span>📏 {product.size || 'Standart'}</span>
                <span>🎨 {product.color || 'Ko‘rsatilmagan'}</span>
                <span>📦 {product.quantity} dona</span>
            </div>
            <div className="cost-box">Tannarx: <b>{money(product.cost_price)} so‘m</b></div>

            {error && <div className="qr-error">⚠️ {error}</div>}

            {mode === 'choice' && <div className="qr-actions">
                <button className="qr-action delete" onClick={() => setMode('delete')}>🗑️ <span>O‘chirib yuborish</span><small>Tovarni ombordan chiqarish</small></button>
                <button className="qr-action sell" onClick={() => setMode('sell')}>💰 <span>Sotish</span><small>1 dona sotuvini qayd etish</small></button>
            </div>}

            {mode === 'delete' && <div className="qr-confirm">
                <h3>🗑️ O‘chirishni tasdiqlang</h3>
                <p>Bu QR kodga biriktirilgan <b>{product.name}</b> tovar qatori ombordan butunlay chiqariladi.</p>
                <div className="confirm-actions"><button className="qr-secondary" onClick={() => setMode('choice')} disabled={submitting}>Ortga</button><button className="qr-danger" onClick={handleDelete} disabled={submitting}>{submitting ? 'O‘chirilmoqda...' : 'Ha, o‘chirilsin'}</button></div>
            </div>}

            {mode === 'sell' && <form className="qr-sell-form" onSubmit={handleSell}>
                <h3>💰 Sotuv narxini kiriting</h3>
                <label>Sotilgan narx (1 dona)</label>
                <input autoFocus type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Masalan: 350000" required />
                {profitPreview !== null && <div className={profitPreview >= 0 ? 'profit-preview positive' : 'profit-preview negative'}>{profitPreview >= 0 ? '📈 Kutilayotgan foyda' : '📉 Kutilayotgan ziyon'}: <b>{money(Math.abs(profitPreview))} so‘m</b></div>}
                <div className="confirm-actions"><button type="button" className="qr-secondary" onClick={() => setMode('choice')} disabled={submitting}>Ortga</button><button type="submit" className="qr-primary" disabled={submitting}>{submitting ? 'Saqlanmoqda...' : 'Tasdiqlash'}</button></div>
            </form>}
        </div>
    </main>;
}
