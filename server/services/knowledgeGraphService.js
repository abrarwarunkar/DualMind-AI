const llmService = require('./llmService');
const keys = require('../config/keys');
const { knowledgeGraphPrompt } = require('../utils/prompts');
const ResearchSession = require('../models/ResearchSession');

/**
 * Knowledge Graph Service
 * Extracts entities and relationships from research sessions using LLM
 * Builds an interactive graph structure for visualization
 */
class KnowledgeGraphService {
    /**
     * Extract entities from a research session using LLM
     */
    async extractEntities(session) {
        try {
            const summaryText = session.groundedSummary?.summary || '';
            const keyPoints = session.groundedSummary?.key_points || [];
            const query = session.query || '';

            if (!summaryText && keyPoints.length === 0) {
                return [];
            }

            if (keys.GROQ_API_KEY && llmService.groq) {
                const prompt = knowledgeGraphPrompt(query, summaryText, keyPoints);
                const response = await llmService.groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an entity extraction engine. Respond ONLY with valid JSON and nothing else.',
                        },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.1,
                    max_tokens: 2000,
                    response_format: { type: 'json_object' },
                });

                const content = response.choices[0].message.content;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);

                return (parsed.entities || []).map((e) => ({
                    name: String(e.name || '').substring(0, 100),
                    category: this._normalizeCategory(e.category),
                }));
            }

            // Mock extraction for dev mode
            return this._mockEntities(query, keyPoints);
        } catch (error) {
            console.error('Entity extraction error:', error.message);
            return this._mockEntities(session.query, session.groundedSummary?.key_points || []);
        }
    }

    /**
     * Build aggregated knowledge graph from all user sessions
     */
    async buildUserGraph(userId) {
        const sessions = await ResearchSession.find({
            userId,
            status: 'completed',
            'entities.0': { $exists: true },
        }).select('query entities groundedSummary.title createdAt');

        const nodeMap = new Map(); // name -> { id, label, category, sessions[], count }
        const edgeMap = new Map(); // "source->target" -> { source, target, weight }

        for (const session of sessions) {
            const sessionInfo = {
                id: session._id,
                query: session.query,
                title: session.groundedSummary?.title || session.query,
                date: session.createdAt,
            };

            const sessionEntities = session.entities || [];

            for (const entity of sessionEntities) {
                const key = entity.name.toLowerCase();
                if (!nodeMap.has(key)) {
                    nodeMap.set(key, {
                        id: key,
                        label: entity.name,
                        category: entity.category,
                        sessions: [],
                        count: 0,
                    });
                }
                const node = nodeMap.get(key);
                node.count++;
                // Avoid duplicate session entries
                if (!node.sessions.find((s) => s.id.toString() === session._id.toString())) {
                    node.sessions.push(sessionInfo);
                }
            }

            // Create edges between entities that co-occur in the same session
            for (let i = 0; i < sessionEntities.length; i++) {
                for (let j = i + 1; j < sessionEntities.length; j++) {
                    const a = sessionEntities[i].name.toLowerCase();
                    const b = sessionEntities[j].name.toLowerCase();
                    const edgeKey = [a, b].sort().join('->');
                    if (!edgeMap.has(edgeKey)) {
                        edgeMap.set(edgeKey, {
                            source: a,
                            target: b,
                            weight: 0,
                        });
                    }
                    edgeMap.get(edgeKey).weight++;
                }
            }
        }

        return {
            nodes: Array.from(nodeMap.values()),
            edges: Array.from(edgeMap.values()),
            sessionCount: sessions.length,
        };
    }

    _normalizeCategory(cat) {
        const valid = ['technology', 'concept', 'person', 'organization', 'method', 'field', 'other'];
        const lower = (cat || '').toLowerCase().trim();
        return valid.includes(lower) ? lower : 'other';
    }

    _mockEntities(query, keyPoints) {
        const words = query.split(/\s+/).filter((w) => w.length > 3);
        return words.slice(0, 4).map((w, i) => ({
            name: w.charAt(0).toUpperCase() + w.slice(1),
            category: ['technology', 'concept', 'field', 'method'][i % 4],
        }));
    }
}

module.exports = new KnowledgeGraphService();
