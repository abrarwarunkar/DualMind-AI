import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
    return (
        <div className={styles.hero}>
            <div className={styles.glowOrb1} />
            <div className={styles.glowOrb2} />
            <div className={styles.glowOrb3} />

            <div className={`container ${styles.heroInner}`}>
                <div className={styles.badge}>
                    <span>🚀</span> Dual-LLM Research Platform
                </div>

                <h1 className={styles.title}>
                    <span className={styles.gradient}>Two Minds.</span>
                    <br />One Truth.
                </h1>

                <p className={styles.subtitle}>
                    DualMind harnesses Llama 3.3 70B and GPT-OSS 120B side-by-side via Groq&apos;s ultra-fast inference.
                    Build knowledge graphs, chain follow-up questions, and search academic papers —
                    all in one powerful research workspace.
                </p>

                <div className={styles.cta}>
                    <Link href="/register" className="btn btn-primary btn-lg">
                        Start Researching — Free
                    </Link>
                    <Link href="/login" className="btn btn-secondary btn-lg">
                        Sign In →
                    </Link>
                </div>

                {/* Feature Cards */}
                <div className={styles.features}>
                    {[
                        {
                            icon: '🔬',
                            title: 'Dual LLM Analysis',
                            desc: 'Compare Llama 3.3 70B & GPT-OSS 120B responses side-by-side via Groq',
                            color: '#6366f1',
                        },
                        {
                            icon: '🛡️',
                            title: 'Hallucination Detection',
                            desc: 'Cross-model validation flags unsupported claims instantly',
                            color: '#ef4444',
                        },
                        {
                            icon: '🔗',
                            title: 'Knowledge Graph',
                            desc: 'Auto-build a visual network of concepts across your research',
                            color: '#06b6d4',
                        },
                        {
                            icon: '💬',
                            title: 'Research Chains',
                            desc: 'Ask follow-up questions with full context from previous research',
                            color: '#10b981',
                        },
                        {
                            icon: '📚',
                            title: 'Academic Papers',
                            desc: 'Search arXiv & Semantic Scholar alongside web sources',
                            color: '#8b5cf6',
                        },
                        {
                            icon: '📤',
                            title: 'Export Anywhere',
                            desc: 'PDF, Markdown, and GitHub sync for your research notes',
                            color: '#f59e0b',
                        },
                    ].map((f, i) => (
                        <div
                            key={i}
                            className={`glass-card ${styles.feature}`}
                            style={{ animationDelay: `${i * 0.08}s`, '--feature-accent': f.color }}
                        >
                            <span className={styles.featureIcon}>{f.icon}</span>
                            <h3 className={styles.featureTitle}>{f.title}</h3>
                            <p className={styles.featureDesc}>{f.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Stats */}
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span className={styles.statNum}>2</span>
                        <span className={styles.statLabel}>LLM Models</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statNum}>5+</span>
                        <span className={styles.statLabel}>Web Sources</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statNum}>2</span>
                        <span className={styles.statLabel}>Academic APIs</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statNum}>∞</span>
                        <span className={styles.statLabel}>Research Chains</span>
                    </div>
                </div>

                {/* Powered by section */}
                <div className={styles.poweredBy}>
                    <span className={styles.poweredLabel}>Powered by</span>
                    <div className={styles.techStack}>
                        <span className={styles.techBadge}>⚡ Groq</span>
                        <span className={styles.techBadge}>🦙 Llama 3.3</span>
                        <span className={styles.techBadge}>🤖 GPT-OSS</span>
                        <span className={styles.techBadge}>📄 arXiv</span>
                        <span className={styles.techBadge}>🎓 Semantic Scholar</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
