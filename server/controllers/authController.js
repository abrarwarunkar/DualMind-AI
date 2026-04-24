const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const keys = require('../config/keys');
const ApiResponse = require('../utils/apiResponse');

// Validation schemas
const registerSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

/**
 * Generate JWT token
 */
const generateToken = (id) => {
    return jwt.sign({ id }, keys.JWT_SECRET, { expiresIn: keys.JWT_EXPIRE });
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 */
exports.register = async (req, res, next) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) return ApiResponse.badRequest(res, error.details[0].message);

        const { name, email, password } = value;

        // Check existing user
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return ApiResponse.badRequest(res, 'An account with this email already exists');
        }

        const user = await User.create({ name, email, password });
        const token = generateToken(user.id);

        ApiResponse.created(res, {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                subscriptionType: user.subscriptionType,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 */
exports.login = async (req, res, next) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) return ApiResponse.badRequest(res, error.details[0].message);

        const { email, password } = value;

        const user = await User.findOne({ email: email.toLowerCase() }, { selectPassword: true });
        if (!user) {
            return ApiResponse.unauthorized(res, 'Invalid credentials');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return ApiResponse.unauthorized(res, 'Invalid credentials');
        }

        const token = generateToken(user.id);

        ApiResponse.success(res, {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                subscriptionType: user.subscriptionType,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 */
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        ApiResponse.success(res, {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                subscriptionType: user.subscriptionType,
                githubConnected: !!user.githubToken,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
};
