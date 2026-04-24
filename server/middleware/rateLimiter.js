const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const MemoryStore = require('express-rate-limit').MemoryStore;
const { redisClient } = require('../config/redis');

class DualStore {
    constructor(prefix) {
        this.prefix = prefix;
        this.memoryStore = new MemoryStore();
        this.redisStore = null;
    }

    init(options) {
        this.memoryStore.init(options);

        const initRedis = () => {
            if (!this.redisStore) {
                try {
                    this.redisStore = new RedisStore({
                        prefix: `rl:${this.prefix}:`,
                        sendCommand: (...args) => redisClient.sendCommand(args)
                    });
                } catch (e) {
                    console.warn(`[DualStore] Failed to init RedisStore for ${this.prefix}`);
                }
            }
        };

        if (redisClient.isOpen) {
            initRedis();
        } else {
            redisClient.on('ready', initRedis);
        }
    }

    async increment(key) {
        if (this.redisStore && redisClient.isOpen) {
            try {
                return await this.redisStore.increment(key);
            } catch (e) {}
        }
        return this.memoryStore.increment(key);
    }

    async decrement(key) {
        if (this.redisStore && redisClient.isOpen) {
            try { await this.redisStore.decrement(key); return; } catch (e) {}
        }
        this.memoryStore.decrement(key);
    }

    resetKey(key) {
        if (this.redisStore && redisClient.isOpen) {
            try { this.redisStore.resetKey(key); return; } catch (e) {}
        }
        this.memoryStore.resetKey(key);
    }
}

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    store: new DualStore('general'),
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
    store: new DualStore('ai'),
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
    store: new DualStore('auth'),
    message: {
        success: false,
        error: 'Too many authentication attempts — please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { generalLimiter, aiLimiter, authLimiter };
