// =============================================================================
// Horquva Continuity Platform — Server Entry Point
// =============================================================================

import dotenv from 'dotenv';
import { app } from './server.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);

app.listen(PORT, () => {
  console.log(`[Horquva Core] Continuity Platform API running on http://localhost:${PORT}`);
  console.log(`[Horquva Core] Health check available at http://localhost:${PORT}/health`);
});
