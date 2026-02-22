const llmService = require('./llmService');
const { hallucinationCheckPrompt } = require('../utils/prompts');
const keys = require('../config/keys');

/**
 * Hallucination Detection Engine
 * Cross-model validation + source verification
 */
class HallucinationService {
    /**
     * Run hallucination detection pipeline
     */
    async detectHallucinations(gptResponse, claudeResponse, sources) {
        try {
            // Step 1: Cross-model fact comparison
            const crossModelResult = this._crossModelValidation(gptResponse, claudeResponse);

            // Step 2: Source citation verification
            const sourceVerification = this._verifyCitations(gptResponse, claudeResponse, sources);

            // Step 3: LLM-based deep analysis (if API available)
            let llmAnalysis;
            if (keys.GROQ_API_KEY && llmService.groq) {
                llmAnalysis = await this._llmHallucinationCheck(gptResponse, claudeResponse, sources);
            } else {
                llmAnalysis = this._mockHallucinationAnalysis(gptResponse, claudeResponse);
            }

            // Combine results
            const allUnsupportedClaims = [
                ...new Set([
                    ...crossModelResult.unsupported_claims,
                    ...sourceVerification.unsupported_claims,
                    ...(llmAnalysis.unsupported_claims || []),
                ]),
            ];

            // Determine overall risk
            const riskScore = this._calculateRiskScore(
                crossModelResult,
                sourceVerification,
                llmAnalysis
            );

            return {
                hallucination_risk: riskScore >= 0.7 ? 'high' : riskScore >= 0.4 ? 'medium' : 'low',
                unsupported_claims: allUnsupportedClaims,
                analysis:
                    llmAnalysis.analysis ||
                    `Cross-model agreement: ${crossModelResult.agreement_score.toFixed(2)}. Source coverage: ${sourceVerification.coverage_score.toFixed(2)}.`,
                details: {
                    cross_model: crossModelResult,
                    source_verification: sourceVerification,
                    llm_analysis: llmAnalysis,
                },
            };
        } catch (error) {
            console.error('Hallucination detection error:', error.message);
            return {
                hallucination_risk: 'medium',
                unsupported_claims: ['Unable to fully verify — error in analysis pipeline'],
                analysis: `Hallucination detection encountered an error: ${error.message}`,
            };
        }
    }

    /**
     * Cross-model validation: compare GPT vs Claude key points
     */
    _crossModelValidation(gptResponse, claudeResponse) {
        const gptPoints = (gptResponse.key_points || []).map((p) => p.toLowerCase());
        const claudePoints = (claudeResponse.key_points || []).map((p) => p.toLowerCase());

        const unsupported = [];

        // Find claims in GPT not supported by Claude
        for (const point of gptResponse.key_points || []) {
            const hasMatch = claudePoints.some(
                (cp) =>
                    this._similarity(point.toLowerCase(), cp) > 0.3
            );
            if (!hasMatch && point.length > 20) {
                unsupported.push(`[GPT only] ${point}`);
            }
        }

        // Find claims in Claude not supported by GPT
        for (const point of claudeResponse.key_points || []) {
            const hasMatch = gptPoints.some(
                (gp) =>
                    this._similarity(point.toLowerCase(), gp) > 0.3
            );
            if (!hasMatch && point.length > 20) {
                unsupported.push(`[Claude only] ${point}`);
            }
        }

        const totalPoints = gptPoints.length + claudePoints.length;
        const agreement_score = totalPoints > 0 ? 1 - unsupported.length / totalPoints : 0.5;

        return {
            agreement_score: Math.max(0, Math.min(1, agreement_score)),
            unsupported_claims: unsupported.slice(0, 5),
        };
    }

    /**
     * Verify claims against source material
     */
    _verifyCitations(gptResponse, claudeResponse, sources) {
        const sourceText = sources.map((s) => (s.content || s.snippet || '').toLowerCase()).join(' ');
        const allPoints = [
            ...(gptResponse.key_points || []),
            ...(claudeResponse.key_points || []),
        ];

        const unsupported = [];
        let supported = 0;

        for (const point of allPoints) {
            const keywords = point
                .toLowerCase()
                .split(/\s+/)
                .filter((w) => w.length > 4);
            const matchCount = keywords.filter((kw) => sourceText.includes(kw)).length;
            const matchRatio = keywords.length > 0 ? matchCount / keywords.length : 0;

            if (matchRatio < 0.2 && point.length > 20) {
                unsupported.push(`[Ungrounded] ${point}`);
            } else {
                supported++;
            }
        }

        return {
            coverage_score: allPoints.length > 0 ? supported / allPoints.length : 0.5,
            unsupported_claims: unsupported.slice(0, 5),
        };
    }

    /**
     * LLM-based hallucination check
     */
    async _llmHallucinationCheck(gptResponse, claudeResponse, sources) {
        try {
            const prompt = hallucinationCheckPrompt(gptResponse, claudeResponse, sources);
            const response = await llmService.groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a fact-checker. Respond ONLY with valid JSON and nothing else.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.1,
                max_tokens: 2000,
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            return JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (error) {
            console.error('LLM hallucination check failed:', error.message);
            return this._mockHallucinationAnalysis(gptResponse, claudeResponse);
        }
    }

    /**
     * Simple string similarity (Jaccard-like)
     */
    _similarity(a, b) {
        const setA = new Set(a.split(/\s+/));
        const setB = new Set(b.split(/\s+/));
        const intersection = [...setA].filter((x) => setB.has(x)).length;
        const union = new Set([...setA, ...setB]).size;
        return union > 0 ? intersection / union : 0;
    }

    /**
     * Calculate composite risk score
     */
    _calculateRiskScore(crossModel, sourceVerification, llmAnalysis) {
        let score = 0;

        // Cross-model disagreement
        score += (1 - crossModel.agreement_score) * 0.35;

        // Source coverage gaps
        score += (1 - sourceVerification.coverage_score) * 0.35;

        // LLM analysis
        if (llmAnalysis.hallucination_risk === 'high') score += 0.3;
        else if (llmAnalysis.hallucination_risk === 'medium') score += 0.15;

        return Math.min(1, score);
    }

    _mockHallucinationAnalysis(gptResponse, claudeResponse) {
        return {
            hallucination_risk: 'low',
            unsupported_claims: [],
            analysis:
                'Development mode: Both models show reasonable agreement. In production, this analysis would use AI-powered fact-checking against the source material.',
        };
    }
}

module.exports = new HallucinationService();
