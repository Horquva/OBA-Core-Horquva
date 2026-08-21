import process from "node:process";

export const config = {
  port: Number(process.env.ALTAIR_PORT || 3001),
  host: process.env.ALTAIR_HOST || "127.0.0.1",
  sessionTtlMs: Number(process.env.ALTAIR_SESSION_TTL_MS || 8 * 60 * 60 * 1000),
  workerIntervalMs: Number(process.env.ALTAIR_WORKER_INTERVAL_MS || 250),
  stepTimeoutMs: Number(process.env.ALTAIR_STEP_TIMEOUT_MS || 30_000),
  demoEmail: process.env.ALTAIR_DEMO_EMAIL || "admin@altair.local",
  demoPassword: process.env.ALTAIR_DEMO_PASSWORD || "AltairDemo123!",
  demoRole: process.env.ALTAIR_DEMO_ROLE || "admin",
  allowedOrigin: process.env.ALTAIR_ALLOWED_ORIGIN || "http://localhost:5173",
  webhookSecret: process.env.ALTAIR_WEBHOOK_SECRET || "",
  nodeEnv: process.env.NODE_ENV || "development",
  // Keep the local demo self-contained. Set ALTAIR_DEMO_MODE=false when real
  // external adapters are configured and should be required.
  demoMode: process.env.ALTAIR_DEMO_MODE !== "false",
};
