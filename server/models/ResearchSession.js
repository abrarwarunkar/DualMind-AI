const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema({
    url: String,
    title: String,
    snippet: String,
});

const researchSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        query: {
            type: String,
            required: [true, 'Research query is required'],
            trim: true,
        },
        gptResponse: {
            title: String,
            summary: String,
            key_points: [String],
            confidence_score: Number,
            raw: String,
        },
        claudeResponse: {
            title: String,
            summary: String,
            key_points: [String],
            confidence_score: Number,
            raw: String,
        },
        groundedSummary: {
            title: String,
            summary: String,
            key_points: [String],
            citations: [citationSchema],
            confidence_score: Number,
        },
        citations: [citationSchema],
        hallucinationReport: {
            hallucination_risk: {
                type: String,
                enum: ['low', 'medium', 'high'],
                default: 'low',
            },
            unsupported_claims: [String],
            analysis: String,
        },
        sources: [
            {
                url: String,
                title: String,
                content: String,
            },
        ],
        academicSources: [
            {
                title: String,
                authors: [String],
                year: Number,
                abstract: String,
                url: String,
                citationCount: Number,
                source: { type: String, enum: ['arxiv', 'scholar'] },
            },
        ],
        entities: [
            {
                name: String,
                category: { type: String, enum: ['technology', 'concept', 'person', 'organization', 'method', 'field', 'other'] },
            },
        ],
        parentSessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ResearchSession',
            default: null,
        },
        chainDepth: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending',
        },
        compareMode: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

researchSessionSchema.index({ userId: 1, createdAt: -1 });
researchSessionSchema.index({ query: 'text' });

module.exports = mongoose.model('ResearchSession', researchSessionSchema);
