'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('researchmind_token');
        const savedUser = localStorage.getItem('researchmind_user');
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('researchmind_token');
                localStorage.removeItem('researchmind_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('researchmind_token', data.data.token);
        localStorage.setItem('researchmind_user', JSON.stringify(data.data.user));
        setUser(data.data.user);
        return data.data;
    };

    const register = async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('researchmind_token', data.data.token);
        localStorage.setItem('researchmind_user', JSON.stringify(data.data.user));
        setUser(data.data.user);
        return data.data;
    };

    const logout = () => {
        localStorage.removeItem('researchmind_token');
        localStorage.removeItem('researchmind_user');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
