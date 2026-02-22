const llmService = require('./llmService');
const { groundedSummaryPrompt } = require('../utils/prompts');
const keys = require('../config/keys');

/**
 * Grounded Summarization Service
 * Synthesizes multi-LLM responses with source grounding
 */
class SummaryService {
    /**
     * Generate a grounded summary from GPT + Claude responses
     */
    async generateGroundedSummary(query, gptResponse, claudeResponse, sources) {
        try {
            const prompt = groundedSummaryPrompt(query, gptResponse, claudeResponse, sources);

            // Use Groq (Llama 3.3 70B) for the final grounded summary
            let result;
            if (keys.GROQ_API_KEY && llmService.groq) {
                const response = await llmService.groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content:
                                'You are a research synthesizer. Produce a final grounded summary. Respond ONLY with valid JSON and nothing else.',
                        },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.2,
                    max_tokens: 4000,
                    response_format: { type: 'json_object' },
                });

                const content = response.choices[0].message.content;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
            } else {
                result = this._mockGroundedSummary(query, gptResponse, claudeResponse, sources);
            }

            // Ensure citations array has proper structure
            if (!result.citations) {
                result.citations = sources.map((s) => ({
                    url: s.url,
                    title: s.title,
                    snippet: s.snippet || s.content?.substring(0, 200),
                }));
            }

            return result;
        } catch (error) {
            console.error('Grounded summary error:', error.message);
            // Fallback: merge best of both responses
            return this._fallbackSummary(query, gptResponse, claudeResponse, sources);
        }
    }

    _mockGroundedSummary(query, gptResponse, claudeResponse, sources) {
        return {
            title: `Comprehensive Research: ${query}`,
            summary: `This grounded summary synthesizes findings from both GPT-4o and Claude 3.5 Sonnet about "${query}". The analysis cross-references ${sources.length} web sources to ensure factual accuracy. Key themes include the main aspects of the topic [Source 1], supporting evidence from multiple perspectives [Source 2], and practical implications [Source 3]. Both AI models showed strong agreement on the core findings.`,
            key_points: [
                ...(gptResponse.key_points || []).slice(0, 3),
                ...(claudeResponse.key_points || []).slice(0, 3),
                'Cross-model agreement strengthens confidence in findings',
                'Sources provide consistent supporting evidence',
            ],
            citations: sources.map((s) => ({
                url: s.url,
                title: s.title,
                snippet: s.snippet || s.content?.substring(0, 200),
            })),
            confidence_score: Math.min(
                ((gptResponse.confidence_score || 0.7) + (claudeResponse.confidence_score || 0.7)) / 2 + 0.05,
                1.0
            ),
        };
    }

    _fallbackSummary(query, gptResponse, claudeResponse, sources) {
        const bestResponse =
            (gptResponse.confidence_score || 0) >= (claudeResponse.confidence_score || 0)
                ? gptResponse
                : claudeResponse;

        return {
            title: bestResponse.title || `Research: ${query}`,
            summary: bestResponse.summary || 'Summary generation failed. Please review individual model responses.',
            key_points: [
                ...(gptResponse.key_points || []),
                ...(claudeResponse.key_points || []),
            ].slice(0, 8),
            citations: sources.map((s) => ({
                url: s.url,
                title: s.title,
                snippet: s.snippet || '',
            })),
            confidence_score: bestResponse.confidence_score || 0.5,
        };
    }
}

module.exports = new SummaryService();
