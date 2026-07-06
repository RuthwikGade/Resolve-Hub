const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const env = require('./config/env');

// ────────────────────────────────────────────
// Express App Setup
// ────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ────────────────────────────────────────────
// Security Middleware
// ────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);

// Rate limiting: 10000 requests per 15 minutes in development, 100 in production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isDev ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});
app.use(limiter);

// ────────────────────────────────────────────
// Body Parsing
// ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ────────────────────────────────────────────
// Static Files (Uploads)
// ────────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(env.uploadDir)));

// ────────────────────────────────────────────
// Health Check
// ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ResolveHub API is running',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// ────────────────────────────────────────────
// API Routes
// ────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const communityRoutes = require('./routes/communities');
const memberRoutes = require('./routes/members');
const complaintRoutes = require('./routes/complaints');
const categoryRoutes = require('./routes/categories');
const slaRoutes = require('./routes/sla');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');

// Swagger API Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use('/api/auth', authRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// ────────────────────────────────────────────
// 404 Handler
// ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ────────────────────────────────────────────
// Global Error Handler
// ────────────────────────────────────────────
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// ────────────────────────────────────────────
// Socket.IO
// ────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: env.corsOrigin,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

const { setupSocket } = require('./socket/socketHandler');
setupSocket(io);

// ────────────────────────────────────────────
// Background Services
// ────────────────────────────────────────────
const { startEscalationCron } = require('./services/escalationService');
const { startNotificationWorker } = require('./workers/notificationWorker');

// ────────────────────────────────────────────
// Start Server
// ────────────────────────────────────────────
const PORT = env.port;

server.listen(PORT, () => {
  console.log(`\n🚀 ResolveHub API server running on port ${PORT}`);
  console.log(`📍 Environment: ${env.nodeEnv}`);
  console.log(`🌐 CORS origin: ${env.corsOrigin}`);
  console.log(`📂 Uploads dir: ${path.resolve(env.uploadDir)}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health\n`);

  // Start background services
  try {
    startEscalationCron();
    console.log('⏰ Escalation cron started');
  } catch (err) {
    console.error('Failed to start escalation cron:', err.message);
  }

  try {
    startNotificationWorker();
    console.log('📬 Notification worker started');
  } catch (err) {
    console.error('Failed to start notification worker:', err.message);
  }
});

// ────────────────────────────────────────────
// Graceful Shutdown
// ────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Close HTTP server (stop accepting new connections)
  server.close(async () => {
    console.log('HTTP server closed');

    try {
      // Close Socket.IO
      io.close();
      console.log('Socket.IO closed');
    } catch (err) {
      console.error('Error closing Socket.IO:', err.message);
    }

    try {
      // Close database pool
      const { pool } = require('./config/db');
      await pool.end();
      console.log('Database pool closed');
    } catch (err) {
      console.error('Error closing database pool:', err.message);
    }

    try {
      // Close Redis connection
      const { redis } = require('./config/redis');
      await redis.quit();
      console.log('Redis connection closed');
    } catch (err) {
      console.error('Error closing Redis:', err.message);
    }

    console.log('Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = { app, server, io };
