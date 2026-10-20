/**
 * Connection cap from env (a positive integer), else the fallback. Hosted
 * poolers limit clients per database (Supabase session mode: 15), and during a
 * deploy the old and new instance both hold their pools: PG_POOL_MAX for the
 * app (db/client.ts) plus PGBOSS_POOL_MAX for jobs (jobs/scheduler.ts).
 */
export function envPoolMax(name: string, fallback: number, env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
