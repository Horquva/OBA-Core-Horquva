/*
 * Sentinel Identity & Trust — PostgreSQL connection pool (Owner: Areeb Ahmad).
 * Uses the repo's existing `pg` dependency against a dedicated local database,
 * fully isolated from the Supabase-backed OBA data. This is the ONLY approved
 * data-access entry point for the identity platform (service → repository → pool).
 */
const { Pool } = require('pg')
const config = require('../config')

const pool = new Pool({
  connectionString: config.db.url,
  max: config.db.poolMax,
  idleTimeoutMillis: config.db.idleTimeoutMs,
})

// Never let an idle-client error crash the process silently.
pool.on('error', (err) => {
  console.error('[identity/db] idle client error:', err.message)
})

/** Run a parameterized query. Always use $1,$2 placeholders — never string-concat. */
async function query(text, params) {
  return pool.query(text, params)
}

/** Run `fn(client)` inside a transaction; commits on success, rolls back on throw. */
async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try { await client.query('ROLLBACK') } catch (_) { /* ignore */ }
    throw err
  } finally {
    client.release()
  }
}

/** Lightweight readiness probe. Returns true when the DB answers. */
async function healthcheck() {
  const { rows } = await pool.query('select 1 as ok')
  return rows.length > 0 && rows[0].ok === 1
}

module.exports = { pool, query, withTransaction, healthcheck }
