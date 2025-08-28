const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Generic validation middleware factory
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));
      
      logger.warn('Validation error:', {
        endpoint: req.originalUrl,
        method: req.method,
        errors: errors,
        userId: req.user?._id
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    // Replace the property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

// User validation schemas
const userSchemas = {
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': 'Username can only contain letters and numbers',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters'
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    password: Joi.string()
      .min(6)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      }),
    firstName: Joi.string()
      .min(1)
      .max(50)
      .optional(),
    lastName: Joi.string()
      .min(1)
      .max(50)
      .optional()
  }),
  
  login: Joi.object({
    email: Joi.string()
      .email()
      .required(),
    password: Joi.string()
      .required()
  }),
  
  updateProfile: Joi.object({
    firstName: Joi.string()
      .min(1)
      .max(50)
      .optional(),
    lastName: Joi.string()
      .min(1)
      .max(50)
      .optional(),
    bio: Joi.string()
      .max(500)
      .optional(),
    location: Joi.string()
      .max(100)
      .optional(),
    preferences: Joi.object({
      emailNotifications: Joi.boolean().optional(),
      pushNotifications: Joi.boolean().optional(),
      marketingEmails: Joi.boolean().optional(),
      theme: Joi.string().valid('light', 'dark', 'auto').optional()
    }).optional()
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(6)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .required()
      .messages({
        'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, and one number'
      })
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  })
};

// Coupon validation schemas
const couponSchemas = {
  create: Joi.object({
    title: Joi.string()
      .min(3)
      .max(100)
      .required(),
    description: Joi.string()
      .min(10)
      .max(500)
      .required(),
    code: Joi.string()
      .min(3)
      .max(50)
      .required(),
    discount: Joi.object({
      type: Joi.string()
        .valid('percentage', 'fixed')
        .required(),
      value: Joi.number()
        .positive()
        .required(),
      currency: Joi.string()
        .length(3)
        .uppercase()
        .default('USD')
    }).required(),
    category: Joi.string()
      .valid(
        'electronics', 'clothing', 'food', 'travel', 'entertainment',
        'health', 'home', 'sports', 'books', 'automotive', 'beauty', 'other'
      )
      .required(),
    store: Joi.object({
      name: Joi.string()
        .min(1)
        .max(100)
        .required(),
      website: Joi.string()
        .uri()
        .optional()
    }).required(),
    expiryDate: Joi.date()
      .greater('now')
      .required(),
    minimumPurchase: Joi.number()
      .min(0)
      .optional(),
    usageLimit: Joi.number()
      .positive()
      .optional(),
    tags: Joi.array()
      .items(Joi.string().max(30))
      .max(10)
      .optional()
  }),
  
  update: Joi.object({
    title: Joi.string()
      .min(3)
      .max(100)
      .optional(),
    description: Joi.string()
      .min(10)
      .max(500)
      .optional(),
    expiryDate: Joi.date()
      .greater('now')
      .optional(),
    minimumPurchase: Joi.number()
      .min(0)
      .optional(),
    usageLimit: Joi.number()
      .positive()
      .optional(),
    tags: Joi.array()
      .items(Joi.string().max(30))
      .max(10)
      .optional()
  }),
  
  search: Joi.object({
    q: Joi.string()
      .max(100)
      .optional(),
    category: Joi.string()
      .valid(
        'electronics', 'clothing', 'food', 'travel', 'entertainment',
        'health', 'home', 'sports', 'books', 'automotive', 'beauty', 'other'
      )
      .optional(),
    store: Joi.string()
      .max(100)
      .optional(),
    minDiscount: Joi.number()
      .min(0)
      .optional(),
    maxDiscount: Joi.number()
      .min(0)
      .optional(),
    sortBy: Joi.string()
      .valid('createdAt', 'expiryDate', 'views', 'popularityScore', 'discount.value')
      .default('createdAt')
      .optional(),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .optional(),
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .optional(),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .optional()
  }),
  
  report: Joi.object({
    reason: Joi.string()
      .valid('spam', 'inappropriate', 'fake', 'expired', 'other')
      .required(),
    description: Joi.string()
      .max(500)
      .optional()
  })
};

// Validation for file uploads
const fileSchemas = {
  uploadParams: Joi.object({
    fileType: Joi.string()
      .valid('coupon-image', 'avatar')
      .required()
  })
};

// Admin validation schemas
const adminSchemas = {
  userUpdate: Joi.object({
    role: Joi.string()
      .valid('user', 'premium', 'admin')
      .optional(),
    isActive: Joi.boolean()
      .optional()
  }),
  
  analytics: Joi.object({
    startDate: Joi.date()
      .optional(),
    endDate: Joi.date()
      .greater(Joi.ref('startDate'))
      .optional(),
    metrics: Joi.array()
      .items(Joi.string().valid('users', 'coupons', 'revenue', 'activity'))
      .optional()
  })
};

// Pagination validation
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  sortBy: Joi.string()
    .optional(),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional()
});

// Common validation middleware
const validatePagination = validate(paginationSchema, 'query');
const validateMongoId = (paramName = 'id') => {
  return validate(
    Joi.object({
      [paramName]: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
          'string.pattern.base': `${paramName} must be a valid MongoDB ObjectId`
        })
    }),
    'params'
  );
};

// Custom validation helpers
const validateDiscountValue = (value, helpers) => {
  const { type } = helpers.state.ancestors[0];
  
  if (type === 'percentage' && value > 100) {
    return helpers.error('discount.percentage.max', { value });
  }
  
  if (type === 'fixed' && value <= 0) {
    return helpers.error('discount.fixed.min', { value });
  }
  
  return value;
};

// Error messages for custom validations
Joi.defaults((schema) => {
  return schema.messages({
    'discount.percentage.max': 'Percentage discount cannot exceed 100%',
    'discount.fixed.min': 'Fixed discount must be greater than 0'
  });
});

module.exports = {
  validate,
  validatePagination,
  validateMongoId,
  userSchemas,
  couponSchemas,
  fileSchemas,
  adminSchemas
};