import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {
    const token = localStorage.getItem('token');

    return (
        <Router>
            <Routes>
                {/* Odatiy asosiy yo'l */}
                <Route
                    path="/"
                    element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
                />

                {/* Login sahifasi */}
                <Route path="/login" element={<LoginPage />} />

                {/* Dashboard sahifasi */}
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

                {/* Boshqa barcha xato yo'llarni loginga yo'naltirish */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;