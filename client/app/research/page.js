'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import styles from './research.module.css';

function ResearchPageContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState('');
    const [compareMode, setCompareMode] = useState(true);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [activeTab, setActiveTab] = useState('summary');
    const [error, setError] = useState('');
    const [followUpMode, setFollowUpMode] = useState(false);
    const [followUpQuery, setFollowUpQuery] = useState('');
    const [chain, setChain] = useState([]);
    const [expandedAbstracts, setExpandedAbstracts] = useState({});

    // Check if we have a follow-up parent from URL
    const parentId = searchParams.get('followUp');

    useEffect(() => {
        if (!user && typeof window !== 'undefined') {
            router.push('/login');
        }
    }, [user, router]);

    const fetchChain = useCallback(async (sessionId) => {
        try {
            const { data } = await api.get(`/research/${sessionId}/chain`);
            setChain(data.data.chain || []);
        } catch (err) {
            console.error('Failed to fetch chain:', err);
        }
    }, []);

    if (!user) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);
        setChain([]);

        try {
            const payload = { query, compareMode };
            if (parentId) {
                payload.parentSessionId = parentId;
            }
            const { data } = await api.post('/research', payload);
            const session = data.data.session;
            setResult(session);
            setActiveTab('summary');
            setFollowUpMode(false);

            // Fetch chain if this is part of a thread
            if (session.parentSessionId || session.chainDepth > 0) {
                fetchChain(session._id);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Research query failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFollowUp = async (e) => {
        e.preventDefault();
        if (!followUpQuery.trim() || !result) return;
        setLoading(true);
        setError('');

        try {
            const { data } = await api.post('/research', {
                query: followUpQuery,
                compareMode,
                parentSessionId: result._id,
            });
            const session = data.data.session;
            setResult(session);
            setQuery(followUpQuery);
            setFollowUpQuery('');
            setFollowUpMode(false);
            setActiveTab('summary');
            fetchChain(session._id);
        } catch (err) {
            setError(err.response?.data?.error || 'Follow-up query failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format) => {
        if (!result) return;
        try {
            const endpoint = format === 'pdf' ? '/export/pdf' : '/export/markdown';
            const response = await api.post(endpoint, { sessionId: result._id }, {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `research.${format === 'pdf' ? 'pdf' : 'md'}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError('Export failed');
        }
    };

    const toggleAbstract = (index) => {
        setExpandedAbstracts(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const renderTabContent = () => {
        if (!result) return null;

        switch (activeTab) {
            case 'summary':
                return (
                    <div className={styles.tabContent}>
                        <h2 className={styles.resultTitle}>{result.groundedSummary?.title}</h2>
                        <p className={styles.resultText}>{result.groundedSummary?.summary}</p>
                        {result.groundedSummary?.key_points?.length > 0 && (
                            <div className={styles.keyPoints}>
                                <h3>Key Findings</h3>
                                <ul>
                                    {result.groundedSummary.key_points.map((point, i) => (
                                        <li key={i}>{point}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {result.groundedSummary?.confidence_score != null && (
                            <div className={styles.confidence}>
                                <span>Confidence Score</span>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${result.groundedSummary.confidence_score * 100}%` }}
                                    />
                                </div>
                                <span className={styles.confidenceNum}>
                                    {(result.groundedSummary.confidence_score * 100).toFixed(0)}%
                                </span>
                            </div>
                        )}
                    </div>
                );
            case 'gpt':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.modelBadge}>🟢 Llama 3.3 70B</div>
                        <h2 className={styles.resultTitle}>{result.gptResponse?.title}</h2>
                        <p className={styles.resultText}>{result.gptResponse?.summary}</p>
                        {result.gptResponse?.key_points?.map((p, i) => (
                            <div key={i} className={styles.point}>• {p}</div>
                        ))}
                    </div>
                );
            case 'claude':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.modelBadge} style={{ color: 'var(--accent-light)' }}>
                            🟣 GPT-OSS 120B
                        </div>
                        <h2 className={styles.resultTitle}>{result.claudeResponse?.title}</h2>
                        <p className={styles.resultText}>{result.claudeResponse?.summary}</p>
                        {result.claudeResponse?.key_points?.map((p, i) => (
                            <div key={i} className={styles.point}>• {p}</div>
                        ))}
                    </div>
                );
            case 'hallucination':
                return (
                    <div className={styles.tabContent}>
                        <h2 className={styles.resultTitle}>Hallucination Analysis</h2>
                        <div style={{ marginBottom: '16px' }}>
                            <span
                                className={`badge badge-${result.hallucinationReport?.hallucination_risk || 'low'}`}
                                style={{ fontSize: '14px', padding: '6px 14px' }}
                            >
                                {result.hallucinationReport?.hallucination_risk === 'low' && '🟢'}
                                {result.hallucinationReport?.hallucination_risk === 'medium' && '🟡'}
                                {result.hallucinationReport?.hallucination_risk === 'high' && '🔴'}
                                {' '}Risk: {result.hallucinationReport?.hallucination_risk?.toUpperCase()}
                            </span>
                        </div>
                        {result.hallucinationReport?.analysis && (
                            <p className={styles.resultText}>{result.hallucinationReport.analysis}</p>
                        )}
                        {result.hallucinationReport?.unsupported_claims?.length > 0 && (
                            <div className={styles.claims}>
                                <h3>⚠️ Unsupported Claims</h3>
                                {result.hallucinationReport.unsupported_claims.map((claim, i) => (
                                    <div key={i} className={styles.claim}>{claim}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'papers':
                return (
                    <div className={styles.tabContent}>
                        <h2 className={styles.resultTitle}>Academic Papers</h2>
                        {(!result.academicSources || result.academicSources.length === 0) ? (
                            <p className={styles.resultText} style={{ color: 'var(--text-muted)' }}>
                                No academic papers found for this query. Try a more specific or technical search term.
                            </p>
                        ) : (
                            <div className={styles.papersList}>
                                {result.academicSources.map((paper, i) => (
                                    <div key={i} className={styles.paperCard}>
                                        <div className={styles.paperHeader}>
                                            <a
                                                href={paper.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.paperTitle}
                                            >
                                                {paper.title}
                                            </a>
                                            <div className={styles.paperMeta}>
                                                <span className={`badge badge-${paper.source === 'arxiv' ? 'accent' : 'primary'}`}>
                                                    {paper.source === 'arxiv' ? '📄 arXiv' : '🎓 Scholar'}
                                                </span>
                                                {paper.year && (
                                                    <span className={styles.paperYear}>{paper.year}</span>
                                                )}
                                                {paper.citationCount > 0 && (
                                                    <span className={styles.citationBadge}>
                                                        📊 {paper.citationCount.toLocaleString()} citations
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {paper.authors?.length > 0 && (
                                            <div className={styles.paperAuthors}>
                                                👤 {paper.authors.join(', ')}
                                            </div>
                                        )}
                                        {paper.abstract && (
                                            <div className={styles.paperAbstract}>
                                                <p>
                                                    {expandedAbstracts[i]
                                                        ? paper.abstract
                                                        : paper.abstract.substring(0, 200) + (paper.abstract.length > 200 ? '...' : '')
                                                    }
                                                </p>
                                                {paper.abstract.length > 200 && (
                                                    <button
                                                        className={styles.expandBtn}
                                                        onClick={() => toggleAbstract(i)}
                                                    >
                                                        {expandedAbstracts[i] ? 'Show less' : 'Show more'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'sources':
                return (
                    <div className={styles.tabContent}>
                        <h2 className={styles.resultTitle}>Sources</h2>
                        {(result.groundedSummary?.citations || result.citations || []).map((cite, i) => (
                            <a
                                key={i}
                                href={cite.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.source}
                            >
                                <span className={styles.sourceNum}>{i + 1}</span>
                                <div>
                                    <div className={styles.sourceTitle}>{cite.title || cite.url}</div>
                                    <div className={styles.sourceUrl}>{cite.url}</div>
                                    {cite.snippet && <div className={styles.sourceSnippet}>{cite.snippet}</div>}
                                </div>
                            </a>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="page">
            <div className="container">
                {/* Research Chain Breadcrumb */}
                {chain.length > 1 && (
                    <div className={styles.chainBreadcrumb}>
                        <span className={styles.chainLabel}>🔗 Research Thread</span>
                        <div className={styles.chainItems}>
                            {chain.map((item, i) => (
                                <span
                                    key={item._id}
                                    className={`${styles.chainItem} ${item.isCurrent ? styles.chainItemActive : ''}`}
                                >
                                    {i > 0 && <span className={styles.chainArrow}>→</span>}
                                    <span className={styles.chainQuery}>
                                        {item.query.length > 40 ? item.query.substring(0, 40) + '...' : item.query}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Query Input */}
                <div className={styles.querySection}>
                    <h1 className={styles.pageTitle}>
                        <span>🔬</span> {parentId ? 'Follow-Up Research' : 'New Research'}
                    </h1>
                    <form onSubmit={handleSubmit} className={styles.queryForm}>
                        <div className={styles.inputWrap}>
                            <input
                                type="text"
                                className={`input input-lg ${styles.queryInput}`}
                                placeholder={parentId
                                    ? "Ask a follow-up question based on previous research..."
                                    : "Ask any research question... (e.g., What are the latest advances in quantum computing?)"
                                }
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                disabled={loading}
                            />
                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !query.trim()}>
                                {loading ? <span className="spinner spinner-sm" /> : '🔍 Research'}
                            </button>
                        </div>
                        <div className={styles.options}>
                            <label className={styles.toggle}>
                                <input
                                    type="checkbox"
                                    checked={compareMode}
                                    onChange={(e) => setCompareMode(e.target.checked)}
                                />
                                <span className={styles.toggleSlider} />
                                <span>Compare Mode (Llama 70B vs GPT-OSS 120B)</span>
                            </label>
                        </div>
                    </form>
                </div>

                {/* Error */}
                {error && <div className={styles.error}>{error}</div>}

                {/* Loading State */}
                {loading && (
                    <div className={styles.loadingSection}>
                        <div className="spinner" />
                        <div className={styles.loadingText}>
                            <p>🔍 Searching web sources & academic papers...</p>
                            <p>🤖 Querying Llama 3.3 70B & GPT-OSS 120B via Groq...</p>
                            <p>📊 Generating grounded summary...</p>
                            <p>🛡️ Running hallucination detection...</p>
                            <p>🧠 Extracting knowledge graph entities...</p>
                        </div>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className={`${styles.resultsSection} animate-in`}>
                        <div className="tabs">
                            {['summary', 'gpt', 'claude', 'hallucination', 'papers', 'sources'].map((tab) => (
                                <button
                                    key={tab}
                                    className={`tab ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab === 'summary' && '📑 Summary'}
                                    {tab === 'gpt' && '🟢 Llama 70B'}
                                    {tab === 'claude' && '🟣 GPT-OSS 120B'}
                                    {tab === 'hallucination' && '🛡️ Hallucination'}
                                    {tab === 'papers' && `📚 Papers${result.academicSources?.length ? ` (${result.academicSources.length})` : ''}`}
                                    {tab === 'sources' && '🔗 Sources'}
                                </button>
                            ))}
                        </div>

                        <div className={`glass-card ${styles.resultCard}`}>
                            {renderTabContent()}
                        </div>

                        {/* Action Bar */}
                        <div className={styles.exportBar}>
                            <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>
                                📄 Export PDF
                            </button>
                            <button className="btn btn-secondary" onClick={() => handleExport('markdown')}>
                                📝 Export Markdown
                            </button>
                            <button
                                className="btn btn-accent"
                                onClick={() => setFollowUpMode(!followUpMode)}
                            >
                                {followUpMode ? '✕ Cancel' : '💬 Ask Follow-Up'}
                            </button>
                        </div>

                        {/* Follow-Up Input */}
                        {followUpMode && (
                            <div className={`${styles.followUpSection} animate-in`}>
                                <div className={styles.followUpContext}>
                                    <span className={styles.followUpLabel}>↳ Following up on:</span>
                                    <span className={styles.followUpParent}>
                                        {result.groundedSummary?.title || result.query}
                                    </span>
                                </div>
                                <form onSubmit={handleFollowUp} className={styles.followUpForm}>
                                    <input
                                        type="text"
                                        className={`input ${styles.followUpInput}`}
                                        placeholder="Ask a follow-up question to dig deeper..."
                                        value={followUpQuery}
                                        onChange={(e) => setFollowUpQuery(e.target.value)}
                                        disabled={loading}
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading || !followUpQuery.trim()}
                                    >
                                        {loading ? <span className="spinner spinner-sm" /> : '🔗 Follow Up'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ResearchPage() {
    return (
        <Suspense fallback={<div className="page"><div className="container"><div className="spinner" /></div></div>}>
            <ResearchPageContent />
        </Suspense>
    );
}
