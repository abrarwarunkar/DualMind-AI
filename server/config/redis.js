const { createClient } = require('redis');
const keys = require('./keys');

let hasLoggedError = false;

const redisClient = createClient({
    url: keys.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            // Stop trying after 3 attempts without a successful connection
            if (retries > 3) {
                return new Error('Redis max retries reached');
            }
            return Math.min(retries * 50, 500);
        }
    }
});

redisClient.on('error', (err) => {
    if (!hasLoggedError) {
        // Silently swallow the stack trace as we gracefully fall back to MemoryStore
        hasLoggedError = true;
    }
});

redisClient.on('connect', () => {
    hasLoggedError = false; // reset flag on successful reconnect
    console.log('✅ Redis connected successfully');
});

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.warn('⚠️ Redis connection permanently failed. Local memory store will be used.');
    }
};

module.exports = {
    redisClient,
    connectRedis
};
