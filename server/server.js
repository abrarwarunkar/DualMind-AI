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

// Route imports
const authRoutes = require('./routes/auth');
const researchRoutes = require('./routes/research');
const exportRoutes = require('./routes/export');
const githubRoutes = require('./routes/github');
const notesRoutes = require('./routes/notes');
const knowledgeGraphRoutes = require('./routes/knowledgeGraph');

const app = express();

// ──── Security Middleware ────
app.use(helmet());
app.use(cors({
    origin: keys.CLIENT_URL,
    credentials: true,
}));

// ──── Core Middleware ────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(generalLimiter);

// ──── Logging ────
if (keys.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
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
    });
});

// ──── Error Handler ────
app.use(errorHandler);

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
        
        // Fix for Next.js API proxy Socket Hang up (ECONNRESET)
        // Ensure Node's keepAliveTimeout is larger than Next's proxy timeout
        server.keepAliveTimeout = 120 * 1000;
        server.headersTimeout = 120 * 1000;
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
