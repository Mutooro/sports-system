const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { sequelize } = require('./models');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const { startRatingScheduler } = require('./jobs/ratingScheduler');
const { migrate: migrateStudentPlayer } = require('./scripts/migrateStudentPlayer');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing & compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    return res.json({
      status: 'OK',
      database: 'up',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(503).json({
      status: 'DEGRADED',
      database: 'down',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api/v1', routes);

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Database connection & server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully.');

    // Tighten the Student/Player model (idempotent; safe to re-run).
    if (process.env.NODE_ENV !== 'production') {
      try {
        await migrateStudentPlayer();
      } catch (migErr) {
        logger.error('Student/Player migration failed:', migErr);
      }
    } else {
      logger.info('Skipping Student/Player auto-migration in production. Run `node src/scripts/migrateStudentPlayer.js` manually if needed.');
    }

    // Sync models (use { force: true } only in development to reset)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database models synchronized.');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API base: http://localhost:${PORT}/api/v1`);
      startRatingScheduler();
    });
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    process.exit(1);
  }
};

startServer();
