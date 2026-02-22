'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import styles from './dashboard.module.css';

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});

    useEffect(() => {
        if (user) fetchSessions();
    }, [page, user]);

    if (!user) {
        if (typeof window !== 'undefined') router.push('/login');
        return null;
    }

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const params = { page, limit: 9 };
            if (search) params.search = search;
            const { data } = await api.get('/research', { params });
            setSessions(data.data.sessions);
            setPagination(data.data.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchSessions();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this research session?')) return;
        try {
            await api.delete(`/research/${id}`);
            setSessions((prev) => prev.filter((s) => s._id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleExport = async (sessionId, format) => {
        try {
            const endpoint = format === 'pdf' ? '/export/pdf' : '/export/markdown';
            const response = await api.post(endpoint, { sessionId }, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `research.${format === 'pdf' ? 'pdf' : 'md'}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed', err);
        }
    };

    const getRiskColor = (risk) => {
        if (risk === 'low') return 'badge-low';
        if (risk === 'medium') return 'badge-medium';
        return 'badge-high';
    };

    return (
        <div className="page">
            <div className="container">
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>📊 Research Dashboard</h1>
                        <p className={styles.subtitle}>
                            Welcome back, <strong>{user.name}</strong>. You have{' '}
                            {pagination.total || 0} research sessions.
                        </p>
                    </div>
                    <Link href="/research" className="btn btn-primary">
                        + New Research
                    </Link>
                </div>

                <form onSubmit={handleSearch} className={styles.searchBar}>
                    <input
                        type="text"
                        className="input"
                        placeholder="Search your research sessions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="submit" className="btn btn-secondary">Search</button>
                </form>

                {loading ? (
                    <div className={styles.grid}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={`glass-card ${styles.card}`}>
                                <div className="skeleton skeleton-heading" />
                                <div className="skeleton skeleton-text" />
                                <div className="skeleton skeleton-text" />
                            </div>
                        ))}
                    </div>
                ) : sessions.length > 0 ? (
                    <>
                        <div className={styles.grid}>
                            {sessions.map((session) => (
                                <div key={session._id} className={`glass-card ${styles.card}`}>
                                    <div className={styles.cardTop}>
                                        <span
                                            className={`badge ${getRiskColor(session.hallucinationReport?.hallucination_risk)}`}
                                        >
                                            {session.hallucinationReport?.hallucination_risk?.toUpperCase() || 'N/A'}
                                        </span>
                                        <span className={styles.date}>
                                            {new Date(session.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className={styles.cardTitle}>
                                        {session.groundedSummary?.title || session.query}
                                    </h3>
                                    <p className={styles.cardDesc}>
                                        {session.groundedSummary?.summary?.substring(0, 120) || session.query}...
                                    </p>
                                    {session.groundedSummary?.confidence_score != null && (
                                        <div className={styles.cardConfidence}>
                                            <div className={styles.miniBar}>
                                                <div
                                                    className={styles.miniFill}
                                                    style={{ width: `${session.groundedSummary.confidence_score * 100}%` }}
                                                />
                                            </div>
                                            <span>{(session.groundedSummary.confidence_score * 100).toFixed(0)}%</span>
                                        </div>
                                    )}
                                    <div className={styles.cardActions}>
                                        <Link href={`/research/${session._id}`} className="btn btn-ghost btn-sm">
                                            View
                                        </Link>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleExport(session._id, 'pdf')}
                                        >
                                            📄 PDF
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleExport(session._id, 'markdown')}
                                        >
                                            📝 MD
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleDelete(session._id)}
                                            style={{ color: 'var(--error)' }}
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {pagination.pages > 1 && (
                            <div className={styles.pagination}>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                >
                                    ← Previous
                                </button>
                                <span className={styles.pageInfo}>
                                    Page {page} of {pagination.pages}
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                                    disabled={page >= pagination.pages}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.empty}>
                        <span className={styles.emptyIcon}>🔬</span>
                        <h2>No research sessions yet</h2>
                        <p>Start your first AI-powered research query</p>
                        <Link href="/research" className="btn btn-primary">Start Researching</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
