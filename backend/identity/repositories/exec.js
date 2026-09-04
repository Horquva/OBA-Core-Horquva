/*
 * Executor helper: every repository method takes an optional `exec` — either the
 * shared pool (default) or a pg client bound to an open transaction. This is what
 * lets services compose multiple repository calls atomically and lets tests run
 * inside a rolled-back transaction.
 */
const { pool } = require('../db/pool')
const { ValidationError } = require('../errors')

const runner = (exec) => exec || pool

/** Guard: refuse any org-scoped query without an explicit organization id. */
function requireOrg(orgId) {
  if (!orgId) throw new ValidationError('organization scope is required')
  return orgId
}

module.exports = { runner, requireOrg }
