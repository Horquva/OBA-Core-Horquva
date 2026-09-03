// Creates an app_users account directly. Replaces the public POST /register
// endpoint closed under D-13 — registration used to be self-service; now an
// admin runs this instead. Matches export-company.js/sweep.js's style: a
// plain `node script.js <args>` tool, no framework, no npm bin entry.
//
// Usage:
//   node backend/tools/provision-user.js <email> <password> [name] [role=member]
//
// org is hardcoded to 'horquva' rather than read from an env var — after
// D-01 there is exactly one org value, and asking an operator to also get an
// org string right on every account creation is one more way to reintroduce
// the drift D-01 just fixed.

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const supabase = require('../supabase')
const password = require('../lib/password')

const MIN_PASSWORD_LENGTH = 8
const ORG = 'horquva'

async function main() {
	const [email, pass, name, role] = process.argv.slice(2)
	if (!email || !pass) {
		console.error('Usage: node backend/tools/provision-user.js <email> <password> [name] [role=member]')
		process.exit(1)
	}
	if (pass.length < MIN_PASSWORD_LENGTH) {
		console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
		process.exit(1)
	}

	const { data: existing } = await supabase.from('app_users').select('id').eq('email', email).limit(1).single()
	if (existing) {
		console.error(`A user with email ${email} already exists (id ${existing.id})`)
		process.exit(1)
	}

	const { data, error } = await supabase
		.from('app_users')
		.insert([{ email, name: name || null, role: role || 'member', org: ORG, password_hash: password.hash(pass) }])
		.select('id, email, name, role, org')
		.single()
	if (error) {
		console.error('Failed to create account:', error.message)
		process.exit(1)
	}

	console.log('Account created:', JSON.stringify(data, null, 2))
}

main().catch((err) => {
	console.error('Unexpected error:', err.message)
	process.exit(1)
})
