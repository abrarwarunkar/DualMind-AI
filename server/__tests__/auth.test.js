const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');

// Setup minimal Express app for testing
const app = express();
app.use(express.json());

// Mock keys
jest.mock('../config/keys', () => ({
    NODE_ENV: 'test',
    PORT: 5001,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/researchmind_test',
    JWT_SECRET: 'test-jwt-secret-key',
    JWT_EXPIRE: '1d',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    SERPAPI_KEY: '',
}));

const User = require('../models/User');
const authRoutes = require('../routes/auth');
app.use('/api/auth', authRoutes);

describe('Auth API', () => {
    beforeAll(async () => {
        const keys = require('../config/keys');
        await mongoose.connect(keys.MONGODB_URI);
    });

    afterAll(async () => {
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await User.deleteMany({});
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const res = await request(app).post('/api/auth/register').send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
            expect(res.body.data.user.email).toBe('test@example.com');
            expect(res.body.data.user.subscriptionType).toBe('basic');
        });

        it('should reject duplicate email', async () => {
            await User.create({
                name: 'Existing',
                email: 'dupe@example.com',
                password: 'password123',
            });

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
        beforeEach(async () => {
            await User.create({
                name: 'Login Test',
                email: 'login@example.com',
                password: 'password123',
            });
        });

        it('should login with valid credentials', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'login@example.com',
                password: 'password123',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
        });

        it('should reject wrong password', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'login@example.com',
                password: 'wrongpassword',
            });

            expect(res.status).toBe(401);
        });

        it('should reject non-existent email', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'nonexistent@example.com',
                password: 'password123',
            });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return user profile with valid token', async () => {
            const user = await User.create({
                name: 'Profile Test',
                email: 'profile@example.com',
                password: 'password123',
            });

            const token = jwt.sign({ id: user._id }, 'test-jwt-secret-key', { expiresIn: '1d' });

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
