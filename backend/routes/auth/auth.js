/*
 * OBA Core — Authentication routes (Identity Gateway, MVP).
 * Endpoints:
 *   POST /api/auth/register   { email, password, name?, role?, org? }
 *   POST /api/auth/login      { email, password }   -> { token, user }
 *   GET  /api/auth/me         (Bearer token)         -> { user }
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

let supabase = null
try {
	supabase = require('../../supabase')
} catch (_) {
	supabase = null
}

const SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me'
const TTL = parseInt(process.env.TOKEN_TTL || '3600', 10)

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

// -- REGISTER --------------------------------------------------
router.post('/register', async (req, res) => {
	const { email, password: pass, name, role, org } = req.body || {}
	if (!email || !pass) return res.status(400).json({ error: 'email and password are required' })
	if (!supabase) return res.status(503).json({ error: 'User store not configured. Set up the Supabase app_users table.' })

	try {
		const existing = await findUserByEmail(email)
		if (existing) return res.status(409).json({ error: 'User already exists' })

		const { data, error } = await supabase
			.from('app_users')
			.insert([{ email, name: name || null, role: role || 'member', org: org || null, password_hash: password.hash(pass) }])
			.select('*')
			.single()
		if (error) throw new Error(error.message)

		const token = sign({ sub: data.id, email: data.email, role: data.role, org: data.org }, SECRET, TTL)
		return res.status(201).json({ token, user: publicUser(data) })
	} catch (err) {
		return res.status(500).json({ error: err.message })
	}
})

// -- LOGIN -----------------------------------------------------
router.post('/login', async (req, res) => {
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
		if (adminEmail && adminPass && email === adminEmail && pass === adminPass) {
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

module.exports = router
