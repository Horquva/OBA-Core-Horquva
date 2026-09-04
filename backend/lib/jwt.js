/*
 * OBA Core — Minimal JWT (HS256) using Node's built-in crypto.
 * No external dependency (no jsonwebtoken needed), so it deploys on Vercel
 * without any extra npm install step.
 */

const crypto = require('crypto')

function b64url(input) {
	return Buffer.from(input)
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
}

function b64urlJson(obj) {
	return b64url(JSON.stringify(obj))
}

function signature(data, secret) {
	return crypto
		.createHmac('sha256', secret)
		.update(data)
		.digest('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
}

/** Sign a payload. expiresInSec default 1 hour. Every token gets a unique
 *  `jti` so a single session can be revoked (logout) without invalidating
 *  every other token issued to the same user. */
function sign(payload, secret, expiresInSec = 3600) {
	if (!secret) throw new Error('JWT secret missing')
	const header = { alg: 'HS256', typ: 'JWT' }
	const now = Math.floor(Date.now() / 1000)
	const jti = crypto.randomBytes(12).toString('hex')
	const body = Object.assign({ iat: now, exp: now + expiresInSec, jti }, payload)
	const data = b64urlJson(header) + '.' + b64urlJson(body)
	return data + '.' + signature(data, secret)
}

/** Verify a token and return its payload, or throw. */
function verify(token, secret) {
	if (!secret) throw new Error('JWT secret missing')
	const parts = String(token || '').split('.')
	if (parts.length !== 3) throw new Error('Malformed token')
	const data = parts[0] + '.' + parts[1]
	const expected = signature(data, secret)
	const a = Buffer.from(parts[2])
	const e = Buffer.from(expected)
	if (a.length !== e.length || !crypto.timingSafeEqual(a, e)) throw new Error('Invalid signature')
	const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
	if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) throw new Error('Token expired')
	return payload
}

module.exports = { sign, verify }
