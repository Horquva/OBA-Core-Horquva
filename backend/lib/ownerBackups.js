const supabase = require('../supabase')

/**
 * employee_id -> full `owners` row (a 10-row subset of employees carrying
 * id/name/role/backup_owner/risk, keyed by owners.employee_id).
 *
 * "Backup coverage" for an agent or workflow is NOT a column on those tables —
 * it's a property of whoever owns them (agents.owner_id / workflow_runbooks.owner_id,
 * both -> employees.id), recorded here. See ownership.js's header comment for
 * why this can't be joined on owners.id instead of owners.employee_id.
 *
 * The one query behind this file. `loadOwnerBackupByEmployee()` below is a
 * thin narrowing for callers that only ever wanted the backup_owner name —
 * ownership.js needs the rest of the row (id/name/role/risk), and used to
 * run this exact query itself rather than share it.
 */
async function loadOwners() {
  const { data, error } = await supabase.from('owners').select('id, name, role, backup_owner, risk, employee_id').not('employee_id', 'is', null)
  if (error) throw new Error(`owners: ${error.message}`)
  const byEmployee = {}
  for (const o of data || []) byEmployee[o.employee_id] = o
  return byEmployee
}

/** employee_id -> backup_owner name, for callers that only need the boolean/name. */
async function loadOwnerBackupByEmployee() {
  const owners = await loadOwners()
  const byEmployee = {}
  for (const [employeeId, o] of Object.entries(owners)) byEmployee[employeeId] = o.backup_owner
  return byEmployee
}

module.exports = { loadOwners, loadOwnerBackupByEmployee }
