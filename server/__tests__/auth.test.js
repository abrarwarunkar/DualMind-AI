const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Setup minimal Express app for testing
const app = express();
app.use(express.json());

// Mock keys
jest.mock('../config/keys', () => ({
    NODE_ENV: 'test',
    PORT: 5001,
    SUPABASE_URL: 'mock-url',
    SUPABASE_SERVICE_KEY: 'mock-key',
    JWT_SECRET: 'test-jwt-secret-key',
    JWT_EXPIRE: '1d',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    SERPAPI_KEY: '',
}));

const User = require('../models/User');

jest.mock('../models/User', () => {
    return {
        create: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn(),
    };
});

const authRoutes = require('../routes/auth');
app.use('/api/auth', authRoutes);

describe('Auth API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            User.create.mockResolvedValue({
                id: '123',
                name: 'Test User',
                email: 'test@example.com',
                subscriptionType: 'basic'
            });

            const res = await request(app).post('/api/auth/register').send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
            expect(res.body.data.user.email).toBe('test@example.com');
        });

        it('should reject duplicate email', async () => {
            User.findOne.mockResolvedValue({ id: '999', email: 'dupe@example.com' });

            const res = await request(app).post('/api/auth/register').send({
                name: 'New User',
                email: 'dupe@example.com',
                password: 'password123',
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should reject invalid email', async () => {
            const res = await request(app).post('/api/auth/register').send({
                name: 'Test',
                email: 'invalid-email',
                password: 'password123',
            });

            expect(res.status).toBe(400);
        });

        it('should reject short password', async () => {
            const res = await request(app).post('/api/auth/register').send({
                name: 'Test',
                email: 'test@example.com',
                password: '123',
            });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            User.findOne.mockResolvedValue({
                id: '123',
                email: 'login@example.com',
                comparePassword: jest.fn().mockResolvedValue(true)
            });

            const res = await request(app).post('/api/auth/login').send({
                email: 'login@example.com',
                password: 'password123',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
        });

        it('should reject wrong password', async () => {
            User.findOne.mockResolvedValue({
                id: '123',
                email: 'login@example.com',
                comparePassword: jest.fn().mockResolvedValue(false)
            });

            const res = await request(app).post('/api/auth/login').send({
                email: 'login@example.com',
                password: 'wrongpassword',
            });

            expect(res.status).toBe(401);
        });

        it('should reject non-existent email', async () => {
            User.findOne.mockResolvedValue(null);

            const res = await request(app).post('/api/auth/login').send({
                email: 'nonexistent@example.com',
                password: 'password123',
            });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return user profile with valid token', async () => {
            User.findById.mockResolvedValue({
                id: '123',
                email: 'profile@example.com',
            });

            const token = jwt.sign({ id: '123' }, 'test-jwt-secret-key', { expiresIn: '1d' });

            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.user.email).toBe('profile@example.com');
        });

        it('should reject request without token', async () => {
            const res = await request(app).get('/api/auth/me');

            expect(res.status).toBe(401);
        });
    });
});
