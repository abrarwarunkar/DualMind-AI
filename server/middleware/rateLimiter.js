const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        error: 'Too many requests — please try again in 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * AI endpoint rate limiter (more restrictive)
 */
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: {
        success: false,
        error: 'AI query rate limit exceeded — please wait before sending another research query',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Auth endpoint rate limiter (prevent brute force)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: 'Too many authentication attempts — please try again later',
    },
});

module.exports = { generalLimiter, aiLimiter, authLimiter };
