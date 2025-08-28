const { 
  getSystemHealth,
  getPerformanceMetrics,
  getBusinessMetrics,
  healthCheck,
  checkAlerts,
  resetPerformanceStats
} = require('../middlewares/monitoring');
const { User, Coupon, ActivityLog } = require('../models');
const config = require('../config');
const logger = require('../config/logger');
const { AppError, catchAsync } = require('../middlewares/errorHandler');

/**
 * Get comprehensive system overview
 */
const getOverview = catchAsync(async (req, res) => {
  const [systemHealth, performanceMetrics, businessMetrics, alerts] = await Promise.all([
    getSystemHealth(),
    getPerformanceMetrics(),
    getBusinessMetrics(),
    checkAlerts()
  ]);

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      health: systemHealth,
      performance: {
        uptime: performanceMetrics.uptime,
        requests: performanceMetrics.requests,
        avgResponseTime: performanceMetrics.requests.avgResponseTime,
        errorRate: performanceMetrics.requests.errorRate
      },
      business: businessMetrics,
      alerts: alerts,
      summary: {
        status: alerts.filter(a => a.type === 'critical').length > 0 ? 'critical' : 
                alerts.filter(a => a.type === 'warning').length > 0 ? 'warning' : 'healthy',
        criticalAlerts: alerts.filter(a => a.type === 'critical').length,
        warnings: alerts.filter(a => a.type === 'warning').length
      }
    }
  });
});

/**
 * Get detailed performance metrics
 */
const getPerformance = catchAsync(async (req, res) => {
  const systemHealth = getSystemHealth();
  const performanceMetrics = getPerformanceMetrics();

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      system: systemHealth,
      performance: performanceMetrics,
      recommendations: generatePerformanceRecommendations(systemHealth, performanceMetrics)
    }
  });
});

/**
 * Get system health status
 */
const getHealth = catchAsync(async (req, res) => {
  const health = await healthCheck();
  const alerts = checkAlerts();

  res.status(health.status === 'healthy' ? 200 : 503).json({
    success: health.status === 'healthy',
    data: {
      ...health,
      alerts: alerts
    }
  });
});

/**
 * Get business intelligence metrics
 */
const getBusiness = catchAsync(async (req, res) => {
  const { days = 30 } = req.query;
  
  const businessMetrics = await getBusinessMetrics();
  const detailedAnalytics = await getDetailedBusinessAnalytics(parseInt(days));

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      period: `${days} days`,
      overview: businessMetrics,
      detailed: detailedAnalytics,
      insights: generateBusinessInsights(businessMetrics, detailedAnalytics)
    }
  });
});

/**
 * Get active alerts
 */
const getAlerts = catchAsync(async (req, res) => {
  const alerts = checkAlerts();
  const systemHealth = getSystemHealth();
  const performanceMetrics = getPerformanceMetrics();

  // Add contextual information to alerts
  const enrichedAlerts = alerts.map(alert => ({
    ...alert,
    context: getAlertContext(alert, systemHealth, performanceMetrics)
  }));

  res.json({
    success: true,
    data: {
      alerts: enrichedAlerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.type === 'critical').length,
        warning: alerts.filter(a => a.type === 'warning').length
      }
    }
  });
});

/**
 * Get real-time metrics for dashboard
 */
const getRealtime = catchAsync(async (req, res) => {
  const performanceMetrics = getPerformanceMetrics();
  const systemHealth = getSystemHealth();

  // Get recent activity
  const recentActivity = await ActivityLog.find({
    timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
  })
    .sort({ timestamp: -1 })
    .limit(50)
    .populate('user', 'username')
    .lean();

  // Get active users (last 15 minutes)
  const activeUsers = await User.countDocuments({
    lastActiveAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
  });

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      metrics: {
        activeUsers: activeUsers,
        requestsPerSecond: performanceMetrics.requests.perSecond,
        avgResponseTime: performanceMetrics.requests.avgResponseTime,
        errorRate: performanceMetrics.requests.errorRate,
        memoryUsage: systemHealth.memory.usage,
        cpuUsage: systemHealth.cpu.usage
      },
      recentActivity: recentActivity.slice(0, 10), // Latest 10 activities
      topEndpoints: performanceMetrics.endpoints.slice(0, 5) // Top 5 endpoints
    }
  });
});

/**
 * Get monitoring logs with filtering
 */
const getLogs = catchAsync(async (req, res) => {
  const { 
    level = 'info',
    limit = 100,
    startDate,
    endDate,
    search
  } = req.query;

  let query = {};

  // Filter by date range
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  // Filter by level
  const levelMap = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
  };

  if (levelMap[level] !== undefined) {
    query.level = { $gte: levelMap[level] };
  }

  // Search in message
  if (search) {
    query.$text = { $search: search };
  }

  // Note: This would typically query a log collection
  // For now, we'll return a placeholder response
  const logs = [];

  res.json({
    success: true,
    data: {
      logs: logs,
      totalCount: logs.length,
      filters: {
        level,
        startDate,
        endDate,
        search
      }
    }
  });
});

/**
 * Export monitoring data
 */
const exportData = catchAsync(async (req, res) => {
  const { format = 'json', type = 'overview' } = req.query;

  let data;
  switch (type) {
    case 'performance':
      data = getPerformanceMetrics();
      break;
    case 'business':
      data = await getBusinessMetrics();
      break;
    case 'health':
      data = await healthCheck();
      break;
    default:
      data = {
        timestamp: new Date().toISOString(),
        health: await healthCheck(),
        performance: getPerformanceMetrics(),
        business: await getBusinessMetrics(),
        alerts: checkAlerts()
      };
  }

  if (format === 'csv') {
    // Convert to CSV (simplified)
    const csv = convertToCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=monitoring-${type}-${Date.now()}.csv`);
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=monitoring-${type}-${Date.now()}.json`);
    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      type: type,
      data: data
    });
  }
});

/**
 * Reset performance statistics (admin only)
 */
const resetStats = catchAsync(async (req, res) => {
  resetPerformanceStats();

  logger.audit('Performance statistics reset', {
    userId: req.user._id,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Performance statistics have been reset',
    resetAt: new Date().toISOString()
  });
});

/**
 * Generate performance recommendations
 */
function generatePerformanceRecommendations(systemHealth, performanceMetrics) {
  const recommendations = [];

  // Memory recommendations
  const memoryUsage = parseFloat(systemHealth.memory.usage);
  if (memoryUsage > 90) {
    recommendations.push({
      type: 'critical',
      category: 'memory',
      message: 'Memory usage is critically high. Consider scaling up or optimizing memory usage.',
      action: 'Scale up server or optimize code'
    });
  } else if (memoryUsage > 75) {
    recommendations.push({
      type: 'warning',
      category: 'memory',
      message: 'Memory usage is high. Monitor closely and consider optimization.',
      action: 'Monitor and optimize'
    });
  }

  // Response time recommendations
  if (performanceMetrics.requests.avgResponseTime > 2000) {
    recommendations.push({
      type: 'warning',
      category: 'performance',
      message: 'Average response time is high. Consider optimizing slow endpoints.',
      action: 'Optimize slow endpoints'
    });
  }

  // Error rate recommendations
  const errorRate = parseFloat(performanceMetrics.requests.errorRate);
  if (errorRate > 5) {
    recommendations.push({
      type: 'critical',
      category: 'errors',
      message: 'Error rate is high. Investigate and fix critical issues.',
      action: 'Investigate errors'
    });
  }

  return recommendations;
}

/**
 * Generate business insights
 */
function generateBusinessInsights(businessMetrics, detailedAnalytics) {
  const insights = [];

  if (businessMetrics) {
    // User growth insights
    const userGrowthRate = businessMetrics.users.newThisWeek / Math.max(businessMetrics.users.total, 1) * 100;
    if (userGrowthRate > 10) {
      insights.push({
        type: 'positive',
        category: 'growth',
        message: `Strong user growth: ${userGrowthRate.toFixed(1)}% this week`,
        metric: userGrowthRate
      });
    }

    // Premium conversion insights
    const conversionRate = parseFloat(businessMetrics.revenue.conversionRate);
    if (conversionRate < 2) {
      insights.push({
        type: 'opportunity',
        category: 'revenue',
        message: 'Premium conversion rate is low. Consider improving premium features or pricing.',
        metric: conversionRate
      });
    }

    // Engagement insights
    const retentionRate = parseFloat(businessMetrics.users.retention);
    if (retentionRate > 80) {
      insights.push({
        type: 'positive',
        category: 'engagement',
        message: `Excellent user retention: ${retentionRate}%`,
        metric: retentionRate
      });
    }
  }

  return insights;
}

/**
 * Get detailed business analytics
 */
async function getDetailedBusinessAnalytics(days) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily user registrations
    const dailyRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Daily coupon activity
    const dailyCoupons = await Coupon.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Top categories
    const topCategories = await Coupon.aggregate([
      {
        $match: {
          status: 'active',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    return {
      dailyRegistrations,
      dailyCoupons,
      topCategories
    };
  } catch (error) {
    logger.error('Error getting detailed business analytics:', error);
    return null;
  }
}

/**
 * Get alert context
 */
function getAlertContext(alert, systemHealth, performanceMetrics) {
  const context = {
    timestamp: alert.timestamp,
    severity: alert.type
  };

  switch (alert.category) {
    case 'memory':
      context.currentUsage = systemHealth.memory.usage;
      context.threshold = '90%';
      break;
    case 'performance':
      context.currentResponseTime = performanceMetrics.requests.avgResponseTime;
      context.threshold = '2000ms';
      break;
    case 'errors':
      context.currentErrorRate = performanceMetrics.requests.errorRate;
      context.threshold = '5%';
      break;
  }

  return context;
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data) {
  // Simplified CSV conversion
  if (Array.isArray(data)) {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    return headers + '\n' + rows;
  } else {
    return JSON.stringify(data, null, 2);
  }
}

module.exports = {
  getOverview,
  getPerformance,
  getHealth,
  getBusiness,
  getAlerts,
  getRealtime,
  getLogs,
  exportData,
  resetStats
};