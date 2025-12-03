require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./utils/logger');
const db = require('./config/database');
const redis = require('./config/redis');

// Routes
const videoRoutes = require('./routes/videos');
const channelRoutes = require('./routes/channels');
const userRoutes = require('./routes/users');
const commentRoutes = require('./routes/comments');
const playlistRoutes = require('./routes/playlists');
const searchRoutes = require('./routes/search');
const scanRoutes = require('./routes/scan');

// Services
const MediaScanner = require('./services/mediaScanner');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Configure CSP to allow video/media playback and API communication
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      // Allow API connections from frontend to backend across origins
      connectSrc: (() => {
        const defaults = ["'self'"];
        const apiUrl = process.env.API_URL || 'http://localhost:3001';
        const frontendOrigin = process.env.CORS_ORIGIN;
        const extra = [];
        // Allow direct calls to API URL
        if (apiUrl) extra.push(apiUrl);
        // Allow websocket/fetch to same host different port
        if (frontendOrigin) extra.push(frontendOrigin);
        return defaults.concat(extra);
      })(),
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));

// CORS configuration
// Note: Wildcard '*' cannot be used with credentials:true
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:7594';
app.use(cors({
  origin: function(origin, callback) {
    // Allow same-origin requests (no origin) and the configured origin
    if (!origin || origin === allowedOrigin) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
  maxAge: 600
}));
// Handle preflight explicitly
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Static files for thumbnails
app.use('/thumbnails', express.static(process.env.THUMBNAIL_PATH || '/thumbnails'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes (no auth routes - authentication removed)
app.use('/api/videos', videoRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/scan', scanRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize and start server
async function startServer() {
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    logger.info('Database connected successfully');

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connected successfully');

    // Start media scanner on startup (async)
    const scanner = new MediaScanner();
    scanner.scanAndIndex().catch(err => {
      logger.error('Initial media scan failed:', err);
    });

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`MyTube API server running on port ${PORT}`);
      logger.info(`Media path: ${process.env.MEDIA_PATH}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
