require('dotenv').config();

const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 5000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Database
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/coupon-saas',
  DB_MAX_POOL_SIZE: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '1h',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID,

  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,

  // Gamification
  POINTS_UPLOAD: parseInt(process.env.POINTS_UPLOAD) || 5,
  POINTS_CLAIM: parseInt(process.env.POINTS_CLAIM) || 10,
  POINTS_BOOST: parseInt(process.env.POINTS_BOOST) || 20,
  DAILY_CLAIMS_LIMIT: parseInt(process.env.DAILY_CLAIMS_LIMIT) || 3,
  STARTING_POINTS: parseInt(process.env.STARTING_POINTS) || 100,

  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  MAX_FILES_PER_UPLOAD: parseInt(process.env.MAX_FILES_PER_UPLOAD) || 5,
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  ALLOWED_IMAGE_TYPES: (process.env.ALLOWED_IMAGE_TYPES || 'jpeg,jpg,png,webp,gif').split(','),

  // Feature Flags
  ENABLE_EMAIL_VERIFICATION: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
  ENABLE_2FA: process.env.ENABLE_2FA === 'true',
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS !== 'false',
  ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS !== 'false',
  ENABLE_FILE_UPLOAD: process.env.ENABLE_FILE_UPLOAD !== 'false',
  ENABLE_MONITORING: process.env.ENABLE_MONITORING !== 'false',

  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT) || 3600000,

  // Business
  PREMIUM_SUBSCRIPTION_PRICE: parseFloat(process.env.PREMIUM_SUBSCRIPTION_PRICE) || 9.99,
  CURRENCY: process.env.CURRENCY || 'usd',
  FREE_USER_CLAIMS_LIMIT: parseInt(process.env.FREE_USER_CLAIMS_LIMIT) || 3,
  BOOST_VISIBILITY_HOURS: parseInt(process.env.BOOST_VISIBILITY_HOURS) || 24,

  // Health Checks
  ENABLE_HEALTH_CHECKS: process.env.ENABLE_HEALTH_CHECKS !== 'false',
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
  ENABLE_PERFORMANCE_MONITORING: process.env.ENABLE_PERFORMANCE_MONITORING !== 'false',

  // Development helpers
  isDevelopment: () => config.NODE_ENV === 'development',
  isProduction: () => config.NODE_ENV === 'production',
  isTest: () => config.NODE_ENV === 'test',
};

// Validation for critical environment variables
const requiredEnvVars = [];

if (config.isProduction()) {
  requiredEnvVars.push(
    'JWT_SECRET',
    'MONGO_URI'
  );
}

// Check for missing required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Validate JWT secret minimum length
if (config.JWT_SECRET.length < 32 && config.isProduction()) {
  throw new Error('JWT_SECRET must be at least 32 characters long in production');
}

module.exports = config;