'use client';

import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { useEffect } from 'react';

function ThemeInitializer() {
    useEffect(() => {
        const saved = localStorage.getItem('dualmind_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
    }, []);
    return null;
}

export default function Providers({ children }) {
    return (
        <AuthProvider>
            <ThemeInitializer />
            <Navbar />
            <main>{children}</main>
        </AuthProvider>
    );
}