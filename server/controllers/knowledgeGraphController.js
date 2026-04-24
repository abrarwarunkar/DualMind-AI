const ResearchSession = require('../models/ResearchSession');
const knowledgeGraphService = require('../services/knowledgeGraphService');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   GET /api/knowledge-graph
 * @desc    Get aggregated knowledge graph for the authenticated user
 */
exports.getKnowledgeGraph = async (req, res, next) => {
    try {
        const graph = await knowledgeGraphService.buildUserGraph(req.user.id);
        ApiResponse.success(res, { graph });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/knowledge-graph/extract/:sessionId
 * @desc    Trigger entity extraction for a specific session
 */
exports.extractEntities = async (req, res, next) => {
    try {
        const session = await ResearchSession.findOne({
            id: req.params.sessionId,
            userId: req.user.id,
            status: 'completed',
        });

        if (!session) {
            return ApiResponse.notFound(res, 'Research session');
        }

        const entities = await knowledgeGraphService.extractEntities(session);
        session.entities = entities;
        await session.save();

        ApiResponse.success(res, { entities });
    } catch (error) {
        next(error);
    }
};
