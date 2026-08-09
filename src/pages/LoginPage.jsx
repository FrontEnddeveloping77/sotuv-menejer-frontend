import React, { useState } from 'react';
import '../styles/login.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setLoading(true);

        // Vercel'dagi VITE_API_URL o'qiladi, topilmasa Render havolasiga murojaat qiladi
        const BASE_URL = import.meta.env.VITE_API_URL || 'https://sotuv-menejer-backend.onrender.com';

        try {
            // Dynamic API URL orqali so'rov yuboriladi
            const res = await fetch(`${BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ login: username, password }),
            });

            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem('token', data.token);
                window.location.href = '/dashboard';
            } else {
                setErrorMessage(data.message || 'Login yoki parol xato!');
            }
        } catch (err) {
            console.error('Login xatosi:', err);
            setErrorMessage('Server bilan bog‘lanishda xatolik yuz berdi!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f1f5f9'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                padding: '32px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <h2 style={{ marginBottom: '8px', color: '#0f172a', textAlign: 'center' }}>
                    Tizimga kirish
                </h2>
                <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', marginBottom: '24px' }}>
                    Telegram bot bergan login va parolizni kiriting.
                </p>

                {errorMessage && (
                    <div style={{
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        marginBottom: '16px',
                        border: '1px solid #fecaca'
                    }}>
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                            Login:
                        </label>
                        <input
                            type="text"
                            placeholder="user883513"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '15px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                            Parol:
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '15px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '8px',
                            padding: '12px',
                            backgroundColor: '#0369a1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {loading ? 'Kirilmoqda...' : 'Kirish'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;