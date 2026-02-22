require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const requiredKeys = ['MONGODB_URI', 'JWT_SECRET'];

const keys = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT, 10) || 5000,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    SERPAPI_KEY: process.env.SERPAPI_KEY,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
};

// Validate required keys in production
if (keys.NODE_ENV === 'production') {
    for (const key of requiredKeys) {
        if (!keys[key]) {
            throw new Error(`❌ Missing required environment variable: ${key}`);
        }
    }
}

module.exports = keys;
