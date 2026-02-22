const Note = require('../models/Note');
const exportService = require('../services/exportService');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   GET /api/notes
 * @desc    Get all notes for user
 */
exports.getNotes = async (req, res, next) => {
    try {
        const notes = await Note.find({ userId: req.user._id })
            .sort({ lastEdited: -1 })
            .select('title sessionId tags lastEdited createdAt');

        ApiResponse.success(res, { notes });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/notes/:id
 * @desc    Get single note
 */
exports.getNote = async (req, res, next) => {
    try {
        const note = await Note.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!note) return ApiResponse.notFound(res, 'Note');

        ApiResponse.success(res, { note });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/notes/:id
 * @desc    Update a note
 */
exports.updateNote = async (req, res, next) => {
    try {
        const { title, content, markdownVersion, tags } = req.body;

        const note = await Note.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!note) return ApiResponse.notFound(res, 'Note');

        if (title !== undefined) note.title = title;
        if (content !== undefined) note.content = content;
        if (markdownVersion !== undefined) note.markdownVersion = markdownVersion;
        if (tags !== undefined) note.tags = tags;

        await note.save();

        ApiResponse.success(res, { note });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete a note
 */
exports.deleteNote = async (req, res, next) => {
    try {
        const note = await Note.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!note) return ApiResponse.notFound(res, 'Note');

        ApiResponse.success(res, { message: 'Note deleted' });
    } catch (error) {
        next(error);
    }
};
