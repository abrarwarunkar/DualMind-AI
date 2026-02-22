const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ResearchSession',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            default: 'Untitled Note',
            trim: true,
        },
        content: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        markdownVersion: {
            type: String,
            default: '',
        },
        tags: [String],
        lastEdited: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

noteSchema.pre('save', function (next) {
    this.lastEdited = new Date();
    next();
});

module.exports = mongoose.model('Note', noteSchema);
