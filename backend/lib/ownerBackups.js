const supabase = require('../supabase')

/**
 * employee_id -> backup_owner name, via the `owners` table (a 10-row subset
 * of employees carrying role/backup/risk, keyed by owners.employee_id).
 *
 * "Backup coverage" for an agent or workflow is NOT a column on those tables —
 * it's a property of whoever owns them (agents.owner_id / workflow_runbooks.owner_id,
 * both -> employees.id), recorded here. See ownership.js's header comment for
 * why this can't be joined on owners.id instead of owners.employee_id.
 */
async function loadOwnerBackupByEmployee() {
  const { data, error } = await supabase.from('owners').select('employee_id, backup_owner').not('employee_id', 'is', null)
  if (error) throw new Error(`owners: ${error.message}`)
  const byEmployee = {}
  for (const o of data || []) byEmployee[o.employee_id] = o.backup_owner
  return byEmployee
}

module.exports = { loadOwnerBackupByEmployee }
