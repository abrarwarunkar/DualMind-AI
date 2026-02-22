const jwt = require('jsonwebtoken');
const User = require('../models/User');
const keys = require('../config/keys');

/**
 * Protect routes — verifies JWT token and populates req.user
 */
const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized — no token provided',
            });
        }

        const decoded = jwt.verify(token, keys.JWT_SECRET);
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Not authorized — invalid token',
        });
    }
};

/**
 * Role-based access guard
 * @param  {...string} roles - Allowed roles (e.g., 'pro', 'basic')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.subscriptionType)) {
            return res.status(403).json({
                success: false,
                error: `Subscription type '${req.user.subscriptionType}' is not authorized for this resource`,
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
