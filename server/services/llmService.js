const Groq = require('groq-sdk');
const keys = require('../config/keys');
const { researchPrompt, followUpResearchPrompt } = require('../utils/prompts');

/**
 * Multi-LLM Service — Powered by Groq (ultra-fast inference)
 * Uses Llama 3.3 70B (Meta) and GPT-OSS 120B (OpenAI) via Groq API
 */
class LLMService {
    constructor() {
        if (keys.GROQ_API_KEY) {
            this.groq = new Groq({ apiKey: keys.GROQ_API_KEY });
        }
    }

    /**
     * Query Groq with Llama 3.3 70B (replaces GPT-4o)
     */
    async queryOpenAI(query, sources = [], previousContext = null, academicPapers = []) {
        try {
            if (!this.groq) {
                return this._mockResponse('Llama-3.3-70B', query, sources);
            }

            const prompt = previousContext
                ? followUpResearchPrompt(query, sources, previousContext, academicPapers)
                : researchPrompt(query, sources, academicPapers);

            const response = await this.groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert research assistant. Always respond with valid JSON and nothing else. Do not wrap in markdown code blocks.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.3,
                max_tokens: 4000,
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
            return {
                ...parsed,
                raw: content,
                model: 'llama-3.3-70b',
            };
        } catch (error) {
            console.error('Groq Llama API error (falling back to mock):', error.message);
            return this._mockResponse('Llama-3.3-70B', query, sources);
        }
    }

    /**
     * Query Groq with GPT-OSS 120B (OpenAI's open-weight model — different model family)
     */
    async queryAnthropic(query, sources = [], previousContext = null, academicPapers = []) {
        try {
            if (!this.groq) {
                return this._mockResponse('GPT-OSS-120B', query, sources);
            }

            const prompt = previousContext
                ? followUpResearchPrompt(query, sources, previousContext, academicPapers)
                : researchPrompt(query, sources, academicPapers);

            const response = await this.groq.chat.completions.create({
                model: 'openai/gpt-oss-120b',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert research assistant. Always respond with valid JSON and nothing else. Do not wrap in markdown code blocks.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.3,
                max_tokens: 4000,
            });

            const content = response.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
            return {
                ...parsed,
                raw: content,
                model: 'gpt-oss-120b',
            };
        } catch (error) {
            console.error('Groq GPT-OSS 120B API error (falling back to mock):', error.message);
            return this._mockResponse('GPT-OSS-120B', query, sources);
        }
    }

    /**
     * Query both models and compare results
     */
    async compareResponses(query, sources = [], previousContext = null, academicPapers = []) {
        const [gptResponse, claudeResponse] = await Promise.allSettled([
            this.queryOpenAI(query, sources, previousContext, academicPapers),
            this.queryAnthropic(query, sources, previousContext, academicPapers),
        ]);

        return {
            gptResponse:
                gptResponse.status === 'fulfilled'
                    ? gptResponse.value
                    : this._mockResponse('Llama-3.3-70B', query, sources),
            claudeResponse:
                claudeResponse.status === 'fulfilled'
                    ? claudeResponse.value
                    : this._mockResponse('GPT-OSS-120B', query, sources),
        };
    }

    /**
     * Mock response for development/testing without API keys
     */
    _mockResponse(model, query, sources) {
        return {
            title: `Research Summary: ${query}`,
            summary: `This is a development mode response from ${model}. In production with a valid Groq API key, this would contain a comprehensive research summary about "${query}" based on ${sources.length} web sources. Configure your GROQ_API_KEY in .env to enable real AI-powered research.`,
            key_points: [
                `Key insight 1 about ${query} from ${model}`,
                `Key insight 2 with source verification`,
                `Key insight 3 covering related aspects`,
                `Key insight 4 about implications and applications`,
                `Key insight 5 summarizing consensus findings`,
            ],
            confidence_score: 0.75,
            raw: `Mock response from ${model}`,
            model: model.toLowerCase(),
        };
    }
}

module.exports = new LLMService();
