import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { testDatabaseConnection, closeDatabaseConnection } from './config/database';
import authRoutes from './routes/auth';
import syncRoutes from './routes/sync';
import articleRoutes from './routes/articles';
import customerRoutes from './routes/customers';
import linenItemRoutes from './routes/linenItems';
import jobOrderRoutes from './routes/jobOrders';
import expenseRoutes from './routes/expenses';
import invoiceRoutes from './routes/invoices';
import supplierRoutes from './routes/suppliers';
import inventoryItemRoutes from './routes/inventoryItems';
import reportRoutes from './routes/reports';

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
app.use('/v1/sync', syncRoutes);
app.use('/v1/articles', articleRoutes);
app.use('/v1/customers', customerRoutes);
app.use('/v1/linen-items', linenItemRoutes);
app.use('/v1/job-orders', jobOrderRoutes);
app.use('/v1/expenses', expenseRoutes);
app.use('/v1/invoices', invoiceRoutes);
app.use('/v1/suppliers', supplierRoutes);
app.use('/v1/inventory-items', inventoryItemRoutes);
app.use('/v1/reports', reportRoutes);

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
║   POST   /v1/auth/change-password - Change password      ║
║   GET    /v1/articles        - List linen articles       ║
║   GET    /v1/customers       - List customers            ║
║   GET    /v1/linen-items     - List linen inventory      ║
║   GET    /v1/job-orders      - List/create job orders    ║
║   GET    /v1/expenses        - List/create expenses      ║
║   GET    /v1/invoices        - List/create invoices      ║
║   GET    /v1/suppliers       - List/create suppliers     ║
║   GET    /v1/inventory-items - Consumable stock + moves   ║
║   GET    /v1/reports/summary - Analytics aggregates      ║
║   POST   /v1/sync/batch      - Batch sync scan events    ║
║   GET    /v1/sync/reference  - Get offline reference data║
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
