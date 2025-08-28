import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database.js';
import { logger } from './config/logger.js';
import apiRouter from './routes/index.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan('combined'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX || 100) });
app.use(limiter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/v1', apiRouter);

const port = process.env.PORT || 5000;

connectDatabase()
  .then(() => {
    app.listen(port, () => logger.info(`Server running on port ${port}`));
  })
  .catch((error) => {
    logger.error('Failed to connect to database', { error: error?.message });
    process.exit(1);
  });

export default app;
