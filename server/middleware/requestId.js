const { randomUUID } = require('crypto');

const requestIdMiddleware = (req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
};

module.exports = requestIdMiddleware;