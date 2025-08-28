const os = require('os');
const process = require('process');
const logger = require('../config/logger');
const config = require('../config');

// Performance monitoring store
const performanceStore = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    avgResponseTime: 0,
    responseTimes: []
  },
  endpoints: new Map(),
  users: new Map(),
  errors: [],
  startTime: Date.now()
};

/**
 * Request performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Track request start
  performanceStore.requests.total++;
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Update global metrics
    performanceStore.requests.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times for average calculation
    if (performanceStore.requests.responseTimes.length > 1000) {
      performanceStore.requests.responseTimes = performanceStore.requests.responseTimes.slice(-1000);
    }
    
    // Calculate average response time
    performanceStore.requests.avgResponseTime = 
      performanceStore.requests.responseTimes.reduce((a, b) => a + b, 0) / 
      performanceStore.requests.responseTimes.length;
    
    // Track success/failure
    if (res.statusCode >= 200 && res.statusCode < 400) {
      performanceStore.requests.successful++;
    } else {
      performanceStore.requests.failed++;
    }
    
    // Track per-endpoint metrics
    const endpoint = `${req.method} ${req.route?.path || req.originalUrl}`;
    const endpointData = performanceStore.endpoints.get(endpoint) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      errors: 0,
      lastAccessed: null
    };
    
    endpointData.count++;
    endpointData.totalTime += responseTime;
    endpointData.avgTime = endpointData.totalTime / endpointData.count;
    endpointData.lastAccessed = new Date();
    
    if (res.statusCode >= 400) {
      endpointData.errors++;
    }
    
    performanceStore.endpoints.set(endpoint, endpointData);
    
    // Track per-user metrics
    if (req.user) {
      const userId = req.user._id.toString();
      const userData = performanceStore.users.get(userId) || {
        requests: 0,
        totalTime: 0,
        avgTime: 0,
        lastRequest: null
      };
      
      userData.requests++;
      userData.totalTime += responseTime;
      userData.avgTime = userData.totalTime / userData.requests;
      userData.lastRequest = new Date();
      
      performanceStore.users.set(userId, userData);
    }
    
    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      logger.warn('Slow request detected', {
        endpoint: endpoint,
        responseTime: responseTime,
        statusCode: res.statusCode,
        userId: req.user?._id,
        ip: req.ip
      });
    }
    
    // Log errors
    if (res.statusCode >= 500) {
      performanceStore.errors.push({
        endpoint: endpoint,
        statusCode: res.statusCode,
        timestamp: new Date(),
        userId: req.user?._id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Keep only last 100 errors
      if (performanceStore.errors.length > 100) {
        performanceStore.errors = performanceStore.errors.slice(-100);
      }
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * System health monitoring
 */
const getSystemHealth = () => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    uptime: uptime,
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      usage: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
      cpuCount: os.cpus().length
    },
    process: {
      pid: process.pid,
      title: process.title,
      version: process.version,
      versions: process.versions
    }
  };
};

/**
 * Get performance metrics
 */
const getPerformanceMetrics = () => {
  const uptime = Date.now() - performanceStore.startTime;
  const requestsPerSecond = performanceStore.requests.total / (uptime / 1000);
  const errorRate = (performanceStore.requests.failed / performanceStore.requests.total * 100) || 0;
  
  return {
    uptime: uptime,
    requests: {
      ...performanceStore.requests,
      perSecond: requestsPerSecond.toFixed(2),
      errorRate: errorRate.toFixed(2)
    },
    endpoints: Array.from(performanceStore.endpoints.entries()).map(([endpoint, data]) => ({
      endpoint,
      ...data
    })).sort((a, b) => b.count - a.count).slice(0, 20), // Top 20 endpoints
    recentErrors: performanceStore.errors.slice(-10), // Last 10 errors
    topUsers: Array.from(performanceStore.users.entries()).map(([userId, data]) => ({
      userId,
      ...data
    })).sort((a, b) => b.requests - a.requests).slice(0, 10) // Top 10 users
  };
};

/**
 * Business metrics calculation
 */
const getBusinessMetrics = async () => {
  try {
    const { User, Coupon, ActivityLog } = require('../models');
    
    const now = new Date();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now - 30 * 24 * 60 * 60 * 1000);
    
    // User metrics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastActiveAt: { $gte: yesterday } });
    const premiumUsers = await User.countDocuments({ 'subscription.type': 'premium' });
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: yesterday } });
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: lastWeek } });
    
    // Coupon metrics
    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({ 
      status: 'active', 
      expiryDate: { $gt: now } 
    });
    const couponsCreatedToday = await Coupon.countDocuments({ createdAt: { $gte: yesterday } });
    const expiredCoupons = await Coupon.countDocuments({ 
      expiryDate: { $lt: now } 
    });
    
    // Activity metrics
    const dailyLogins = await ActivityLog.countDocuments({
      action: 'user_login',
      timestamp: { $gte: yesterday }
    });
    
    const couponsClaimed = await ActivityLog.countDocuments({
      action: 'coupon_claimed',
      timestamp: { $gte: yesterday }
    });
    
    // Conversion metrics
    const conversionRate = totalCoupons > 0 ? 
      (couponsClaimed / totalCoupons * 100).toFixed(2) : 0;
    
    const premiumConversionRate = totalUsers > 0 ? 
      (premiumUsers / totalUsers * 100).toFixed(2) : 0;
    
    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        premium: premiumUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        retention: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0
      },
      coupons: {
        total: totalCoupons,
        active: activeCoupons,
        expired: expiredCoupons,
        createdToday: couponsCreatedToday,
        utilizationRate: totalCoupons > 0 ? (activeCoupons / totalCoupons * 100).toFixed(2) : 0
      },
      activity: {
        dailyLogins: dailyLogins,
        couponsClaimed: couponsClaimed,
        conversionRate: conversionRate
      },
      revenue: {
        premiumUsers: premiumUsers,
        conversionRate: premiumConversionRate,
        estimatedMRR: (premiumUsers * config.PREMIUM_SUBSCRIPTION_PRICE).toFixed(2)
      }
    };
  } catch (error) {
    logger.error('Error calculating business metrics:', error);
    return null;
  }
};

/**
 * Health check endpoint data
 */
const healthCheck = async () => {
  const db = require('../config/database');
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  };
  
  // Database health
  try {
    const dbHealth = await db.healthCheck();
    health.database = dbHealth;
  } catch (error) {
    health.database = { status: 'unhealthy', error: error.message };
    health.status = 'unhealthy';
  }
  
  // Memory health
  const memUsage = process.memoryUsage();
  const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  health.memory = {
    usage: memoryUsagePercent.toFixed(2) + '%',
    status: memoryUsagePercent > 90 ? 'unhealthy' : 'healthy'
  };
  
  if (memoryUsagePercent > 90) {
    health.status = 'unhealthy';
  }
  
  // CPU health (simplified)
  const loadAvg = os.loadavg()[0];
  const cpuCount = os.cpus().length;
  const cpuUsagePercent = (loadAvg / cpuCount) * 100;
  
  health.cpu = {
    usage: cpuUsagePercent.toFixed(2) + '%',
    status: cpuUsagePercent > 80 ? 'unhealthy' : 'healthy'
  };
  
  if (cpuUsagePercent > 80) {
    health.status = 'unhealthy';
  }
  
  return health;
};

/**
 * Alert system for critical issues
 */
const checkAlerts = () => {
  const alerts = [];
  const health = getSystemHealth();
  const performance = getPerformanceMetrics();
  
  // Memory alerts
  if (parseFloat(health.memory.usage) > 90) {
    alerts.push({
      type: 'critical',
      category: 'memory',
      message: `High memory usage: ${health.memory.usage}%`,
      timestamp: new Date()
    });
  }
  
  // Error rate alerts
  if (parseFloat(performance.requests.errorRate) > 10) {
    alerts.push({
      type: 'warning',
      category: 'errors',
      message: `High error rate: ${performance.requests.errorRate}%`,
      timestamp: new Date()
    });
  }
  
  // Response time alerts
  if (performance.requests.avgResponseTime > 2000) {
    alerts.push({
      type: 'warning',
      category: 'performance',
      message: `Slow response time: ${performance.requests.avgResponseTime}ms`,
      timestamp: new Date()
    });
  }
  
  // Recent errors
  const recentCriticalErrors = performance.recentErrors.filter(
    error => error.statusCode >= 500
  );
  
  if (recentCriticalErrors.length > 5) {
    alerts.push({
      type: 'critical',
      category: 'errors',
      message: `Multiple server errors: ${recentCriticalErrors.length} in recent requests`,
      timestamp: new Date()
    });
  }
  
  return alerts;
};

/**
 * Reset performance statistics
 */
const resetPerformanceStats = () => {
  performanceStore.requests = {
    total: 0,
    successful: 0,
    failed: 0,
    avgResponseTime: 0,
    responseTimes: []
  };
  performanceStore.endpoints.clear();
  performanceStore.users.clear();
  performanceStore.errors = [];
  performanceStore.startTime = Date.now();
  
  logger.info('Performance statistics reset');
};

module.exports = {
  performanceMonitor,
  getSystemHealth,
  getPerformanceMetrics,
  getBusinessMetrics,
  healthCheck,
  checkAlerts,
  resetPerformanceStats
};