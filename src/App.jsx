import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QRActionPage from './pages/QRActionPage';

function App() {
    const token = localStorage.getItem('token');

    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
                />

                <Route path="/login" element={<LoginPage />} />

                <Route path="/qr/:token" element={<QRActionPage />} />

                <Route
                    path="/dashboard"
                    element={
                        localStorage.getItem('token') ? (
                            <DashboardPage />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
