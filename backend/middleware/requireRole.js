// SEC-3: role gate for data-changing endpoints. Runs AFTER requireAuth (which
// index.js applies globally to /api), so req.user is the verified token
// payload. `role` in that payload comes from app_users.role at login
// (routes/auth/auth.js) -- no separate roles table or vocabulary.
//
// Today the only account that actually holds role 'admin' is the
// ADMIN_EMAIL env-fallback login (settled decision, cohort handout section 7).
// A role change in app_users takes effect at the user's next login, since
// the role is read from the signed token, not re-queried per request.
//
// Kept in its own file, separate from middleware/auth.js, on purpose: this
// gate only reads req.user and needs no JWT secret. Route modules that import
// it (routes/agents.js) are also required by offline unit tests that never
// set JWT_SECRET (tests/routeEvidence.unit.test.js via decisionIntelligence.js),
// and lib/authSecret.js throws at load time when that variable is missing.

function requireRole(...roles) {
    return function roleGate(req, res, next) {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' })
        if (!roles.includes(req.user.role)) {
            require('../lib/audit').recordAudit(req, {
                action: 'authz.denied',
                outcome: 'denied',
                reason: `role_required:${roles.join(',')}`,
            })
            return res.status(403).json({ error: `This action requires the ${roles.join(' or ')} role` })
        }
        next()
    }
}

const requireAdmin = requireRole('admin')

module.exports = { requireRole, requireAdmin }
