/*
 * OBA Core — Replaceability Unit & Logic Tests (FE-5 Part 1)
 *
 * Asserting rating determination:
 *   - High: Meets all 3 conditions (missing 0)
 *   - Medium: Missing exactly 1 condition
 *   - Low: Missing 2 or 3 conditions
 *
 * Asserting payload structure:
 *   - Must contain { rating, explanation, hasBackupOwner, hasAltVendor, isDocumented }
 */

const { evaluateEntityReplaceability } = require('../routes/intelligence/replaceability')

let passed = 0
let failed = 0

function check(name, cond, detail) {
  if (cond) {
    passed++
    console.log('  ✓', name)
  } else {
    failed++
    console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '')
  }
}

console.log('\n=== OBA Core — Replaceability Rating Logic Test ===\n')

// Mock graph
function makeMockGraph({ backupOwner = null, backupTool = null, documented = null, type = 'ai_agent' } = {}) {
  const entity = {
    id: 'ent_test_1',
    name: 'Test Entity',
    type,
    metadata: {
      backup_owner: backupOwner,
      backupTool,
      documented,
    },
  }

  const g = {
    entities: {
      get: (id) => (id === entity.id ? entity : null),
      list: () => [entity],
    },
    relationships: {
      to: () => [],
      from: () => [],
    },
  }

  return { entity, g }
}

// ── 1. High Rating (3 conditions met) ──
console.log('High Rating — Meets all 3 conditions:')
{
  const { entity, g } = makeMockGraph({
    backupOwner: 'Jane Doe',
    backupTool: 'Fallback Model',
    documented: true,
  })

  const res = evaluateEntityReplaceability(entity, g)
  check('rating is High', res.rating === 'High', res.rating)
  check('hasBackupOwner is true', res.hasBackupOwner === true, res.hasBackupOwner)
  check('hasAltVendor is true', res.hasAltVendor === true, res.hasAltVendor)
  check('isDocumented is true', res.isDocumented === true, res.isDocumented)
  check('explanation contains High replaceability', res.explanation.includes('High replaceability'), res.explanation)
}

// ── 2. Medium Rating (Missing exactly 1 condition) ──
console.log('\nMedium Rating — Missing exactly 1 condition:')
{
  // Missing backupOwner only
  const m1 = makeMockGraph({
    backupOwner: null,
    backupTool: 'Fallback Model',
    documented: true,
  })
  const res1 = evaluateEntityReplaceability(m1.entity, m1.g)
  check('missing backupOwner -> rating is Medium', res1.rating === 'Medium', res1.rating)
  check('hasBackupOwner is false', res1.hasBackupOwner === false, res1.hasBackupOwner)
  check('hasAltVendor is true', res1.hasAltVendor === true, res1.hasAltVendor)
  check('isDocumented is true', res1.isDocumented === true, res1.isDocumented)
  check('explanation mentions missing backup owner', res1.explanation.includes('backup owner'), res1.explanation)

  // Missing altVendor only
  const m2 = makeMockGraph({
    backupOwner: 'Jane Doe',
    backupTool: null,
    documented: true,
  })
  const res2 = evaluateEntityReplaceability(m2.entity, m2.g)
  check('missing altVendor -> rating is Medium', res2.rating === 'Medium', res2.rating)
  check('hasBackupOwner is true', res2.hasBackupOwner === true, res2.hasBackupOwner)
  check('hasAltVendor is false', res2.hasAltVendor === false, res2.hasAltVendor)
  check('isDocumented is true', res2.isDocumented === true, res2.isDocumented)

  // Missing isDocumented only
  const m3 = makeMockGraph({
    backupOwner: 'Jane Doe',
    backupTool: 'Fallback Model',
    documented: false,
  })
  const res3 = evaluateEntityReplaceability(m3.entity, m3.g)
  check('missing isDocumented -> rating is Medium', res3.rating === 'Medium', res3.rating)
  check('hasBackupOwner is true', res3.hasBackupOwner === true, res3.hasBackupOwner)
  check('hasAltVendor is true', res3.hasAltVendor === true, res3.hasAltVendor)
  check('isDocumented is false', res3.isDocumented === false, res3.isDocumented)
}

// ── 3. Low Rating (Missing 2 or 3 conditions) ──
console.log('\nLow Rating — Missing 2 or 3 conditions:')
{
  // Missing 2 conditions (only documented is true)
  const l1 = makeMockGraph({
    backupOwner: null,
    backupTool: null,
    documented: true,
  })
  const res1 = evaluateEntityReplaceability(l1.entity, l1.g)
  check('missing 2 conditions -> rating is Low', res1.rating === 'Low', res1.rating)
  check('explanation reflects Low replaceability', res1.explanation.includes('Low replaceability'), res1.explanation)

  // Missing 2 conditions (only backupOwner is true)
  const l2 = makeMockGraph({
    backupOwner: 'Jane Doe',
    backupTool: null,
    documented: false,
  })
  const res2 = evaluateEntityReplaceability(l2.entity, l2.g)
  check('missing 2 conditions (has backup only) -> rating is Low', res2.rating === 'Low', res2.rating)

  // Missing all 3 conditions
  const l3 = makeMockGraph({
    backupOwner: null,
    backupTool: null,
    documented: false,
  })
  const res3 = evaluateEntityReplaceability(l3.entity, l3.g)
  check('missing all 3 conditions -> rating is Low', res3.rating === 'Low', res3.rating)
  check('hasBackupOwner is false', res3.hasBackupOwner === false)
  check('hasAltVendor is false', res3.hasAltVendor === false)
  check('isDocumented is false', res3.isDocumented === false)
}

// ── 4. Required Output JSON Keys ──
console.log('\nRequired JSON response keys:')
{
  const { entity, g } = makeMockGraph({
    backupOwner: 'Jane Doe',
    backupTool: 'Fallback Model',
    documented: true,
  })
  const res = evaluateEntityReplaceability(entity, g)
  const requiredKeys = ['rating', 'explanation', 'hasBackupOwner', 'hasAltVendor', 'isDocumented']
  for (const key of requiredKeys) {
    check(`contains property "${key}"`, Object.prototype.hasOwnProperty.call(res, key))
  }
}

console.log('\n----------------------------------------')
console.log(`passed: ${passed}   failed: ${failed}`)
if (failed === 0) {
  console.log('REPLACEABILITY LOGIC TESTS PASSED ✅')
  console.log('----------------------------------------\n')
  process.exit(0)
} else {
  console.error('REPLACEABILITY LOGIC TESTS FAILED ❌')
  console.log('----------------------------------------\n')
  process.exit(1)
}
