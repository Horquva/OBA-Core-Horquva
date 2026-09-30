// =============================================================================
// Horquva Continuity Platform — Backend API Server
// =============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v0Router } from './routes/v0.js';
import { continuityRouter } from './routes/continuity.js';
import { attestationRouter } from './routes/attestation.js';

export const app = express();

// Security and middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'horquva-continuity-platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routers
app.use('/api/v0', v0Router);
app.use('/api/continuity', continuityRouter);
app.use('/api/attestation', attestationRouter);

// Central error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Horquva Server Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});
