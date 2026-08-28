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

// For comparing a plaintext secret against another plaintext secret (the
// ADMIN_PASSWORD env fallback in routes/auth/auth.js — there is no stored hash
// to run through verify() above). A plain `===` leaks how many leading bytes
// matched via response timing; crypto.timingSafeEqual() closes that, but only
// accepts equal-length buffers, so unequal lengths are rejected up front
// rather than passed to it (which would throw).
function timingSafeEqualString(a, b) {
	const bufA = Buffer.from(String(a))
	const bufB = Buffer.from(String(b))
	return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)
}

module.exports = { hash, verify, timingSafeEqualString }
