// SEC-2 — the session token lives in an httpOnly cookie, not in page-readable
// browser storage.
//
// httpOnly means page scripts (including any injected by an XSS bug) cannot
// read the token; the browser still attaches it to every credentialed request.
//
// SameSite / Secure:
//   Local dev — frontend on localhost:3001, backend on localhost:3000. Ports do
//   not change the "site", so these are same-site and SameSite=Lax works over
//   plain http.
//   Deployed (recommended) — the frontend proxies /api/* to the backend
//   (frontend/next.config.ts), so the browser only ever talks to one site.
//   Keep SameSite=Lax and set COOKIE_SECURE=true so the cookie is HTTPS-only.
//   Deployed without the proxy — frontend and backend on different sites. A
//   browser only sends a cookie on a cross-site request when it is
//   SameSite=None; Secure: set COOKIE_CROSS_SITE=true. Some browsers block
//   such third-party cookies entirely, which is why the proxy is preferred.
//
// Because SameSite=None cookies ride along on requests other sites trigger,
// cookie-authenticated state-changing requests must also carry CLIENT_HEADER
// (enforced in middleware/auth.js). A custom header forces a CORS preflight,
// which the CORS_ORIGINS allowlist refuses for any other origin — so a forged
// form post or cross-site fetch cannot use the cookie to change data.

const COOKIE_NAME = 'horquva_session'
const CLIENT_HEADER = 'x-horquva-client'

function crossSite() {
	return String(process.env.COOKIE_CROSS_SITE || '').toLowerCase() === 'true'
}

function secureFlag() {
	return String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true'
}

function cookieOptions() {
	const cross = crossSite()
	return {
		httpOnly: true,
		// SameSite=None is only accepted together with Secure.
		secure: cross || secureFlag(),
		sameSite: cross ? 'none' : 'lax',
		path: '/',
	}
}

function setSessionCookie(res, token, ttlSeconds) {
	res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: ttlSeconds * 1000 })
}

function clearSessionCookie(res) {
	res.clearCookie(COOKIE_NAME, cookieOptions())
}

// Minimal Cookie-header reader — only this one cookie is ever needed, so no
// cookie-parser dependency.
function readSessionCookie(req) {
	const header = req.headers.cookie
	if (!header) return null
	for (const part of header.split(';')) {
		const i = part.indexOf('=')
		if (i === -1) continue
		if (part.slice(0, i).trim() !== COOKIE_NAME) continue
		const value = part.slice(i + 1).trim()
		try {
			return decodeURIComponent(value) || null
		} catch (_) {
			return null
		}
	}
	return null
}

module.exports = {
	COOKIE_NAME,
	CLIENT_HEADER,
	cookieOptions,
	setSessionCookie,
	clearSessionCookie,
	readSessionCookie,
}
