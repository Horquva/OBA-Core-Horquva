/*
 * OBA Core — Auth unit test (JWT + password).  
 * No DB, no express. Run from backend/:  node tests/auth.unit.test.js
 */

const jwt = require('../lib/jwt')
const password = require('../lib/password')

let passed = 0
let failed = 0
function check(name, cond) {
	if (cond) { passed++; console.log('  \u2713', name) }
	else { failed++; console.error('  \u2717', name) }
}

console.log('\n=== OBA Core \u2014 Auth Unit Test ===\n')

const SECRET = 'test-secret-123'

// JWT
const token = jwt.sign({ sub: 'u1', email: 'a@b.com', role: 'admin', org: 'horquva' }, SECRET, 60)
check('JWT is a 3-part string', typeof token === 'string' && token.split('.').length === 3)

const payload = jwt.verify(token, SECRET)
check('JWT verify returns payload', payload && payload.email === 'a@b.com' && payload.role === 'admin')
check('JWT payload carries org', payload.org === 'horquva')

let wrongSecretRejected = false
try { jwt.verify(token, 'wrong-secret') } catch (_) { wrongSecretRejected = true }
check('JWT rejects wrong secret', wrongSecretRejected)

let expiredRejected = false
const expired = jwt.sign({ sub: 'u2' }, SECRET, -10) // already expired
try { jwt.verify(expired, SECRET) } catch (_) { expiredRejected = true }
check('JWT rejects expired token', expiredRejected)

let tamperRejected = false
try { jwt.verify(token + 'x', SECRET) } catch (_) { tamperRejected = true }
check('JWT rejects tampered token', tamperRejected)

// Password
const hash = password.hash('S3cret!')
check('Password hash has scrypt format', /^scrypt\$/.test(hash))
check('Password verify correct password', password.verify('S3cret!', hash) === true)
check('Password rejects wrong password', password.verify('wrong', hash) === false)
check('Two hashes of same password differ (salted)', password.hash('S3cret!') !== hash)

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed === 0 ? 0 : 1)
