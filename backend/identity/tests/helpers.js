/*
 * Test helpers. `withRollback` runs the test body inside a transaction that is
 * ALWAYS rolled back, so tests exercise real SQL against the real database
 * without leaving any residue. Services/repos receive the tx client as `exec`.
 */
const { pool } = require('../db/pool')

async function withRollback(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await fn(client)
  } finally {
    try { await client.query('ROLLBACK') } catch (_) { /* ignore */ }
    client.release()
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'not equal'} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`)
  }
}

async function assertThrows(fn, code) {
  try {
    await fn()
  } catch (e) {
    if (code && e.code !== code) throw new Error(`expected error code "${code}", got "${e.code}" (${e.message})`)
    return e
  }
  throw new Error(`expected a throw${code ? ` with code "${code}"` : ''}, but nothing was thrown`)
}

module.exports = { withRollback, assert, assertEqual, assertThrows }
