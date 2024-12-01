const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// Define log levels and colors
const logLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'white'
    }
};

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!require('fs').existsSync(logsDir)) {
    require('fs').mkdirSync(logsDir);
}

// Define the format for logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Configure rotating file transports
const errorRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
    zippedArchive: true
});

const combinedRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
    zippedArchive: true
});

const httpRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
    zippedArchive: true
});

// Create the logger
const logger = winston.createLogger({
    levels: logLevels.levels,
    format: logFormat,
    transports: [
        errorRotateTransport,
        combinedRotateTransport,
        httpRotateTransport
    ]
});

// Handle rotation events
[errorRotateTransport, combinedRotateTransport, httpRotateTransport].forEach(transport => {
    transport.on('rotate', function(oldFilename, newFilename) {
        logger.info('Rotating log file', { oldFilename, newFilename });
    });
});

// If we're not in production, log to the console with colors
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Add colors to Winston
winston.addColors(logLevels.colors);

// Create a stream object for Morgan
logger.stream = {
    write: (message) => logger.http(message.trim())
};

module.exports = logger;
