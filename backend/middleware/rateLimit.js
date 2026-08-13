/**
 * Minimal in-memory rate limiter — no new dependency, no external store.
 * Fixed-window counter keyed by IP + a caller-supplied identifier (e.g. the
 * email being logged into), so one attacker can't lock out a real user by
 * spamming requests that share only the IP, and can't dodge the limit by
 * rotating the email on a fixed IP either — both must match to count.
 *
 * Not durable across restarts and not shared across processes — acceptable
 * for a single-instance MVP; swap for a real store (Redis) before scaling out.
 */

const buckets = new Map() // key -> { count, resetAt }

function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, keyField = 'email' } = {}) {
  return (req, res, next) => {
    const identifier = (req.body && req.body[keyField]) || 'unknown'
    const key = `${req.ip}:${identifier}`
    const now = Date.now()

    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(key, bucket)
    }

    bucket.count += 1
    if (bucket.count > max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000)
      res.set('Retry-After', String(retryAfterSec))
      return res.status(429).json({ error: 'Too many attempts. Please try again later.', retryAfterSeconds: retryAfterSec })
    }

    next()
  }
}

module.exports = { rateLimit }
