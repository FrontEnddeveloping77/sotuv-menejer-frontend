import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QRActionPage from './pages/QRActionPage';

// Login qilinmagan bo'lsa, hozirgi URL'ni saqlab login sahifasiga yo'naltiradi
function RequireAuth({ children }) {
    const token = localStorage.getItem('token');
    const location = useLocation();

    if (!token) {
        // QR URL'ni saqlab qo'yamiz — login bo'lganidan keyin qaytib kelsin
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}

function AppRoutes() {
    const [token, setToken] = useState(() => localStorage.getItem('token'));

    useEffect(() => {
        const syncAuth = () => setToken(localStorage.getItem('token'));
        window.addEventListener('storage', syncAuth);
        window.addEventListener('auth-changed', syncAuth);
        return () => {
            window.removeEventListener('storage', syncAuth);
            window.removeEventListener('auth-changed', syncAuth);
        };
    }, []);

    return (
        <Routes>
                <Route
                    path="/"
                    element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
                />

                <Route path="/login" element={<LoginPage />} />

                {/* QR route — login qilinmagan bo'lsa DARHOL login sahifasiga */}
                <Route
                    path="/qr/:token"
                    element={
                        <RequireAuth>
                            <QRActionPage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/dashboard"
                    element={
                        token ? (
                            <DashboardPage />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AppRoutes />
        </Router>
    );
}

export default App;
