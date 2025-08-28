require('express-async-errors');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Import configurations and utilities
const config = require('./config');
const logger = require('./config/logger');
const database = require('./config/database');

// Import middlewares
const {
  performanceMonitor,
  generalRateLimit,
  corsOptions,
  helmetOptions,
  sanitizeRequest,
  securityLogger,
  attackPrevention,
  securityHeaders,
  globalErrorHandler,
  notFoundHandler,
  handleSpecificErrors,
  handleSecurityErrors,
  enhanceRateLimitError
} = require('./middlewares');

// Import routes
const routes = require('./routes');

// Import payment controller for webhook handling
const paymentController = require('./controllers/paymentController');

// Create Express application
const app = express();

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security headers
app.use(securityHeaders);

// Helmet for additional security
app.use(helmet(helmetOptions));

// CORS configuration
app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Performance monitoring
app.use(performanceMonitor);

// Security logging
app.use(securityLogger);

// Attack prevention
app.use(attackPrevention);

// Rate limiting
app.use(generalRateLimit);

// Stripe webhook endpoint (needs raw body)
app.post('/api/v1/payments/webhook', 
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

// Body parsing middleware (after webhook)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request sanitization
app.use(sanitizeRequest);

// Error handling for specific issues
app.use(handleSpecificErrors);

// Serve static files (uploads)
app.use('/uploads', express.static('uploads', {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set cache headers for static files
    if (path.includes('thumbnails')) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week for thumbnails
    } else {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 1 month for original files
    }
  }
}));

// Swagger documentation setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Coupon Exchange SaaS API',
      version: '1.0.0',
      description: `
        A production-ready, gamified coupon exchange platform built with Node.js, Express, and MongoDB.
        
        ## Features
        - **User Authentication**: JWT-based authentication with refresh tokens
        - **Freemium Model**: Free users limited to 3 daily claims, premium unlimited
        - **Gamification**: Points, badges, achievements, and leaderboards
        - **Payment Integration**: Stripe subscription management
        - **File Upload**: Image processing with Sharp
        - **Rate Limiting**: User-tier based rate limiting
        - **Monitoring**: Real-time analytics and health checks
        - **Admin Dashboard**: User and content management
        
        ## Authentication
        Use the /auth/register or /auth/login endpoints to obtain access tokens.
        Include the access token in the Authorization header: "Bearer YOUR_TOKEN"
        
        ## Rate Limits
        - Free users: 100 requests per 15 minutes
        - Premium users: 200 requests per 15 minutes
        - Admin users: 1000 requests per 15 minutes
        
        ## Error Handling
        The API uses conventional HTTP response codes and returns detailed error information in JSON format.
      `,
      contact: {
        name: 'API Support',
        email: 'support@couponexchange.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: config.isDevelopment() ? `http://localhost:${config.PORT}` : 'https://api.couponexchange.com',
        description: config.isDevelopment() ? 'Development server' : 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    tags: [
      {
        name: 'General',
        description: 'General API information'
      },
      {
        name: 'Authentication',
        description: 'User authentication and account management'
      },
      {
        name: 'Users',
        description: 'User profile and activity management'
      },
      {
        name: 'Coupons',
        description: 'Coupon management and interaction'
      },
      {
        name: 'Payments',
        description: 'Payment and subscription management'
      },
      {
        name: 'Upload',
        description: 'File upload and management'
      },
      {
        name: 'Monitoring',
        description: 'System monitoring and analytics'
      },
      {
        name: 'Admin',
        description: 'Administrative functions'
      }
    ]
  },
  apis: ['./src/routes/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Coupon Exchange API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// Health check endpoint (before API routes)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1', routes);

// Security error handling
app.use(handleSecurityErrors);

// Rate limit error enhancement
app.use(enhanceRateLimitError);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Database connection and server startup
async function startServer() {
  try {
    // Connect to database
    await database.connect();
    logger.info('Database connected successfully');

    // Start HTTP server
    const PORT = config.PORT;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`, {
        environment: config.NODE_ENV,
        port: PORT,
        apiDocs: `http://localhost:${PORT}/api-docs`,
        health: `http://localhost:${PORT}/health`
      });
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await database.disconnect();
          logger.info('Database disconnected');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions in production
    if (config.isProduction()) {
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        gracefulShutdown('UNCAUGHT_EXCEPTION');
      });

      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        gracefulShutdown('UNHANDLED_REJECTION');
      });
    }

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;