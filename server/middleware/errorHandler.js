/**
 * Centralized error handler middleware
 */
const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
    const requestId = req.requestId || 'unknown';

    logger.error(`[${requestId}] Error:`, {
        message: err.message,
        stack: err.stack,
        path: req.originalUrl,
        method: req.method,
        statusCode: err.statusCode || 500
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            requestId,
            details: messages,
        });
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            success: false,
            error: `Duplicate value for field: ${field}`,
            requestId,
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token',
            requestId,
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired',
            requestId,
        });
    }

    // Supabase/Postgres errors
    if (err.code && err.code.startsWith('PGRST')) {
        return res.status(400).json({
            success: false,
            error: 'Database operation failed',
            requestId,
        });
    }

    // Default - don't expose internal errors in production
    const message = err.message || 'Internal Server Error';
    const displayMessage = process.env.NODE_ENV === 'production' && !err.statusCode
        ? 'An unexpected error occurred'
        : message;

    res.status(err.statusCode || 500).json({
        success: false,
        error: displayMessage,
        requestId: process.env.NODE_ENV === 'production' ? requestId : undefined,
    });
};

module.exports = errorHandler;
