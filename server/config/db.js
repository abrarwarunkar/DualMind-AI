const mongoose = require('mongoose');
const keys = require('./keys');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(keys.MONGODB_URI, {
      maxPoolSize: 10,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB runtime error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
  });
};

module.exports = connectDB;
