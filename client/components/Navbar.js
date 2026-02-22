'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { user, logout } = useAuth();
    const [theme, setTheme] = useState('dark');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('dualmind_theme') || 'dark';
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);

        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('dualmind_theme', next);
        document.documentElement.setAttribute('data-theme', next);
    };

    return (
        <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
            <div className={styles.inner}>
                <Link href={user ? '/dashboard' : '/'} className={styles.logo}>
                    <span className={styles.logoIcon}>🧠</span>
                    <span className={styles.logoText}>DualMind</span>
                </Link>

                <div className={styles.links}>
                    {user ? (
                        <>
                            <Link href="/research" className={styles.link}>
                                🔬 Research
                            </Link>
                            <Link href="/knowledge-graph" className={styles.link}>
                                🔗 Knowledge Graph
                            </Link>
                            <Link href="/dashboard" className={styles.link}>
                                📊 Dashboard
                            </Link>
                            <button onClick={toggleTheme} className={styles.themeBtn}>
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
                            <div className={styles.user}>
                                <span className={styles.avatar}>
                                    {user.name?.charAt(0).toUpperCase()}
                                </span>
                                <button onClick={logout} className="btn btn-ghost btn-sm">
                                    Logout
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <button onClick={toggleTheme} className={styles.themeBtn}>
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
                            <Link href="/login" className="btn btn-ghost btn-sm">
                                Sign In
                            </Link>
                            <Link href="/register" className="btn btn-primary btn-sm">
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
