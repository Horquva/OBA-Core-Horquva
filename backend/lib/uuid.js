/**
 * UUID validation — entity primary keys are UUIDs since
 * sql/19_uuid_primary_keys.sql. Route params and body ids are opaque
 * strings; this is the one place that knows what a valid one looks like.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

module.exports = { isUuid }
