/*
 * OBA Core — Change → Impact diff engine unit test (AI-6).
 *
 * domain/changeImpact.js runs the EXISTING risk/SPOF calculation before and
 * after a real change and reports the difference. These tests assert that on
 * hand-built root bundles where the right answer is known by construction,
 * same pattern as simulations.unit.test.js.
 *
 * Two settled decisions are pinned here so they cannot drift:
 *   - owner and backup changes are priced by the existing engine;
 *   - vendor and model changes are NOT priced by any existing calculation, so
 *     they must report a real zero with an explanation — and still name what
 *     is downstream — rather than have a rule invented for them (handout
 *     Section 7: no new rule set; Section 12: the derived layer is not
 *     redesigned by this cohort).
 *
 * No database and no network — every function here is pure.
 *
 * Run from backend/:  node tests/changeImpact.unit.test.js
 */

const d = require('../domain/derived')
const ci = require('../domain/changeImpact')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

function roots(overrides = {}) {
	const base = {}
	for (const t of d.ROOT_TABLES) base[t] = []
	const merged = { ...base, ...overrides }
	merged._counts = Object.fromEntries(d.ROOT_TABLES.map((t) => [t, merged[t].length]))
	return merged
}

/*
 * The fixture.
 *
 *   SupportBot (10)  critical, owned by Sarah (1), who has a backup (John)
 *   ReportBot  (11)  low,      owned by John (2), who has no backup
 *   Escalator  (12)  medium,   owned by John — DEPENDS ON SupportBot
 *
 *   Incident Response (100) uses Escalator  -> downstream of SupportBot
 *   Payroll           (101) uses ReportBot  -> NOT downstream of SupportBot
 *
 *   SupportBot runs on ChatGPT Enterprise (500), backed up by Claude Pro (501).
 *   John owns the ChatGPT Enterprise tool.
 */
function fixture() {
	return roots({
		employees: [
			{ id: 1, name: 'Sarah Connor', department: 'Eng' },
			{ id: 2, name: 'John Doe', department: 'Ops' },
		],
		agents: [
			{ id: 10, name: 'SupportBot', risk: 'critical', owner_id: 1 },
			{ id: 11, name: 'ReportBot', risk: 'low', owner_id: 2 },
			{ id: 12, name: 'Escalator', risk: 'medium', owner_id: 2 },
		],
		owners: [
			{ id: 1, name: 'Sarah Connor', employee_id: 1, backup_owner: 'John Doe' },
			{ id: 2, name: 'John Doe', employee_id: 2, backup_owner: null },
		],
		dependencies: [
			{ source_id: 12, target_id: 10, source_type: 'agent', target_type: 'agent', dependency_type: 'critical' },
		],
		workflows: [
			{ id: 100, name: 'Incident Response', risk: 'high' },
			{ id: 101, name: 'Payroll', risk: 'low' },
		],
		workflow_dependencies: [
			{ workflow_id: 100, agent_id: 12 },
			{ workflow_id: 101, agent_id: 11 },
		],
		ai_platforms: [
			{ id: 500, name: 'ChatGPT Enterprise', vendor: 'OpenAI' },
			{ id: 501, name: 'Claude Pro', vendor: 'Anthropic' },
		],
		agent_platform: [{ agent_id: 10, platform_id: 500 }],
		tool_backups: [{ primary_platform: 500, backup_platform: 501 }],
		tool_ownership: [{ platform_id: 500, employee_id: 2 }],
	})
}

const names = (xs) => xs.map((x) => x.name).sort()

console.log('\n=== OBA Core — Change → Impact Diff Engine Unit Test ===\n')

// ── applyChange ─────────────────────────────────────────────────────────────
console.log('applyChange — clones, never mutates:')
{
	const r = fixture()
	const next = ci.applyChange(r, { type: 'owner_changed', agentId: 10, toOwnerId: null })
	check('the input roots are untouched', r.agents.find((a) => a.id === 10).owner_id === 1)
	check('the clone carries the change', next.agents.find((a) => a.id === 10).owner_id === null)
	check('counts are recomputed on the clone', next._counts.agents === 3, next._counts)
}

console.log('\napplyChange — a malformed change is loud, not a silent zero:')
{
	const r = fixture()
	let unknownType = false
	try { ci.applyChange(r, { type: 'meteor_strike' }) } catch (e) { unknownType = /unknown change type/.test(e.message) }
	check('an unknown change type throws', unknownType)

	let missingAgent = false
	try { ci.applyChange(r, { type: 'owner_changed', agentId: 999, toOwnerId: 1 }) } catch (e) { missingAgent = /no agent/.test(e.message) }
	check('an unknown agent throws', missingAgent)

	let notOnPlatform = false
	try { ci.applyChange(r, { type: 'model_swapped', agentId: 10, fromPlatformId: 501, toPlatformId: 500 }) } catch (e) { notOnPlatform = /is not on platform/.test(e.message) }
	check('a swap from a platform the agent is not on throws', notOnPlatform)
}

// ── owner_changed — priced ─────────────────────────────────────────────────
console.log('\nAn owner being cleared is priced by the existing engine:')
{
	const out = ci.diffChange(fixture(), { type: 'owner_changed', agentId: 10, toOwnerId: null })
	const bot = out.agents.find((a) => a.agentId === 10)

	check('the change is described in words, naming the people involved',
		out.description === 'Owner of SupportBot changed from Sarah Connor to no one', out.description)
	check('it is priced', out.priced === true && out.note === null)
	check('the affected agent is reported', Boolean(bot))
	check('its risk score rose', bot && bot.delta > 0 && bot.after.score > bot.before.score, bot)
	check('the direction reads as worse', bot && bot.direction === 'worse', bot && bot.direction)
	check('the reason is named — single_owner now applies', bot && bot.factorsAdded.includes('single_owner'), bot && bot.factorsAdded)
	check('the SPOF status moved from not_spof to orphaned',
		bot && bot.before.spof === 'not_spof' && bot.after.spof === 'orphaned', bot && [bot.before.spof, bot.after.spof])
	check('an orphaning is reported as a SPOF change, not hidden',
		out.spofChanges.some((s) => s.agentId === 10 && s.after === 'orphaned'), out.spofChanges)
}

console.log('\nDownstream is named from the existing cascade engine:')
{
	const out = ci.diffChange(fixture(), { type: 'owner_changed', agentId: 10, toOwnerId: null })
	check('the changed agent and its transitive dependent are downstream',
		JSON.stringify(names(out.downstream.agents)) === JSON.stringify(['Escalator', 'SupportBot']), names(out.downstream.agents))
	check('the workflow reached through the dependent is named',
		names(out.downstream.workflows).includes('Incident Response'), names(out.downstream.workflows))
	check('an unrelated workflow is not dragged in',
		!names(out.downstream.workflows).includes('Payroll'), names(out.downstream.workflows))
}

// ── backup_removed — priced ────────────────────────────────────────────────
console.log('\nA backup disappearing is priced, and can create a SPOF:')
{
	const out = ci.diffChange(fixture(), { type: 'backup_removed', employeeId: 1 })
	const bot = out.agents.find((a) => a.agentId === 10)

	check('it is priced', out.priced === true)
	check('the critical agent Sarah owns got riskier', bot && bot.delta > 0, bot)
	check('single_owner now applies', bot && bot.factorsAdded.includes('single_owner'), bot && bot.factorsAdded)
	check('sole owner + no backup + critical becomes a SPOF', bot && bot.becameSpof === true, bot && [bot.before.spof, bot.after.spof])
	check('the new SPOF is listed', out.spofChanges.some((s) => s.agentId === 10 && s.after === 'spof'), out.spofChanges)
	check('downstream starts from the agents Sarah owns', names(out.downstream.agents).includes('SupportBot'), names(out.downstream.agents))
}

// ── tool_backup_removed — priced ──────────────────────────────────────────
console.log('\nA tool losing its backup is priced against the person who owns it:')
{
	const out = ci.diffChange(fixture(), { type: 'tool_backup_removed', platformId: 500 })
	const john = out.people.find((p) => p.employeeId === 2)

	check('it is priced', out.priced === true, out.note)
	check('the tool owner\'s exposure rose', john && john.delta > 0, out.people)
	check('the agent running on that tool is downstream', names(out.downstream.agents).includes('SupportBot'), names(out.downstream.agents))
}

// ── vendor_changed — NOT priced (settled decision) ────────────────────────
console.log('\nA vendor change is not priced — a real zero, explained, never invented:')
{
	const out = ci.diffChange(fixture(), { type: 'vendor_changed', platformId: 500, toVendor: 'Microsoft' })

	check('it reports as not priced', out.priced === false)
	check('no agent score moved', out.agents.length === 0, out.agents)
	check('no person\'s exposure moved', out.people.length === 0, out.people)
	check('org health did not move', out.health.before === out.health.after, out.health)
	check('the zero is explained rather than silent', typeof out.note === 'string' && /not score it|No existing/.test(out.note), out.note)
	check('the change is still described', out.description === 'Vendor of ChatGPT Enterprise changed from OpenAI to Microsoft', out.description)
	check('downstream is STILL named — a zero delta is not "nothing affected"',
		names(out.downstream.agents).includes('SupportBot') && names(out.downstream.workflows).includes('Incident Response'),
		out.downstream)
}

// ── model_swapped — NOT priced (settled decision) ─────────────────────────
console.log('\nA model swap is not priced either, and still names what it touches:')
{
	const out = ci.diffChange(fixture(), { type: 'model_swapped', agentId: 10, fromPlatformId: 500, toPlatformId: 501 })

	check('it reports as not priced', out.priced === false)
	check('no score moved', out.agents.length === 0 && out.people.length === 0, [out.agents, out.people])
	check('the change is described', out.description === 'SupportBot moved from ChatGPT Enterprise to Claude Pro', out.description)
	check('downstream is still named', names(out.downstream.workflows).includes('Incident Response'), out.downstream)
}

// ── detectChanges ──────────────────────────────────────────────────────────
console.log('\ndetectChanges — finds the real changes between two snapshots:')
{
	const prev = fixture()
	const same = ci.detectChanges(prev, fixture())
	check('two identical snapshots have no changes', same.length === 0, same)

	const next = fixture()
	next.agents.find((a) => a.id === 11).owner_id = 1            // owner changed
	next.owners.find((o) => o.employee_id === 1).backup_owner = null  // backup removed
	next.tool_backups = []                                        // tool backup removed
	next.agent_platform = [{ agent_id: 10, platform_id: 501 }]    // model swapped
	next.ai_platforms.find((p) => p.id === 501).vendor = 'Amazon' // vendor changed

	const found = ci.detectChanges(prev, next)
	const types = found.map((c) => c.type).sort()
	check('all five change types are detected',
		JSON.stringify(types) === JSON.stringify(['backup_removed', 'model_swapped', 'owner_changed', 'tool_backup_removed', 'vendor_changed']), types)

	const owner = found.find((c) => c.type === 'owner_changed')
	check('the owner change records both sides', owner && owner.agentId === 11 && owner.fromOwnerId === 2 && owner.toOwnerId === 1, owner)

	const swap = found.find((c) => c.type === 'model_swapped')
	check('the swap records from and to', swap && swap.fromPlatformId === 500 && swap.toPlatformId === 501, swap)

	const vendor = found.find((c) => c.type === 'vendor_changed')
	check('the vendor change records both sides', vendor && vendor.fromVendor === 'Anthropic' && vendor.toVendor === 'Amazon', vendor)
}

console.log('\ndetectChanges — does not guess at an ambiguous platform move:')
{
	const prev = fixture()
	const next = fixture()
	next.agent_platform = [{ agent_id: 10, platform_id: 501 }, { agent_id: 10, platform_id: 502 }]
	const found = ci.detectChanges(prev, next)
	check('one platform removed and two added is not called a swap', !found.some((c) => c.type === 'model_swapped'), found)
}

// ── diffSnapshots ──────────────────────────────────────────────────────────
console.log('\ndiffSnapshots — each change diffed on its own against the earlier snapshot:')
{
	const prev = fixture()
	const next = fixture()
	next.agents.find((a) => a.id === 10).owner_id = null
	next.ai_platforms.find((p) => p.id === 500).vendor = 'Microsoft'

	const diffs = ci.diffSnapshots(prev, next)
	check('one diff per detected change', diffs.length === 2, diffs.map((x) => x.change.type))

	const ownerDiff = diffs.find((x) => x.change.type === 'owner_changed')
	const vendorDiff = diffs.find((x) => x.change.type === 'vendor_changed')
	check('the owner change is priced on its own', ownerDiff && ownerDiff.priced === true)
	check('the vendor change is not priced on its own, even alongside a priced one',
		vendorDiff && vendorDiff.priced === false, vendorDiff && vendorDiff.priced)
	check('names come from the earlier snapshot', ownerDiff && /Sarah Connor/.test(ownerDiff.description), ownerDiff && ownerDiff.description)
}

console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'CHANGE IMPACT TESTS PASSED ✅' : 'CHANGE IMPACT TESTS FAILED ✗')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)
