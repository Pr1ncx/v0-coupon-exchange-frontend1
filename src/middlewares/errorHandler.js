const logger = require('../config/logger');
const config = require('../config');

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle different types of errors
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
  return new AppError(message, 400, 'DUPLICATE_FIELD');
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again!', 401, 'INVALID_TOKEN');
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired! Please log in again.', 401, 'TOKEN_EXPIRED');
};

const handleStripeError = (err) => {
  let message = 'Payment processing error';
  let statusCode = 400;
  
  switch (err.type) {
    case 'StripeCardError':
      message = err.message;
      break;
    case 'StripeRateLimitError':
      message = 'Too many requests to payment processor';
      statusCode = 429;
      break;
    case 'StripeInvalidRequestError':
      message = 'Invalid payment request';
      break;
    case 'StripeAPIError':
      message = 'Payment service temporarily unavailable';
      statusCode = 503;
      break;
    case 'StripeConnectionError':
      message = 'Network error with payment processor';
      statusCode = 503;
      break;
    case 'StripeAuthenticationError':
      message = 'Payment processor authentication error';
      statusCode = 500;
      break;
    default:
      message = 'Payment processing error';
  }
  
  return new AppError(message, statusCode, 'PAYMENT_ERROR');
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, req, res) => {
  // API errors
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.errorCode || 'INTERNAL_ERROR',
      message: err.message,
      stack: err.stack,
      details: err
    });
  }
  
  // Rendered website errors (if implementing frontend)
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    error: err
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, req, res) => {
  // API errors
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        error: err.errorCode || 'OPERATIONAL_ERROR',
        message: err.message
      });
    }
    
    // Programming or other unknown error: don't leak error details
    logger.error('Programming error:', err);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Something went wrong!'
    });
  }
  
  // Rendered website errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }
  
  // Programming or other unknown error
  logger.error('Programming error:', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
};

/**
 * Global error handling middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Log error details
  logger.error('Error occurred:', {
    error: err.message,
    statusCode: err.statusCode,
    errorCode: err.errorCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id,
    timestamp: new Date().toISOString()
  });
  
  if (config.isDevelopment()) {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    
    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.type && error.type.includes('Stripe')) error = handleStripeError(error);
    
    sendErrorProd(error, req, res);
  }
};

/**
 * Handle unhandled routes
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'NOT_FOUND');
  next(err);
};

/**
 * Async error wrapper
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Validate async function wrapper
 */
const validateAsync = (validationFn) => {
  return catchAsync(async (req, res, next) => {
    await validationFn(req, res, next);
  });
};

/**
 * Handle specific error types for better UX
 */
const handleSpecificErrors = (req, res, next) => {
  // Handle multipart form errors
  if (req.fileUploadError) {
    return next(new AppError(req.fileUploadError, 400, 'FILE_UPLOAD_ERROR'));
  }
  
  // Handle malformed JSON
  if (req.body && req.body.constructor === Object && Object.keys(req.body).length === 0 && req.method !== 'GET') {
    if (req.get('Content-Type') && req.get('Content-Type').includes('application/json')) {
      return next(new AppError('Invalid JSON in request body', 400, 'INVALID_JSON'));
    }
  }
  
  next();
};

/**
 * Security error handler
 */
const handleSecurityErrors = (err, req, res, next) => {
  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    return next(new AppError('Cross-origin request not allowed', 403, 'CORS_ERROR'));
  }
  
  // Handle CSRF errors
  if (err.code === 'EBADCSRFTOKEN') {
    return next(new AppError('Invalid CSRF token', 403, 'CSRF_ERROR'));
  }
  
  next(err);
};

/**
 * Rate limit error enhancement
 */
const enhanceRateLimitError = (err, req, res, next) => {
  if (err.statusCode === 429) {
    const upgradeMessage = !req.user?.isPremium ? 
      ' Upgrade to premium for higher limits.' : '';
    
    err.message += upgradeMessage;
    err.upgradeUrl = '/api/v1/payments/checkout';
  }
  
  next(err);
};

module.exports = {
  AppError,
  globalErrorHandler,
  notFoundHandler,
  catchAsync,
  validateAsync,
  handleSpecificErrors,
  handleSecurityErrors,
  enhanceRateLimitError
};