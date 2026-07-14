/*
 * OBA Core — Password hashing using Node's built-in crypto.scrypt.
 * No external dependency (no bcrypt needed).
 * Stored format:  scrypt$<salt-hex>$<derived-hex>
 */

const crypto = require('crypto')

function hash(password) {
	const salt = crypto.randomBytes(16).toString('hex')
	const derived = crypto.scryptSync(String(password), salt, 64).toString('hex')
	return 'scrypt$' + salt + '$' + derived
}

function verify(password, stored) {
	try {
		const parts = String(stored).split('$')
		if (parts.length !== 3 || parts[0] !== 'scrypt') return false
		const salt = parts[1]
		const key = Buffer.from(parts[2], 'hex')
		const derived = crypto.scryptSync(String(password), salt, 64)
		return key.length === derived.length && crypto.timingSafeEqual(key, derived)
	} catch (_) {
		return false
	}
}

module.exports = { hash, verify }
