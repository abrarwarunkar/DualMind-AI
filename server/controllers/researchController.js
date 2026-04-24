const Joi = require('joi');
const ResearchSession = require('../models/ResearchSession');
const Note = require('../models/Note');
const llmService = require('../services/llmService');
const searchService = require('../services/searchService');
const summaryService = require('../services/summaryService');
const hallucinationService = require('../services/hallucinationService');
const academicSearchService = require('../services/academicSearchService');
const knowledgeGraphService = require('../services/knowledgeGraphService');
const ApiResponse = require('../utils/apiResponse');

const researchSchema = Joi.object({
    query: Joi.string().trim().min(5).max(1000).required(),
    compareMode: Joi.boolean().default(true),
    parentSessionId: Joi.string().uuid().optional().allow(null, ''),
});

/**
 * @route   POST /api/research
 * @desc    Run a full research pipeline (supports follow-up chains)
 */
exports.createResearch = async (req, res, next) => {
    try {
        const { error, value } = researchSchema.validate(req.body);
        if (error) return ApiResponse.badRequest(res, error.details[0].message);

        const { query, compareMode, parentSessionId } = value;

        // If this is a follow-up, fetch parent context
        let parentSession = null;
        let chainDepth = 0;
        if (parentSessionId) {
            parentSession = await ResearchSession.findOne({
                id: parentSessionId,
                userId: req.user.id,
            });
            if (!parentSession) {
                return ApiResponse.notFound(res, 'Parent research session');
            }
            chainDepth = (parentSession.chainDepth || 0) + 1;
            if (chainDepth > 10) {
                return ApiResponse.badRequest(res, 'Research chain depth limit reached (max 10)');
            }
        }

        // 1. Create pending session
        const session = await ResearchSession.create({
            userId: req.user.id,
            query,
            compareMode,
            parentSessionId: parentSessionId || null,
            chainDepth,
            status: 'processing',
        });

        // 2. Fetch web sources + academic papers in parallel
        const [sources, academicSources] = await Promise.all([
            searchService.getGroundedSources(query),
            academicSearchService.searchPapers(query, 5),
        ]);

        // 3. Query both LLMs (with follow-up context if chain)
        let gptResponse, claudeResponse;
        if (parentSession) {
            const previousContext = {
                title: parentSession.groundedSummary?.title || parentSession.query,
                summary: parentSession.groundedSummary?.summary || '',
                key_points: parentSession.groundedSummary?.key_points || [],
            };
            ({ gptResponse, claudeResponse } = await llmService.compareResponses(
                query, sources, previousContext, academicSources
            ));
        } else {
            ({ gptResponse, claudeResponse } = await llmService.compareResponses(
                query, sources, null, academicSources
            ));
        }

        // 4. Generate grounded summary
        const groundedSummary = await summaryService.generateGroundedSummary(
            query,
            gptResponse,
            claudeResponse,
            sources
        );

        // 5. Run hallucination detection
        const hallucinationReport = await hallucinationService.detectHallucinations(
            gptResponse,
            claudeResponse,
            sources
        );

        // 6. Extract entities for knowledge graph (async, non-blocking)
        let entities = [];
        try {
            const tempSession = { query, groundedSummary };
            entities = await knowledgeGraphService.extractEntities(tempSession);
        } catch (entityError) {
            console.error('Entity extraction failed (non-blocking):', entityError.message);
        }

        // 7. Update session with results
        session.gptResponse = gptResponse;
        session.claudeResponse = claudeResponse;
        session.groundedSummary = groundedSummary;
        session.citations = groundedSummary.citations || [];
        session.hallucinationReport = hallucinationReport;
        session.sources = sources.map((s) => ({ url: s.url, title: s.title, content: s.content?.substring(0, 2000) }));
        session.academicSources = academicSources;
        session.entities = entities;
        session.status = 'completed';
        await session.save();

        // 8. Auto-create a note from the session
        await Note.create({
            sessionId: session.id,
            userId: req.user.id,
            title: groundedSummary.title || `Research: ${query}`,
            content: { summary: groundedSummary },
            markdownVersion: '',
        });

        ApiResponse.created(res, { session });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/research
 * @desc    Get all research sessions for user
 */
exports.getResearchSessions = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;

        let filter = { userId: req.user.id };
        if (search) {
            filter.$text = { $search: search };
        }

        const [sessions, total] = await Promise.all([
            ResearchSession.find(filter, {
                sort: { createdAt: -1 },
                skip,
                limit,
            }),
            ResearchSession.countDocuments(filter),
        ]);

        ApiResponse.success(res, {
            sessions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/research/:id
 * @desc    Get single research session
 */
exports.getResearchSession = async (req, res, next) => {
    try {
        const session = await ResearchSession.findOne({
            id: req.params.id,
            userId: req.user.id,
        });

        if (!session) {
            return ApiResponse.notFound(res, 'Research session');
        }

        ApiResponse.success(res, { session });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/research/:id/chain
 * @desc    Get the full research chain/thread for a session
 */
exports.getResearchChain = async (req, res, next) => {
    try {
        const session = await ResearchSession.findOne({
            id: req.params.id,
            userId: req.user.id,
        });

        if (!session) {
            return ApiResponse.notFound(res, 'Research session');
        }

        // Walk up the chain to find the root
        let rootId = session.id;
        let current = session;
        const visited = new Set([rootId]);

        while (current.parentSessionId) {
            if (visited.has(current.parentSessionId)) break;
            visited.add(current.parentSessionId);
            const parent = await ResearchSession.findOne({
                id: current.parentSessionId,
                userId: req.user.id,
            });
            if (!parent) break;
            rootId = parent.id;
            current = parent;
        }

        // Now fetch all sessions in this chain from root downward
        const allSessions = await ResearchSession.find({
            userId: req.user.id,
            status: 'completed',
        }, {
            select: 'id, query, parent_session_id, chain_depth, grounded_summary, created_at, status',
        });

        // Build the chain starting from root
        const chain = [];
        const buildChain = (parentId) => {
            const children = allSessions.filter(
                (s) => (s.parentSessionId || null) === (parentId || null)
                    && (parentId ? true : s.id === rootId)
            );
            for (const child of children) {
                chain.push({
                    _id: child.id,
                    id: child.id,
                    query: child.query,
                    title: child.groundedSummary?.title || child.query,
                    chainDepth: child.chainDepth || 0,
                    createdAt: child.createdAt,
                    isCurrent: child.id === req.params.id,
                });
                buildChain(child.id);
            }
        };

        buildChain(current.parentSessionId || null);
        // If chain is empty (root session has no parent), add the root
        if (chain.length === 0) {
            chain.push({
                _id: session.id,
                id: session.id,
                query: session.query,
                title: session.groundedSummary?.title || session.query,
                chainDepth: session.chainDepth || 0,
                createdAt: session.createdAt,
                isCurrent: true,
            });
        }

        // Sort by chainDepth then createdAt
        chain.sort((a, b) => a.chainDepth - b.chainDepth || new Date(a.createdAt) - new Date(b.createdAt));

        ApiResponse.success(res, { chain });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/research/:id
 * @desc    Delete a research session
 */
exports.deleteResearchSession = async (req, res, next) => {
    try {
        const session = await ResearchSession.findOneAndDelete({
            id: req.params.id,
            userId: req.user.id,
        });

        if (!session) {
            return ApiResponse.notFound(res, 'Research session');
        }

        // Also delete associated notes (CASCADE should handle this, but be explicit)
        await Note.deleteMany({ sessionId: session.id });

        ApiResponse.success(res, { message: 'Research session deleted' });
    } catch (error) {
        next(error);
    }
};
