'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import styles from '../research.module.css';

export default function ResearchDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const router = useRouter();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');

    useEffect(() => {
        if (!user) return;
        const fetchSession = async () => {
            try {
                const { data } = await api.get(`/research/${id}`);
                setSession(data.data.session);
            } catch {
                router.push('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchSession();
    }, [id, user]);

    if (!user) {
        if (typeof window !== 'undefined') router.push('/login');
        return null;
    }

    const handleExport = async (format) => {
        try {
            const endpoint = format === 'pdf' ? '/export/pdf' : '/export/markdown';
            const response = await api.post(endpoint, { sessionId: id }, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `research.${format === 'pdf' ? 'pdf' : 'md'}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
                    <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
            </div>
        );
    }

    if (!session) return null;

    const renderContent = () => {
        const tab = activeTab;
        if (tab === 'summary') {
            return (
                <div className={styles.tabContent}>
                    <h2 className={styles.resultTitle}>{session.groundedSummary?.title}</h2>
                    <p className={styles.resultText}>{session.groundedSummary?.summary}</p>
                    {session.groundedSummary?.key_points?.map((p, i) => (
                        <div key={i} className={styles.point}>• {p}</div>
                    ))}
                </div>
            );
        }
        if (tab === 'gpt') {
            return (
                <div className={styles.tabContent}>
                    <div className={styles.modelBadge}>🟢 Llama 3.3 70B</div>
                    <h2 className={styles.resultTitle}>{session.gptResponse?.title}</h2>
                    <p className={styles.resultText}>{session.gptResponse?.summary}</p>
                    {session.gptResponse?.key_points?.map((p, i) => (
                        <div key={i} className={styles.point}>• {p}</div>
                    ))}
                </div>
            );
        }
        if (tab === 'claude') {
            return (
                <div className={styles.tabContent}>
                    <div className={styles.modelBadge} style={{ color: 'var(--accent-light)' }}>🟣 GPT-OSS 120B</div>
                    <h2 className={styles.resultTitle}>{session.claudeResponse?.title}</h2>
                    <p className={styles.resultText}>{session.claudeResponse?.summary}</p>
                    {session.claudeResponse?.key_points?.map((p, i) => (
                        <div key={i} className={styles.point}>• {p}</div>
                    ))}
                </div>
            );
        }
        if (tab === 'hallucination') {
            const report = session.hallucinationReport;
            return (
                <div className={styles.tabContent}>
                    <h2 className={styles.resultTitle}>Hallucination Analysis</h2>
                    <span className={`badge badge-${report?.hallucination_risk || 'low'}`} style={{ fontSize: '14px', padding: '6px 14px' }}>
                        Risk: {report?.hallucination_risk?.toUpperCase()}
                    </span>
                    {report?.analysis && <p className={styles.resultText} style={{ marginTop: 16 }}>{report.analysis}</p>}
                    {report?.unsupported_claims?.length > 0 && (
                        <div className={styles.claims}>
                            <h3>⚠️ Unsupported Claims</h3>
                            {report.unsupported_claims.map((c, i) => (
                                <div key={i} className={styles.claim}>{c}</div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        if (tab === 'papers') {
            return (
                <div className={styles.tabContent}>
                    <h2 className={styles.resultTitle}>Academic Papers</h2>
                    {session.academicSources?.length > 0 ? (
                        session.academicSources.map((paper, i) => (
                            <a key={i} href={paper.url} target="_blank" rel="noopener noreferrer" className={styles.source}>
                                <span className={styles.sourceNum}>{i + 1}</span>
                                <div>
                                    <div className={styles.sourceTitle}>{paper.title}</div>
                                    <div className={styles.sourceUrl}>
                                        {paper.authors?.join(', ')} · {paper.year} · {paper.source}
                                    </div>
                                </div>
                            </a>
                        ))
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>No academic papers for this session.</p>
                    )}
                </div>
            );
        }
        if (tab === 'sources') {
            const sources = session.sources || [];
            return (
                <div className={styles.tabContent}>
                    <h2 className={styles.resultTitle}>Web Sources</h2>
                    {sources.length > 0 ? (
                        sources.map((src, i) => (
                            <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" className={styles.source}>
                                <span className={styles.sourceNum}>{i + 1}</span>
                                <div>
                                    <div className={styles.sourceTitle}>{src.title || src.url}</div>
                                    <div className={styles.sourceUrl}>{src.url}</div>
                                </div>
                            </a>
                        ))
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>No web sources recorded for this session.</p>
                    )}
                </div>
            );
        }
    };

    return (
        <div className="page">
            <div className="container container-narrow">
                <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
                    ← Back to Dashboard
                </Link>

                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                    {session.groundedSummary?.title || session.query}
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                    {new Date(session.createdAt).toLocaleString()} · {session.compareMode ? 'Compare Mode' : 'Single Mode'}
                </p>

                <div className="tabs" style={{ marginBottom: 20 }}>
                    {['summary', 'gpt', 'claude', 'hallucination', 'papers', 'sources'].map((t) => (
                        <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                            {t === 'summary' && '📑 Summary'}
                            {t === 'gpt' && '🟢 Llama 70B'}
                            {t === 'claude' && '🟣 GPT-OSS 120B'}
                            {t === 'hallucination' && '🛡️ Hallucination'}
                            {t === 'papers' && `📚 Papers${session.academicSources?.length ? ` (${session.academicSources.length})` : ''}`}
                            {t === 'sources' && `🔗 Sources${session.sources?.length ? ` (${session.sources.length})` : ''}`}
                        </button>
                    ))}
                </div>

                <div className="glass-card" style={{ padding: 32, marginBottom: 20 }}>
                    {renderContent()}
                </div>

                <div className={styles.exportBar}>
                    <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>📄 Export PDF</button>
                    <button className="btn btn-secondary" onClick={() => handleExport('markdown')}>📝 Export Markdown</button>
                </div>
            </div>
        </div>
    );
}
