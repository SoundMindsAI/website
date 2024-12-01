const responseTime = require('response-time');
const expressWinston = require('express-winston');
const logger = require('../config/logger');

// Track response times
const responseTimeMiddleware = responseTime((req, res, time) => {
    if (process.env.ENABLE_PERFORMANCE_LOGGING === 'true') {
        logger.info('Response Time', {
            method: req.method,
            url: req.url,
            responseTime: time,
            status: res.statusCode
        });
    }
});

// Track API usage
const apiUsageMiddleware = (req, res, next) => {
    if (process.env.ENABLE_API_LOGGING === 'true') {
        logger.info('API Request', {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    }
    next();
};

// Track errors
const errorLoggingMiddleware = (err, req, res, next) => {
    logger.error('Error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        ip: req.ip
    });
    next(err);
};

// Track memory usage
const memoryUsageMiddleware = (req, res, next) => {
    if (process.env.ENABLE_MEMORY_LOGGING === 'true') {
        const used = process.memoryUsage();
        logger.debug('Memory Usage', {
            rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
            heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
            heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
            external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`
        });
    }
    next();
};

// Request logging middleware using express-winston
const requestLoggingMiddleware = expressWinston.logger({
    winstonInstance: logger,
    meta: true,
    msg: 'HTTP {{req.method}} {{req.url}}',
    expressFormat: true,
    colorize: true
});

module.exports = {
    responseTimeMiddleware,
    apiUsageMiddleware,
    errorLoggingMiddleware,
    memoryUsageMiddleware,
    requestLoggingMiddleware
};
