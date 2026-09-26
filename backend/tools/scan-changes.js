#!/usr/bin/env node
/*
 * AI-6 — run one change scan from the command line.
 *
 *   node tools/scan-changes.js             detect, record, advance the baseline
 *   node tools/scan-changes.js --dry-run   detect and print; write nothing
 *
 * There is no scheduler (handout §2.4), so this is run by hand — weekly, per
 * decision D2. The same scan is available to admins as
 * POST /api/change-impact/scan.
 *
 * Fail-closed: if it fails, the baseline is not advanced, so running it again
 * later picks up the same changes. Exits non-zero on failure.
 */

const supabase = require('../supabase')
const store = require('../lib/changeImpactStore')

const dryRun = process.argv.includes('--dry-run')

store
  .scanForChanges(supabase, { dryRun })
  .then((out) => {
    if (out.firstScan) {
      console.log(dryRun
        ? 'No baseline yet. A real run would record one now; there is nothing to compare against.'
        : `First scan: baseline recorded at ${out.baselineTakenAt}. Change history starts now.`)
      process.exit(0)
    }

    console.log(`${dryRun ? '[dry run] ' : ''}Compared against the baseline from ${out.previousBaselineAt}.`)
    if (!out.detected) {
      console.log('No tracked changes.')
    } else {
      console.log(`${out.detected} change(s)${dryRun ? ' found — nothing written:' : ` recorded (scan ${out.scanId}):`}`)
      for (const e of out.events) {
        const impact = e.priced
          ? `health ${e.healthDelta == null ? 'n/a' : (e.healthDelta > 0 ? '+' : '') + e.healthDelta}`
          : 'not priced by the existing calculation'
        console.log(`  • ${e.description}  (${impact})`)
      }
    }
    process.exit(0)
  })
  .catch((err) => {
    console.error(`Scan failed: ${err.message}`)
    process.exit(1)
  })
