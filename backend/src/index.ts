// =============================================================================
// Horquva Continuity Platform — Server Entry Point
// =============================================================================

import dotenv from 'dotenv';
import { app } from './server.js';

dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production (SRS SEC-01).');
}

const PORT = parseInt(process.env.PORT || '4000', 10);

app.listen(PORT, () => {
  console.log(`[Horquva Core] Continuity Platform API running on http://localhost:${PORT}`);
  console.log(`[Horquva Core] Health check available at http://localhost:${PORT}/health`);
});
