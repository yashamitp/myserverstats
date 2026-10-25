const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const openapiSpec = require('./config/swagger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Route handlers
const authRoutes = require('./routes/authRoutes');
const serverRoutes = require('./routes/serverRoutes');
const alertRoutes = require('./routes/alertRoutes');
const aiRoutes = require('./routes/aiRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false // Allows Swagger UI and local development
}));

// CORS
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true
}));

// Request parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Apply rate limiting
app.use('/api', apiLimiter);

// Health check endpoint (without disclosing sensitive internals)
app.get(['/health', '/api/v1/health'], (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'agentops-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbState === 1 ? 'connected' : 'disconnected'
  });
});

// Swagger / OpenAPI documentation
app.get('/api/v1/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openapiSpec);
});
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Mount REST API routes under /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/servers', serverRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/audit', auditRoutes);

// Serve static frontend assets in production if built
const path = require('path');
const fs = require('fs');
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Catch-all 404 & centralized error handler
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
