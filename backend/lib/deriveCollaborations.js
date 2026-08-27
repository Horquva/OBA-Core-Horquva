/**
 * Two people collaborate if they share an entity's RACI in
 * `accountability_links`, or both act as `human` on the same workflow's
 * steps. This is the single source of truth for that derivation — used by
 * both `graphLoader.js` (graph edges) and `export-company.js`
 * (`company.json`'s `collaborations` section) so the two outputs cannot
 * drift apart for real, rather than by a comment promising they wouldn't.
 * Before this, both files reimplemented the same algorithm independently
 * and had already drifted on the basis label for the workflow signal
 * (`'workflow_step'` vs `'workflow'`) and on whether weight was tracked.
 *
 * RACI runs first so the stronger basis wins when a pair appears in both —
 * `weight` still counts every shared context regardless of basis. A person
 * name that resolves to no real entity is skipped, never invented (D-07).
 */
function deriveCollaborations({ acctEntities, acctLinks, workflows, workflowSteps }) {
  const pairs = new Map() // 'A|B' (sorted) -> { basis, on, weight }
  const addPair = (a, b, basis, on) => {
    if (!a || !b || a === b) return
    const key = [a, b].sort().join('|')
    if (!pairs.has(key)) pairs.set(key, { basis, on, weight: 0 })
    pairs.get(key).weight++
  }

  for (const entity of acctEntities || []) {
    const people = [...new Set(
      (acctLinks || []).filter((l) => l.entity_id === entity.id).map((l) => l.person_name),
    )].filter(Boolean)
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) addPair(people[i], people[j], 'raci', entity.entity_name)
    }
  }

  for (const w of workflows || []) {
    const people = [...new Set(
      (workflowSteps || [])
        .filter((s) => s.workflow_id === w.id && s.actor_type === 'human')
        .map((s) => s.actor_name),
    )].filter(Boolean)
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) addPair(people[i], people[j], 'workflow_step', w.name)
    }
  }

  return [...pairs.entries()].map(([key, { basis, on, weight }]) => {
    const [a, b] = key.split('|')
    return { a, b, basis, on, weight }
  })
}

module.exports = { deriveCollaborations }
