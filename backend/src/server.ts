// =============================================================================
// Horquva Continuity Platform — Backend API Server
// =============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v0Router } from './routes/v0.js';
import { continuityRouter } from './routes/continuity.js';
import { attestationRouter, attestRouter } from './routes/attestation.js';
import { departuresRouter } from './routes/departures.js';
import { handoversRouter } from './routes/handovers.js';
import { actionsRouter } from './routes/actions.js';
import { changesRouter } from './routes/changes.js';
import { peopleRouter } from './routes/people.js';
import { assetsRouter } from './routes/assets.js';
import { graphRouter } from './routes/graph.js';
import { identityRouter } from './routes/identity.js';
import { freshnessRouter } from './routes/freshness.js';
import { assistantRouter } from './routes/assistant.js';
import {
  connectionsRouter,
  usersRouter,
  settingsRouter,
  auditLogRouter,
} from './routes/settings.js';
import { reviewerRouter } from './routes/reviewer.js';
import { authRouter } from './routes/auth.js';
import { navRouter } from './routes/nav.js';
import { requestContext } from './middleware/requestContext.js';
import { auditTrail } from './middleware/auditLog.js';
import { authorize } from './middleware/rbac.js';

export const app = express();

// Security and middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(requestContext);
app.use(auditTrail);

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
app.use('/api/auth', authRouter);
// SEC-02: every /api route below passes the RBAC policy table (middleware/rbac.ts).
app.use('/api', authorize);
app.use('/api/v0', v0Router);
app.use('/api/continuity', continuityRouter);
app.use('/api/attestation', attestationRouter);
app.use('/api/attest', attestRouter);
app.use('/api/departures', departuresRouter);
app.use('/api/handovers', handoversRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/changes', changesRouter);
app.use('/api/people', peopleRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/graph', graphRouter);
app.use('/api/identity-queue', identityRouter);
app.use('/api/freshness', freshnessRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/connections', connectionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/audit-log', auditLogRouter);
app.use('/api/me', reviewerRouter);
app.use('/api/nav-counts', navRouter);

// Central error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Horquva Server Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});
