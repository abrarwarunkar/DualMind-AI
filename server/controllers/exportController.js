const ResearchSession = require('../models/ResearchSession');
const exportService = require('../services/exportService');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   POST /api/export/pdf
 * @desc    Export research session as PDF
 */
exports.exportPDF = async (req, res, next) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return ApiResponse.badRequest(res, 'sessionId is required');

        const session = await ResearchSession.findOne({
            id: sessionId,
            userId: req.user.id,
        });

        if (!session) return ApiResponse.notFound(res, 'Research session');

        const pdfBuffer = await exportService.exportToPDF(session);

        const filename = `research-${session.query.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length,
        });

        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/export/markdown
 * @desc    Export research session as Markdown
 */
exports.exportMarkdown = async (req, res, next) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return ApiResponse.badRequest(res, 'sessionId is required');

        const session = await ResearchSession.findOne({
            id: sessionId,
            userId: req.user.id,
        });

        if (!session) return ApiResponse.notFound(res, 'Research session');

        const markdown = exportService.exportToMarkdown(session);

        const filename = `research-${session.query.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.md`;

        res.set({
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="${filename}"`,
        });

        res.send(markdown);
    } catch (error) {
        next(error);
    }
};
