import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/login.css';

const BASE_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://api.sotuvmenejer.uz');
const fallbackTariffs = [1000, 2000, 3000, 4000, 5000].flatMap((max_products) => [
    { max_products, max_groups: 1, group_label: '1 ta guruh', price: 299000 + ((max_products / 1000 - 1) * 130000) },
    { max_products, max_groups: 2, group_label: '2 ta guruh', price: 339000 + ((max_products / 1000 - 1) * 130000) },
    { max_products, max_groups: 5, group_label: '3-5 ta guruh', price: 399000 + ((max_products / 1000 - 1) * 130000) }
]);

const formatPrice = (value) => Number(value || 0).toLocaleString('uz-UZ');

const LoginPage = () => {
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({
        full_name: '',
        login: '',
        password: '',
        max_products: 1000,
        max_groups: 1,
        returns_enabled: true,
        start_trial: false
    });
    const [tariffs, setTariffs] = useState(fallbackTariffs);
    const [payment, setPayment] = useState({});
    const [registrationToken, setRegistrationToken] = useState('');
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [receipt, setReceipt] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [notice, setNotice] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = location.state?.from?.pathname || '/dashboard';

    useEffect(() => {
        fetch(`${BASE_URL}/api/public/pricing`)
            .then((response) => response.ok ? response.json() : Promise.reject(new Error('pricing')))
            .then((data) => {
                if (Array.isArray(data.tariffs) && data.tariffs.length) setTariffs(data.tariffs);
                setPayment(data.payment || {});
            })
            .catch(() => {
                setErrorMessage('Server bilan bog‘lanib bo‘lmadi. Backend server ishga tushganini tekshiring.');
            });
    }, []);

    const selectedTariff = useMemo(
        () => tariffs.find((item) =>
            Number(item.max_products) === Number(form.max_products) &&
            Number(item.max_groups) === Number(form.max_groups)
        ),
        [tariffs, form.max_products, form.max_groups]
    );

    const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

    const submitLogin = async (event) => {
        event.preventDefault();
        setErrorMessage('');
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: form.login, password: form.password })
            });
            const data = await response.json();
            if (!response.ok || !data.token) {
                throw new Error(data.message || 'Login yoki parol xato.');
            }
            localStorage.setItem('token', data.token);
            window.dispatchEvent(new Event('auth-changed'));
            navigate(redirectTo, { replace: true });
        } catch (error) {
            setErrorMessage(error.message || 'Server bilan bog‘lanishda xatolik yuz berdi.');
        } finally {
            setLoading(false);
        }
    };

    const submitRegistration = async (event) => {
        event.preventDefault();
        setErrorMessage('');
        setNotice('');
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Akkaunt yaratilmadi.');
            if (data.token) {
                localStorage.setItem('token', data.token);
                window.dispatchEvent(new Event('auth-changed'));
                navigate('/dashboard', { replace: true });
                return;
            }
            setRegistrationToken(data.registration_token);
            setPaymentAmount(data.payment?.amount || selectedTariff?.price || 0);
            setPayment(data.payment || payment);
            setMode('payment');
            setNotice(data.message);
        } catch (error) {
            setErrorMessage(error.message || 'Akkaunt yaratishda xatolik yuz berdi.');
        } finally {
            setLoading(false);
        }
    };

    const submitReceipt = async (event) => {
        event.preventDefault();
        if (!receipt) return setErrorMessage('Avval chek rasmini tanlang.');
        setLoading(true);
        setErrorMessage('');
        try {
            const receiptData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Chekni o‘qib bo‘lmadi.'));
                reader.readAsDataURL(receipt);
            });
            const response = await fetch(`${BASE_URL}/api/payment-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registration_token: registrationToken, receipt_data: receiptData })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Chek yuborilmadi.');
            setNotice(data.message);
            setReceipt(null);
        } catch (error) {
            setErrorMessage(error.message || 'Chek yuborishda xatolik yuz berdi.');
        } finally {
            setLoading(false);
        }
    };

    if (mode === 'payment') {
        return (
            <main className="login-container">
                <section className="login-card payment-card">
                    <h1>To‘lovni yakunlash</h1>
                    <p className="login-subtitle">Tanlangan tarif: <b>{formatPrice(paymentAmount)} so‘m/oy</b></p>
                    {notice && <div className="success-message">{notice}</div>}
                    <p className="flow-note">Akkaunt ma’lumotlari serverga saqlandi. To‘lov tasdiqlangach shu login bilan kirasiz; Telegram guruhini botdagi guruh ulash jarayoni orqali akkauntingizga bog‘laysiz.</p>
                    <div className="payment-box">
                        {payment.payment_link && <a className="login-button payment-link" href={payment.payment_link} target="_blank" rel="noreferrer">To‘lov ilovasini ochish</a>}
                        {payment.card_number && (
                            <>
                                <p>Karta raqami</p>
                                <button type="button" className="copy-card" onClick={() => navigator.clipboard.writeText(payment.card_number)}>
                                    {payment.card_number} <span>Nusxalash</span>
                                </button>
                                {payment.card_owner && <small>Karta egasi: {payment.card_owner}</small>}
                            </>
                        )}
                        {!payment.card_number && !payment.payment_link && <p>To‘lov rekvizitlari hozircha sozlanmagan. Admin bilan bog‘laning.</p>}
                    </div>
                    <form onSubmit={submitReceipt}>
                        <label className="file-label">To‘lov chekini yuborish
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setReceipt(event.target.files?.[0] || null)} required />
                        </label>
                        <button className="login-button" disabled={loading}>{loading ? 'Yuborilmoqda...' : 'Chekni yuborish'}</button>
                    </form>
                    <button className="text-button" type="button" onClick={() => setMode('login')}>Kirish sahifasiga qaytish</button>
                    {errorMessage && <div className="error-message">{errorMessage}</div>}
                </section>
            </main>
        );
    }

    return (
        <main className="login-container">
            <section className="login-card onboarding-card">
                <h1>Sotuv Menejer</h1>
                <p className="login-subtitle">{mode === 'login' ? 'Hisobingizga kiring' : 'Yangi hisob uchun ma’lumotlarni kiriting'}</p>
                <div className="auth-tabs">
                    <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setErrorMessage(''); }}>Kirish</button>
                    <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setErrorMessage(''); }}>Ro‘yxatdan o‘tish</button>
                </div>
                {errorMessage && <div className="error-message">{errorMessage}</div>}
                {mode === 'login' ? (
                    <form onSubmit={submitLogin}>
                        <label>Login<input className="login-input" value={form.login} onChange={(e) => update('login', e.target.value)} required /></label>
                        <label>Parol<div className="password-wrap"><input className="login-input" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} required /><button className="password-toggle" type="button" aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? '◉' : '◌'}</button></div></label>
                        <button className="login-button" disabled={loading}>{loading ? 'Kirilmoqda...' : 'Kirish'}</button>
                    </form>
                ) : (
                    <form onSubmit={submitRegistration}>
                        <label>Ism yoki do‘kon nomi<input className="login-input" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required /></label>
                        <label>Yangi login<input className="login-input" pattern="[a-zA-Z0-9_]{4,32}" value={form.login} onChange={(e) => update('login', e.target.value)} required /></label>
                        <label>Yangi parol<div className="password-wrap"><input className="login-input" type={showPassword ? 'text' : 'password'} minLength="8" value={form.password} onChange={(e) => update('password', e.target.value)} required /><button className="password-toggle" type="button" aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? '◉' : '◌'}</button></div></label>
                        <label>Tovar limiti<select className="login-input" value={form.max_products} onChange={(e) => update('max_products', Number(e.target.value))}>{[1000, 2000, 3000, 4000, 5000].map((item) => <option key={item} value={item}>{formatPrice(item)} tagacha ID</option>)}</select></label>
                        <label>Telegram guruhlar soni<select className="login-input" value={form.max_groups} onChange={(e) => update('max_groups', Number(e.target.value))}><option value="1">1 ta guruh</option><option value="2">2 ta guruh</option><option value="5">3-5 ta guruh</option></select></label>
                        <div className="tariff-preview">Tanlangan tarif: <b>{formatPrice(selectedTariff?.price)} so‘m/oy</b><small>7 kun sinovdan keyin to‘lov qilinadi.</small></div>
                        <label className="checkbox-label"><input type="checkbox" checked={form.returns_enabled} onChange={(e) => update('returns_enabled', e.target.checked)} /> Tovar qaytarilishini qabul qilaman</label>
                        <label className="checkbox-label"><input type="checkbox" checked={form.start_trial} onChange={(e) => update('start_trial', e.target.checked)} /> 7 kun bepul sinovni boshlash</label>
                        <button className="login-button" disabled={loading}>{loading ? 'Davom etilmoqda...' : form.start_trial ? 'Sinovni boshlash' : 'Davom etish'}</button>
                        <a className="special-tariff-link" href={payment.admin_url || 'https://t.me/ABDULAZIZ_AVAZOV'} target="_blank" rel="noreferrer">5 000+ ID yoki 5+ guruh uchun admin bilan bog‘lanish</a>
                    </form>
                )}
            </section>
        </main>
    );
};

export default LoginPage;
