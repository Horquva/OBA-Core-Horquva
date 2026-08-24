/*
 * OBA Core — Authentication & organization-context middleware.
 * Apply these ONLY to routes that must be protected. Keep demo/read endpoints public.
 *
 * Usage:
 *   const { requireAuth, requireRole, optionalAuth } = require('../../middleware/auth')
 *   router.post('/secure', requireAuth, handler)
 *   router.delete('/x', requireAuth, requireRole('admin'), handler)
 */

const { verify } = require('../lib/jwt')
const { isRevoked } = require('../lib/tokenBlocklist')

const SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me'

// Authorization header ONLY. A `?token=` query fallback used to be accepted
// here; it was removed because query strings land in access logs, proxy logs
// and Referer headers, which turns every logged request into a credential
// leak. Nothing in the frontend ever used it.
function extractToken(req) {
	const h = req.headers.authorization || ''
	if (h.startsWith('Bearer ')) return h.slice(7)
	return null
}

// Attaches organization context to every request when a token is present. Never blocks.
function orgContext(req, _res, next) {
	const token = extractToken(req)
	if (token) {
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
	const token = extractToken(req)
	if (!token) return res.status(401).json({ error: 'Authentication required' })
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

function requireRole(...roles) {
	return (req, res, next) => {
		if (!req.user) return res.status(401).json({ error: 'Authentication required' })
		if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden — insufficient role' })
		next()
	}
}

module.exports = { requireAuth, optionalAuth, requireRole, orgContext, extractToken }
