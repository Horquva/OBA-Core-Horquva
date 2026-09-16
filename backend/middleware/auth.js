/*
 * OBA Core — Authentication & organization-context middleware.
 *
 * requireAuth is applied GLOBALLY in index.js as `app.use('/api', requireAuth)`,
 * so every /api route is protected by default. The old advice here — "apply
 * these ONLY to routes that must be protected, keep demo/read endpoints public"
 * — described a split that no longer exists: those "public" reads served
 * authenticated org data to any caller. Do not reintroduce it.
 *
 * Routers mounted ABOVE that global gate (currently only /api/auth) must still
 * name requireAuth per-route — see routes/auth/auth.js.
 *
 * Usage:
 *   const { requireAuth, optionalAuth } = require('../../middleware/auth')
 *   router.post('/secure', requireAuth, handler)
 */

const { verify } = require('../lib/jwt')
const { isRevoked } = require('../lib/tokenBlocklist')
const SECRET = require('../lib/authSecret')
const { readSessionCookie, CLIENT_HEADER } = require('../lib/authCookie')

// Token sources, in order:
//   1. Authorization: Bearer <token> — API clients, curl, tests.
//   2. The httpOnly session cookie (SEC-2) — the browser frontend.
// A `?token=` query fallback used to be accepted here; it was removed because
// query strings land in access logs, proxy logs and Referer headers, which
// turns every logged request into a credential leak. Do not reintroduce it.
function readToken(req) {
	const h = req.headers.authorization || ''
	if (h.startsWith('Bearer ')) return { token: h.slice(7), source: 'header' }
	const c = readSessionCookie(req)
	if (c) return { token: c, source: 'cookie' }
	return { token: null, source: null }
}

function extractToken(req) {
	return readToken(req).token
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// SEC-2 CSRF guard: a browser attaches the cookie automatically, even to
// requests another site triggers. A state-changing request authenticated by
// the cookie must therefore also carry the custom client header, which no
// cross-site form can send and no cross-site fetch can send without passing
// the CORS allowlist. Bearer-header requests are not affected — an attacker's
// page cannot make the browser add an Authorization header by itself.
function csrfBlocked(req, source) {
	return source === 'cookie' && !SAFE_METHODS.has(req.method) && !req.headers[CLIENT_HEADER]
}

// Attaches organization context to every request when a token is present. Never blocks.
function orgContext(req, _res, next) {
	const { token, source } = readToken(req)
	if (token && !csrfBlocked(req, source)) {
		try {
			const user = verify(token, SECRET)
			if (!isRevoked(user.jti)) {
				req.user = user
				req.org = user.org || null
			}
		} catch (_) {
			/* invalid token — ignore, request stays anonymous */
		}
	}
	next()
}

function optionalAuth(req, res, next) {
	return orgContext(req, res, next)
}

function requireAuth(req, res, next) {
	const { token, source } = readToken(req)
	if (!token) return res.status(401).json({ error: 'Authentication required' })
	if (csrfBlocked(req, source)) {
		return res.status(403).json({ error: `Missing ${CLIENT_HEADER} header on a cookie-authenticated request` })
	}
	try {
		const user = verify(token, SECRET)
		if (isRevoked(user.jti)) return res.status(401).json({ error: 'Token has been revoked (logged out)' })
		req.user = user
		req.org = user.org || null
		next()
	} catch (e) {
		return res.status(401).json({ error: 'Invalid or expired token', detail: e.message })
	}
}

// SEC-3: requireRole / requireAdmin live in middleware/requireRole.js (no
// JWT secret needed there); re-exported here for convenience.
const { requireRole, requireAdmin } = require('./requireRole')

module.exports = { requireAuth, optionalAuth, orgContext, extractToken, requireRole, requireAdmin }
