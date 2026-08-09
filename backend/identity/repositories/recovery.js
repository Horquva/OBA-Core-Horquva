/*
 * MFA recovery-code repository. Codes are stored only as hashes and are single-use.
 * Access is always via a user already resolved within its organization.
 */
const { runner } = require('./exec')

async function createMany(exec, userId, codeHashes) {
  for (const code_hash of codeHashes) {
    await runner(exec).query(
      `insert into identity.mfa_recovery_code (user_id, code_hash) values ($1, $2)`,
      [userId, code_hash]
    )
  }
}

async function listUnused(exec, userId) {
  const { rows } = await runner(exec).query(
    `select * from identity.mfa_recovery_code where user_id = $1 and used_at is null`,
    [userId]
  )
  return rows
}

async function markUsed(exec, id) {
  await runner(exec).query(
    `update identity.mfa_recovery_code set used_at = now() where id = $1`,
    [id]
  )
}

async function deleteForUser(exec, userId) {
  await runner(exec).query(`delete from identity.mfa_recovery_code where user_id = $1`, [userId])
}

module.exports = { createMany, listUnused, markUsed, deleteForUser }
