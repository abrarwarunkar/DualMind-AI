const User = require('../models/User');
const ResearchSession = require('../models/ResearchSession');
const githubService = require('../services/githubService');
const exportService = require('../services/exportService');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   POST /api/github/connect
 * @desc    Connect GitHub account (save token)
 */
exports.connectGitHub = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) return ApiResponse.badRequest(res, 'GitHub token is required');

        // Verify token
        const verification = await githubService.verifyToken(token);
        if (!verification.valid) {
            return ApiResponse.badRequest(res, 'Invalid GitHub token');
        }

        // Save token
        await User.findByIdAndUpdate(req.user.id, { githubToken: token });

        ApiResponse.success(res, {
            message: 'GitHub account connected',
            username: verification.username,
            avatar: verification.avatar,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/github/sync
 * @desc    Sync a research session to GitHub
 */
exports.syncToGitHub = async (req, res, next) => {
    try {
        const { sessionId, owner, repo } = req.body;
        if (!sessionId || !owner || !repo) {
            return ApiResponse.badRequest(res, 'sessionId, owner, and repo are required');
        }

        // Get user's GitHub token
        const user = await User.findById(req.user.id);
        if (!user.githubToken) {
            return ApiResponse.badRequest(res, 'GitHub account not connected. Please connect first.');
        }

        // Get session
        const session = await ResearchSession.findOne({
            id: sessionId,
            userId: req.user.id,
        });
        if (!session) return ApiResponse.notFound(res, 'Research session');

        // Generate markdown
        const markdown = exportService.exportToMarkdown(session);
        const filename = `${new Date().toISOString().split('T')[0]}-${session.query
            .substring(0, 40)
            .replace(/[^a-zA-Z0-9]/g, '-')
            .toLowerCase()}.md`;

        // Push to GitHub
        const result = await githubService.syncToRepo(
            user.githubToken,
            owner,
            repo,
            filename,
            markdown
        );

        ApiResponse.success(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/github/repos
 * @desc    List user's GitHub repos
 */
exports.listRepos = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.githubToken) {
            return ApiResponse.badRequest(res, 'GitHub account not connected');
        }

        const repos = await githubService.listRepos(user.githubToken);
        ApiResponse.success(res, { repos });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/github/disconnect
 * @desc    Disconnect GitHub account
 */
exports.disconnectGitHub = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { githubToken: null });
        ApiResponse.success(res, { message: 'GitHub account disconnected' });
    } catch (error) {
        next(error);
    }
};
