require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const helmet = require('helmet');
const sanitizer = require('express-sanitizer');
const csrf = require('csurf');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
const statusMonitor = require('express-status-monitor');
const logger = require('./config/logger');
const { 
    responseTimeMiddleware,
    apiUsageMiddleware,
    errorLoggingMiddleware,
    memoryUsageMiddleware,
    requestLoggingMiddleware
} = require('./middleware/monitoring');

// Environment validation
const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'EMAIL_SERVICE',
    'EMAIL_USER',
    'EMAIL_PASS',
    'RECIPIENT_EMAIL'
];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        logger.error(`Required environment variable ${varName} is not set`);
        process.exit(1);
    }
});

const app = express();

// Status monitoring
app.use(statusMonitor({
    title: 'SoundMinds.ai Status',
    path: '/status',
    spans: [{
        interval: 1,
        retention: 60
    }, {
        interval: 5,
        retention: 60
    }, {
        interval: 15,
        retention: 60
    }]
}));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', { ip: req.ip });
        res.status(429).json({ error: 'Too many requests, please try again later' });
    }
});

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN.split(','),
    optionsSuccessStatus: 200,
    credentials: true
};

// Monitoring middleware
app.use(morgan('combined', { stream: logger.stream }));
app.use(responseTimeMiddleware);
app.use(apiUsageMiddleware);
app.use(memoryUsageMiddleware);
app.use(requestLoggingMiddleware);

// Standard middleware
app.use(cors(corsOptions));
app.use(limiter);
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(sanitizer());
app.use(express.static(path.join(__dirname), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));
app.use(csrf());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
    });
});

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify email configuration
transporter.verify()
    .then(() => logger.info('Email service is ready'))
    .catch(err => logger.error('Email service verification failed:', err));

// Contact form validation middleware
const validateContactForm = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required')
];

// Contact form endpoint
app.post('/api/contact', validateContactForm, async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Contact form validation failed', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, message } = req.body;
    logger.info('Contact form submission received', { email });

    try {
        // Prepare email content
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.RECIPIENT_EMAIL,
            subject: `New Contact Form Submission from ${name}`,
            text: `
Name: ${name}
Email: ${email}
Message: ${message}
            `,
            html: `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Message:</strong> ${message}</p>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);
        logger.info('Contact form email sent successfully', { email });

        // Send auto-reply
        const autoReplyOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Thank you for contacting SoundMinds.ai',
            text: `
Dear ${name},

Thank you for reaching out to SoundMinds.ai. We have received your message and will get back to you shortly.

Best regards,
The SoundMinds.ai Team
            `,
            html: `
<h2>Thank you for contacting SoundMinds.ai</h2>
<p>Dear ${name},</p>
<p>Thank you for reaching out to SoundMinds.ai. We have received your message and will get back to you shortly.</p>
<p>Best regards,<br>The SoundMinds.ai Team</p>
            `
        };

        await transporter.sendMail(autoReplyOptions);
        logger.info('Auto-reply email sent successfully', { email });

        res.status(200).json({ 
            message: 'Message sent successfully',
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        logger.error('Error processing contact form:', {
            error: error.message,
            stack: error.stack,
            email
        });
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Error handling middleware
app.use(errorLoggingMiddleware);
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack
    });
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
    logger.info(`Server started`, {
        host: HOST,
        port: PORT,
        nodeEnv: process.env.NODE_ENV,
        memoryUsage: process.memoryUsage()
    });
});
