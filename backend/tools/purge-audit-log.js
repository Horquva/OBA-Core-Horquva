const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const supabase = require('../supabase')
const { recordAudit } = require('../lib/audit')

async function main() {
	const dryRun = process.argv.includes('--dry-run')
	const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
	const { data: oldRows, error: countError } = await supabase
		.from('audit_log')
		.select('id')
		.lt('occurred_at', cutoff)
	if (countError) throw new Error(countError.message)
	const count = (oldRows || []).length
	console.log(`${count} audit record(s) older than 180 days`)
	if (dryRun) return

	const { error } = await supabase.from('audit_log').delete().lt('occurred_at', cutoff)
	if (error) throw new Error(error.message)
	await recordAudit(null, {
		action: 'audit.purge',
		outcome: 'success',
		actor: { id: 'cli' },
		changes: { deleted: { from: null, to: count } },
	})
	console.log(`Deleted ${count} audit record(s)`)
}

main().catch((err) => {
	console.error('Audit purge failed:', err.message)
	process.exit(1)
})