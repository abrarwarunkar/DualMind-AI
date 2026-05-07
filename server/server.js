const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const keys = require('./config/keys');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const requestIdMiddleware = require('./middleware/requestId');

// Route imports
const authRoutes = require('./routes/auth');
const researchRoutes = require('./routes/research');
const exportRoutes = require('./routes/export');
const githubRoutes = require('./routes/github');
const notesRoutes = require('./routes/notes');
const knowledgeGraphRoutes = require('./routes/knowledgeGraph');

const app = express();

// ──── Security Middleware ────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ['\'self\''],
            styleSrc: ['\'self\'', '\'unsafe-inline\''],
            scriptSrc: ['\'self\''],
            imgSrc: ['\'self\'', 'data:', 'https:'],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: keys.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ──── Core Middleware ────
app.use(requestIdMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(generalLimiter);

// ──── Logging ────
if (keys.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.http(message.trim()),
        },
    }));
}

// ──── Health Check ────
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            environment: keys.NODE_ENV,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        },
    });
});

// ──── API Routes ────
app.use('/api/auth', authRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/knowledge-graph', knowledgeGraphRoutes);

// ──── 404 Handler ────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.originalUrl} not found`,
        requestId: req.requestId,
    });
});

// ──── Error Handler ────
app.use(errorHandler);

// ──── Graceful Shutdown ────
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    const closeConnections = async () => {
        try {
            const { redisClient } = require('./config/redis');
            if (redisClient.isOpen) {
                await redisClient.quit();
                logger.info('Redis connection closed');
            }
        } catch (err) {
            logger.error('Error closing Redis:', err.message);
        }
    };

    await closeConnections();

    logger.info('Graceful shutdown complete');
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ──── Start Server ────
const PORT = keys.PORT;

const startServer = async () => {
    try {
        await connectDB();
        await connectRedis();

        const server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   🧠 ResearchMind AI Server              ║
  ║                                           ║
  ║   Environment: ${keys.NODE_ENV.padEnd(25)}║
  ║   Port:        ${String(PORT).padEnd(25)}║
  ║   Status:      Running ✅                ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
            `);
        });

        server.keepAliveTimeout = 120 * 1000;
        server.headersTimeout = 120 * 1000;

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            logger.error('Uncaught Exception:', { message: err.message, stack: err.stack });
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

    } catch (error) {
        logger.error('Failed to start server:', { message: error.message, stack: error.stack });
        process.exit(1);
    }
};

startServer();

module.exports = app;
