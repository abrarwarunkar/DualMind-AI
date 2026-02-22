const PDFDocument = require('pdfkit');

/**
 * Export Service — PDF and Markdown generation
 */
class ExportService {
    /**
     * Generate PDF from research session
     * @returns {Buffer} PDF file buffer
     */
    async exportToPDF(session) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margin: 50,
                    size: 'A4',
                    info: {
                        Title: session.groundedSummary?.title || `Research: ${session.query}`,
                        Author: 'ResearchMind AI',
                        Subject: session.query,
                    },
                });

                const buffers = [];
                doc.on('data', (chunk) => buffers.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(buffers)));

                // ─── Header ───
                doc
                    .fontSize(10)
                    .fillColor('#6366f1')
                    .text('ResearchMind AI', { align: 'right' })
                    .moveDown(0.5);

                doc
                    .moveTo(50, doc.y)
                    .lineTo(545, doc.y)
                    .strokeColor('#e5e7eb')
                    .stroke()
                    .moveDown(1);

                // ─── Title ───
                const title =
                    session.groundedSummary?.title || `Research: ${session.query}`;
                doc.fontSize(22).fillColor('#1f2937').text(title, { align: 'left' });
                doc.moveDown(0.3);

                // ─── Date ───
                doc
                    .fontSize(10)
                    .fillColor('#6b7280')
                    .text(`Generated: ${new Date(session.createdAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}`)
                    .moveDown(1);

                // ─── Query ───
                doc.fontSize(12).fillColor('#4f46e5').text('Research Question', { underline: true });
                doc.fontSize(11).fillColor('#374151').text(session.query).moveDown(1);

                // ─── Summary ───
                const summary = session.groundedSummary || session.gptResponse || {};
                if (summary.summary) {
                    doc.fontSize(12).fillColor('#4f46e5').text('Summary', { underline: true });
                    doc.fontSize(11).fillColor('#374151').text(summary.summary).moveDown(1);
                }

                // ─── Key Points ───
                const keyPoints = summary.key_points || [];
                if (keyPoints.length > 0) {
                    doc.fontSize(12).fillColor('#4f46e5').text('Key Findings', { underline: true });
                    doc.moveDown(0.3);
                    for (const point of keyPoints) {
                        doc.fontSize(10).fillColor('#374151').text(`  •  ${point}`, { indent: 10 });
                        doc.moveDown(0.2);
                    }
                    doc.moveDown(0.5);
                }

                // ─── Hallucination Report ───
                if (session.hallucinationReport) {
                    doc.fontSize(12).fillColor('#4f46e5').text('Hallucination Analysis', { underline: true });
                    doc.moveDown(0.3);

                    const riskColor =
                        session.hallucinationReport.hallucination_risk === 'low'
                            ? '#16a34a'
                            : session.hallucinationReport.hallucination_risk === 'medium'
                                ? '#d97706'
                                : '#dc2626';

                    doc
                        .fontSize(11)
                        .fillColor(riskColor)
                        .text(`Risk Level: ${session.hallucinationReport.hallucination_risk?.toUpperCase()}`);

                    if (session.hallucinationReport.analysis) {
                        doc.fontSize(10).fillColor('#374151').text(session.hallucinationReport.analysis);
                    }
                    doc.moveDown(1);
                }

                // ─── Citations ───
                const citations = session.groundedSummary?.citations || session.citations || [];
                if (citations.length > 0) {
                    doc.fontSize(12).fillColor('#4f46e5').text('Sources', { underline: true });
                    doc.moveDown(0.3);
                    citations.forEach((cite, i) => {
                        doc
                            .fontSize(9)
                            .fillColor('#2563eb')
                            .text(`[${i + 1}] ${cite.title || cite.url}`, { link: cite.url, underline: true });
                        doc.fontSize(8).fillColor('#6b7280').text(`    ${cite.url}`);
                        doc.moveDown(0.2);
                    });
                }

                // ─── Confidence Score ───
                if (summary.confidence_score != null) {
                    doc.moveDown(1);
                    doc
                        .fontSize(10)
                        .fillColor('#6b7280')
                        .text(`Confidence Score: ${(summary.confidence_score * 100).toFixed(0)}%`, {
                            align: 'right',
                        });
                }

                // ─── Footer ───
                doc.moveDown(2);
                doc
                    .moveTo(50, doc.y)
                    .lineTo(545, doc.y)
                    .strokeColor('#e5e7eb')
                    .stroke();
                doc
                    .moveDown(0.5)
                    .fontSize(8)
                    .fillColor('#9ca3af')
                    .text('Generated by ResearchMind AI — AI-Powered Research Assistant', {
                        align: 'center',
                    });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate Markdown from research session
     * @returns {string} Markdown content
     */
    exportToMarkdown(session) {
        const summary = session.groundedSummary || session.gptResponse || {};
        const lines = [];

        lines.push(`# ${summary.title || `Research: ${session.query}`}`);
        lines.push('');
        lines.push(`> Generated by **ResearchMind AI** on ${new Date(session.createdAt).toLocaleDateString()}`);
        lines.push('');

        lines.push('## Research Question');
        lines.push('');
        lines.push(session.query);
        lines.push('');

        if (summary.summary) {
            lines.push('## Summary');
            lines.push('');
            lines.push(summary.summary);
            lines.push('');
        }

        const keyPoints = summary.key_points || [];
        if (keyPoints.length > 0) {
            lines.push('## Key Findings');
            lines.push('');
            for (const point of keyPoints) {
                lines.push(`- ${point}`);
            }
            lines.push('');
        }

        // GPT vs Claude comparison
        if (session.compareMode && session.gptResponse && session.claudeResponse) {
            lines.push('## Model Comparison');
            lines.push('');
            lines.push('### GPT-4o Analysis');
            lines.push('');
            lines.push(session.gptResponse.summary || '_No response_');
            lines.push('');
            lines.push(`**Confidence:** ${((session.gptResponse.confidence_score || 0) * 100).toFixed(0)}%`);
            lines.push('');
            lines.push('### Claude 3.5 Sonnet Analysis');
            lines.push('');
            lines.push(session.claudeResponse.summary || '_No response_');
            lines.push('');
            lines.push(`**Confidence:** ${((session.claudeResponse.confidence_score || 0) * 100).toFixed(0)}%`);
            lines.push('');
        }

        // Hallucination Report
        if (session.hallucinationReport) {
            lines.push('## Hallucination Analysis');
            lines.push('');
            const risk = session.hallucinationReport.hallucination_risk || 'unknown';
            const emoji = risk === 'low' ? '🟢' : risk === 'medium' ? '🟡' : '🔴';
            lines.push(`**Risk Level:** ${emoji} ${risk.toUpperCase()}`);
            lines.push('');
            if (session.hallucinationReport.analysis) {
                lines.push(session.hallucinationReport.analysis);
                lines.push('');
            }
            if (session.hallucinationReport.unsupported_claims?.length > 0) {
                lines.push('**Unsupported Claims:**');
                for (const claim of session.hallucinationReport.unsupported_claims) {
                    lines.push(`- ⚠️ ${claim}`);
                }
                lines.push('');
            }
        }

        // Citations
        const citations = summary.citations || session.citations || [];
        if (citations.length > 0) {
            lines.push('## Sources');
            lines.push('');
            citations.forEach((cite, i) => {
                lines.push(`${i + 1}. [${cite.title || cite.url}](${cite.url})`);
            });
            lines.push('');
        }

        // Confidence
        if (summary.confidence_score != null) {
            lines.push('---');
            lines.push('');
            lines.push(`**Overall Confidence Score:** ${(summary.confidence_score * 100).toFixed(0)}%`);
        }

        return lines.join('\n');
    }
}

module.exports = new ExportService();
