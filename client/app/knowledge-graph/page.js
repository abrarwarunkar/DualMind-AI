'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import styles from './knowledge-graph.module.css';

export default function KnowledgeGraphPage() {
    const { user } = useAuth();
    const router = useRouter();
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [graphData, setGraphData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedNode, setSelectedNode] = useState(null);
    const [sessionCount, setSessionCount] = useState(0);

    useEffect(() => {
        if (!user && typeof window !== 'undefined') {
            router.push('/login');
        }
    }, [user, router]);

    const fetchGraph = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/knowledge-graph');
            const graph = data.data.graph;
            setGraphData(graph);
            setSessionCount(graph.sessionCount || 0);
        } catch (err) {
            setError('Failed to load knowledge graph. Run some research first!');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) fetchGraph();
    }, [user, fetchGraph]);

    // Category color mapping
    const categoryColors = {
        technology: '#6366f1',
        concept: '#06b6d4',
        person: '#f59e0b',
        organization: '#ef4444',
        method: '#10b981',
        field: '#8b5cf6',
        other: '#64748b',
    };

    // Render D3 graph
    useEffect(() => {
        if (!graphData || !graphData.nodes.length || !svgRef.current) return;

        // Load D3 from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js';
        script.onload = () => renderGraph();
        document.head.appendChild(script);

        function renderGraph() {
            const d3 = window.d3;
            if (!d3) return;

            const container = containerRef.current;
            const width = container.clientWidth;
            const height = container.clientHeight || 600;

            // Clear previous
            d3.select(svgRef.current).selectAll('*').remove();

            const svg = d3.select(svgRef.current)
                .attr('width', width)
                .attr('height', height);

            const g = svg.append('g');

            // Zoom behavior
            const zoom = d3.zoom()
                .scaleExtent([0.3, 4])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                });
            svg.call(zoom);

            // Prepare data
            const nodes = graphData.nodes.map(n => ({
                ...n,
                radius: Math.max(8, Math.min(30, 8 + n.count * 4)),
            }));
            const edges = graphData.edges
                .filter(e => nodes.find(n => n.id === e.source) && nodes.find(n => n.id === e.target))
                .map(e => ({ ...e }));

            // Force simulation
            const simulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(edges).id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-200))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(d => d.radius + 5));

            // Draw edges
            const link = g.append('g')
                .selectAll('line')
                .data(edges)
                .join('line')
                .attr('stroke', 'rgba(255,255,255,0.1)')
                .attr('stroke-width', d => Math.max(1, d.weight));

            // Draw node groups
            const node = g.append('g')
                .selectAll('g')
                .data(nodes)
                .join('g')
                .style('cursor', 'pointer')
                .call(d3.drag()
                    .on('start', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on('drag', (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on('end', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    })
                );

            // Node circles with glow
            node.append('circle')
                .attr('r', d => d.radius)
                .attr('fill', d => categoryColors[d.category] || '#64748b')
                .attr('stroke', d => categoryColors[d.category] || '#64748b')
                .attr('stroke-width', 2)
                .attr('stroke-opacity', 0.3)
                .attr('fill-opacity', 0.8)
                .on('click', (event, d) => {
                    event.stopPropagation();
                    setSelectedNode(d);
                })
                .on('mouseenter', function (event, d) {
                    d3.select(this)
                        .transition().duration(200)
                        .attr('r', d.radius * 1.3)
                        .attr('fill-opacity', 1)
                        .attr('stroke-width', 4);
                })
                .on('mouseleave', function (event, d) {
                    d3.select(this)
                        .transition().duration(200)
                        .attr('r', d.radius)
                        .attr('fill-opacity', 0.8)
                        .attr('stroke-width', 2);
                });

            // Node labels
            node.append('text')
                .text(d => d.label)
                .attr('text-anchor', 'middle')
                .attr('dy', d => d.radius + 14)
                .attr('fill', 'var(--text-secondary)')
                .attr('font-size', '11px')
                .attr('font-family', 'Inter, sans-serif')
                .attr('pointer-events', 'none');

            // Simulation tick
            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                node.attr('transform', d => `translate(${d.x},${d.y})`);
            });

            // Click on background to deselect
            svg.on('click', () => setSelectedNode(null));
        }

        return () => {
            // Cleanup
        };
    }, [graphData]);

    if (!user) return null;

    return (
        <div className="page">
            <div className={styles.pageLayout}>
                {/* Header */}
                <div className={styles.header}>
                    <h1 className={styles.pageTitle}>
                        <span>🔗</span> Knowledge Graph
                    </h1>
                    <div className={styles.stats}>
                        <span className={styles.stat}>
                            <strong>{graphData?.nodes.length || 0}</strong> concepts
                        </span>
                        <span className={styles.stat}>
                            <strong>{graphData?.edges.length || 0}</strong> connections
                        </span>
                        <span className={styles.stat}>
                            <strong>{sessionCount}</strong> sessions
                        </span>
                    </div>
                </div>

                {/* Main Content */}
                <div className={styles.mainContent}>
                    {loading && (
                        <div className={styles.loadingState}>
                            <div className="spinner" />
                            <p>Building your knowledge graph...</p>
                        </div>
                    )}

                    {error && (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>🧠</span>
                            <h2>No Knowledge Graph Yet</h2>
                            <p>{error}</p>
                            <button className="btn btn-primary" onClick={() => router.push('/research')}>
                                🔬 Start Researching
                            </button>
                        </div>
                    )}

                    {!loading && !error && graphData && graphData.nodes.length === 0 && (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>🕸️</span>
                            <h2>Your Knowledge Graph is Empty</h2>
                            <p>Run some research queries to start building your knowledge network!</p>
                            <button className="btn btn-primary" onClick={() => router.push('/research')}>
                                🔬 Start Researching
                            </button>
                        </div>
                    )}

                    {!loading && graphData && graphData.nodes.length > 0 && (
                        <div className={styles.graphContainer} ref={containerRef}>
                            <svg ref={svgRef} className={styles.graphSvg} />

                            {/* Legend */}
                            <div className={styles.legend}>
                                {Object.entries(categoryColors).map(([cat, color]) => (
                                    <div key={cat} className={styles.legendItem}>
                                        <span className={styles.legendDot} style={{ background: color }} />
                                        <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Selected Node Panel */}
                            {selectedNode && (
                                <div className={`${styles.nodePanel} animate-in`}>
                                    <div className={styles.nodePanelHeader}>
                                        <span
                                            className={styles.nodePanelDot}
                                            style={{ background: categoryColors[selectedNode.category] }}
                                        />
                                        <h3>{selectedNode.label}</h3>
                                        <button
                                            className={styles.closeBtn}
                                            onClick={() => setSelectedNode(null)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className={styles.nodePanelMeta}>
                                        <span className={`badge badge-primary`}>
                                            {selectedNode.category}
                                        </span>
                                        <span className={styles.nodePanelCount}>
                                            Appears in {selectedNode.count} session{selectedNode.count !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    {selectedNode.sessions?.length > 0 && (
                                        <div className={styles.nodePanelSessions}>
                                            <h4>Related Research</h4>
                                            {selectedNode.sessions.map((s) => (
                                                <a
                                                    key={s.id}
                                                    href={`/research/${s.id}`}
                                                    className={styles.sessionLink}
                                                >
                                                    <span className={styles.sessionTitle}>
                                                        {s.title || s.query}
                                                    </span>
                                                    <span className={styles.sessionDate}>
                                                        {new Date(s.date).toLocaleDateString()}
                                                    </span>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
