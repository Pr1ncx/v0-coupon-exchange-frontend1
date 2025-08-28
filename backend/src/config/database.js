import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from './logger.js';

dotenv.config();

export async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/coupon-saas';
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, {
    maxPoolSize: Number(process.env.DB_MAX_POOL_SIZE || 10),
  });
  logger.info('Connected to MongoDB');
}

