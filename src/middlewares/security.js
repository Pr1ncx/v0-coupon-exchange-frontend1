const helmet = require('helmet');
const cors = require('cors');
const config = require('../config');
const logger = require('../config/logger');

/**
 * CORS configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = config.CORS_ORIGIN.split(',').map(o => o.trim());
    
    // In development, allow all origins
    if (config.isDevelopment()) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS policy violation', {
        origin: origin,
        allowedOrigins: allowedOrigins
      });
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-New-Token'
  ],
  exposedHeaders: ['X-New-Token', 'X-RateLimit-Remaining', 'X-RateLimit-Limit']
};

/**
 * Helmet security configuration
 */
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.isProduction() ? [] : false,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
};

/**
 * Request sanitization middleware
 */
const sanitizeRequest = (req, res, next) => {
  // Remove null bytes from all string inputs
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      } else if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/\0/g, '');
        
        // Remove potential XSS patterns
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        obj[key] = obj[key].replace(/javascript:/gi, '');
        obj[key] = obj[key].replace(/on\w+=/gi, '');
      }
    }
  };
  
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  
  next();
};

/**
 * IP whitelist middleware for admin endpoints
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (config.isDevelopment()) {
      return next();
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      return next();
    }
    
    logger.warn('IP access denied', {
      clientIP: clientIP,
      allowedIPs: allowedIPs,
      endpoint: req.originalUrl,
      userAgent: req.get('User-Agent')
    });
    
    res.status(403).json({
      success: false,
      message: 'Access denied from this IP address',
      error: 'IP_NOT_ALLOWED'
    });
  };
};

/**
 * Request logging middleware for security monitoring
 */
const securityLogger = (req, res, next) => {
  const securityInfo = {
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    userId: req.user?._id,
    sessionId: req.sessionID
  };
  
  // Log sensitive endpoints
  const sensitiveEndpoints = ['/auth', '/admin', '/payments'];
  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.originalUrl.includes(endpoint)
  );
  
  if (isSensitive) {
    logger.audit('Sensitive endpoint access', securityInfo);
  }
  
  // Log failed requests after response
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400) {
      logger.warn('Failed request', {
        ...securityInfo,
        statusCode: res.statusCode,
        responseData: config.isDevelopment() ? data : undefined
      });
    }
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Detect and prevent common attacks
 */
const attackPrevention = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const url = req.originalUrl.toLowerCase();
  const body = JSON.stringify(req.body || {}).toLowerCase();
  const query = JSON.stringify(req.query || {}).toLowerCase();
  
  // SQL injection patterns
  const sqlPatterns = [
    /(\bselect\b.*\bfrom\b)/i,
    /(\bunion\b.*\bselect\b)/i,
    /(\bdrop\b.*\btable\b)/i,
    /(\binsert\b.*\binto\b)/i,
    /(\bdelete\b.*\bfrom\b)/i,
    /(\bupdate\b.*\bset\b)/i
  ];
  
  // XSS patterns
  const xssPatterns = [
    /<script.*?>.*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe.*?>/i,
    /<object.*?>/i,
    /<embed.*?>/i
  ];
  
  // Check for SQL injection
  const hasSQLInjection = sqlPatterns.some(pattern => 
    pattern.test(url) || pattern.test(body) || pattern.test(query)
  );
  
  // Check for XSS
  const hasXSS = xssPatterns.some(pattern => 
    pattern.test(url) || pattern.test(body) || pattern.test(query)
  );
  
  // Check for suspicious user agents
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nmap/i,
    /nikto/i,
    /burp/i,
    /acunetix/i,
    /w3af/i
  ];
  
  const hasSuspiciousUA = suspiciousUserAgents.some(pattern => 
    pattern.test(userAgent)
  );
  
  if (hasSQLInjection || hasXSS || hasSuspiciousUA) {
    logger.error('Security threat detected', {
      ip: req.ip,
      userAgent: userAgent,
      url: req.originalUrl,
      threatType: hasSQLInjection ? 'SQL_INJECTION' : hasXSS ? 'XSS' : 'SUSPICIOUS_UA',
      body: config.isDevelopment() ? req.body : '[REDACTED]',
      query: req.query
    });
    
    return res.status(403).json({
      success: false,
      message: 'Request blocked for security reasons',
      error: 'SECURITY_VIOLATION'
    });
  }
  
  next();
};

/**
 * File upload security
 */
const fileUploadSecurity = (req, res, next) => {
  if (req.file || req.files) {
    const files = req.files || [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      // Check file size
      if (file.size > config.MAX_FILE_SIZE) {
        return res.status(413).json({
          success: false,
          message: 'File too large',
          error: 'FILE_TOO_LARGE',
          maxSize: config.MAX_FILE_SIZE
        });
      }
      
      // Check file type
      const allowedTypes = config.ALLOWED_IMAGE_TYPES;
      const fileExtension = file.originalname.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        return res.status(400).json({
          success: false,
          message: 'File type not allowed',
          error: 'INVALID_FILE_TYPE',
          allowedTypes: allowedTypes
        });
      }
      
      // Check MIME type
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
      ];
      
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file MIME type',
          error: 'INVALID_MIME_TYPE'
        });
      }
    }
  }
  
  next();
};

/**
 * HTTP security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

module.exports = {
  corsOptions,
  helmetOptions,
  sanitizeRequest,
  ipWhitelist,
  securityLogger,
  attackPrevention,
  fileUploadSecurity,
  securityHeaders
};