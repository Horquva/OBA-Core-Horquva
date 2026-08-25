/*
 * OBA Core — the HMAC secret every issued token is signed and verified with.
 *
 * No fallback. A hardcoded default here would mean any deployment that
 * forgets to set JWT_SECRET signs tokens with a secret sitting in plaintext
 * in git history — anyone could forge a token for any role, including admin,
 * and walk straight past requireAuth/requireRole. The failure would be
 * silent: the server starts fine and auth appears to work.
 */

const SECRET = process.env.JWT_SECRET

if (!SECRET) {
	throw new Error(
		'JWT_SECRET is not set. Refusing to start with a guessable fallback secret — set JWT_SECRET in backend/.env.'
	)
}

module.exports = SECRET
