import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { testDatabaseConnection, closeDatabaseConnection } from './config/database';
import authRoutes from './routes/auth';

const app = express();

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, _res: Response) => {
  _res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API v1 routes
app.use('/v1/auth', authRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    code: 'NOT_FOUND',
  });
});

// Error handling middleware
app.use((err: any, _req: Request, _res: Response, _next: any) => {
  console.error('Unhandled error:', err);
  _res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Start listening
    app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🧺 LinenFlow™ API Server                               ║
║                                                           ║
║   Status:      Running ✅                                 ║
║   Environment: ${config.nodeEnv.padEnd(43)}║
║   Port:        ${config.port.toString().padEnd(43)}║
║   Local:       http://localhost:${config.port}/v1${' '.padEnd(24)}║
║   Health:      http://localhost:${config.port}/health${' '.padEnd(20)}║
║                                                           ║
║   Endpoints:                                              ║
║   POST   /v1/auth/login      - User login                ║
║   POST   /v1/auth/refresh    - Refresh token             ║
║   GET    /v1/auth/me         - Current user              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      await closeDatabaseConnection();
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
