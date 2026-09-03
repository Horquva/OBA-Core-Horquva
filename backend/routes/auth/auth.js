/*
 * OBA Core — Authentication routes (Identity Gateway, MVP).
 * Endpoints:
 *   POST /api/auth/login           { email, password }   -> { token, user }
 *   GET  /api/auth/me              (Bearer token)         -> { user }
 *   POST /api/auth/logout          (Bearer token)         -> { ok: true }
 *   POST /api/auth/change-password (Bearer token)         -> { ok: true }
 *
 * Registration is closed (D-13) — accounts are created with
 * backend/tools/provision-user.js, not self-service. This router is mounted
 * ABOVE the global `app.use('/api', requireAuth)` gate in index.js, because
 * login must be reachable without a token. That makes it the one router
 * where protection has to be applied per-route. Any endpoint added here is
 * PUBLIC unless it names requireAuth itself.
 *
 * Storage: Supabase table `app_users` (create it with sql/auth_schema.sql).
 * If the table is unavailable, the ADMIN_EMAIL/ADMIN_PASSWORD env fallback keeps
 * a single admin login working so the MVP/demo is not blocked.
 */

const express = require('express')
const router = express.Router()
const { sign } = require('../../lib/jwt')
const password = require('../../lib/password')
const { requireAuth } = require('../../middleware/auth')
const { rateLimit } = require('../../middleware/rateLimit')
const { revoke } = require('../../lib/tokenBlocklist')

// 10 attempts / 15 min per IP+email — slows brute-forcing without a real
// account-lockout system (which would need its own UX for legitimate users
// locked out by an attacker guessing their email).
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyField: 'email' })

// /change-password has no email in its body by design, so it keys on the
// authenticated subject instead. Without keyFn every caller would share one
// `ip:unknown` bucket and a single user could lock out everyone behind the
// same proxy IP.
const changePasswordRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	keyFn: (req) => (req.user && (req.user.sub || req.user.email)) || null,
})

let supabase = null
try {
	supabase = require('../../supabase')
} catch (_) {
	supabase = null
}

const SECRET = require('../../lib/authSecret')
const TTL = parseInt(process.env.TOKEN_TTL || '3600', 10)

// Shortest password we will store. Deliberately modest — the threat this closes
// is "password is empty or one character", not offline cracking (scrypt handles
// that). Raising it would silently lock out anyone who already registered.
const MIN_PASSWORD_LENGTH = 8

async function findUserByEmail(email) {
	if (!supabase) return null
	try {
		const { data, error } = await supabase
			.from('app_users')
			.select('*')
			.eq('email', email)
			.limit(1)
			.single()
		if (error) return null
		return data
	} catch (_) {
		return null
	}
}

function publicUser(u) {
	return { id: u.id, email: u.email, name: u.name, role: u.role, org: u.org }
}

// -- LOGIN -----------------------------------------------------
router.post('/login', authRateLimit, async (req, res) => {
	const { email, password: pass } = req.body || {}
	if (!email || !pass) return res.status(400).json({ error: 'email and password are required' })

	try {
		const user = await findUserByEmail(email)
		if (user && password.verify(pass, user.password_hash)) {
			const token = sign({ sub: user.id, email: user.email, role: user.role, org: user.org }, SECRET, TTL)
			return res.json({ token, user: publicUser(user) })
		}

		// Fallback: env admin (MVP/demo) so login works even without a DB table
		const adminEmail = process.env.ADMIN_EMAIL
		const adminPass = process.env.ADMIN_PASSWORD
		if (adminEmail && adminPass && email === adminEmail && password.timingSafeEqualString(pass, adminPass)) {
			const token = sign({ sub: 'admin', email: adminEmail, role: 'admin', org: process.env.ADMIN_ORG || 'horquva' }, SECRET, TTL)
			return res.json({ token, user: { id: 'admin', email: adminEmail, name: 'Admin', role: 'admin', org: process.env.ADMIN_ORG || 'horquva' } })
		}

		return res.status(401).json({ error: 'Invalid credentials' })
	} catch (err) {
		return res.status(500).json({ error: err.message })
	}
})

// -- ME --------------------------------------------------------
router.get('/me', requireAuth, (req, res) => {
	res.json({ user: req.user })
})

// -- LOGOUT ------------------------------------------------------
// Revokes this specific token (by jti) so it can't be reused after logout,
// without invalidating the user's other active sessions/tokens.
router.post('/logout', requireAuth, (req, res) => {
	revoke(req.user.jti, req.user.exp)
	res.json({ ok: true })
})

// -- CHANGE PASSWORD -------------------------------------------
// Replaces the former POST /reset-password, which took { email, password } and
// overwrote that account's hash with no proof the caller owned the mailbox —
// knowing any registered address was enough to take the account over.
//
// The fix is not "also check the old password". It is that the request no
// longer names a subject at all: the account changed is req.user.sub, read
// from the verified token, so there is no victim-selection parameter left to
// abuse. Supplying the current password on top defends the remaining case, an
// attacker holding a token they stole from an unattended session.
//
// This does NOT restore forgotten-password recovery, which needs a real
// email-delivery flow (signed token -> mailbox -> verify). Until that exists an
// admin resets a locked-out user directly in Supabase. Offering nothing is
// honest; offering the old endpoint was not.
router.post('/change-password', requireAuth, changePasswordRateLimit, async (req, res) => {
	const { currentPassword, newPassword } = req.body || {}
	if (!currentPassword || !newPassword) {
		return res.status(400).json({ error: 'currentPassword and newPassword are required' })
	}
	if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
		return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` })
	}
	if (String(newPassword) === String(currentPassword)) {
		return res.status(400).json({ error: 'New password must be different from the current one' })
	}
	if (!supabase) return res.status(503).json({ error: 'User store not configured. Set up the Supabase app_users table.' })

	try {
		// Identity comes from the token, never from the body.
		const user = await findUserByEmail(req.user.email)
		if (!user) {
			// A valid token for an account that no longer exists — e.g. the
			// env-admin fallback, which has no app_users row to update.
			return res.status(404).json({ error: 'This account has no stored password to change' })
		}

		if (!password.verify(currentPassword, user.password_hash)) {
			return res.status(401).json({ error: 'Current password is incorrect' })
		}

		const { error } = await supabase
			.from('app_users')
			.update({ password_hash: password.hash(newPassword) })
			.eq('id', user.id)
		if (error) throw new Error(error.message)

		// Retire the token that authorised the change. If it was stolen, the
		// thief loses it the moment the real owner rotates their password.
		revoke(req.user.jti, req.user.exp)

		return res.json({ ok: true, message: 'Password updated. Please sign in again.' })
	} catch (err) {
		return res.status(500).json({ error: err.message })
	}
})

module.exports = router
