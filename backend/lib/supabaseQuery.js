/**
 * Supabase query helpers — make a failed query fail.
 *
 * The dominant bug class in this codebase was destructuring only `{ data }`
 * from a Supabase response and letting a falsy/empty `data` fall through to a
 * default (0, [], null, or a hardcoded fallback). A real outage — bad
 * credentials, a dropped table, an RLS rejection, a network blip — then became
 * indistinguishable from "there is nothing to report", with no log line marking
 * the difference. On a KPI that means a database failure is presented to an
 * executive as a real, confident number.
 *
 * `must()` collapses the correct handling into one call. Every caller that
 * feeds a computed score should use it.
 *
 *   const runbooks = await must('workflow_runbooks', supabase
 *     .from('workflow_runbooks').select('is_documented'))
 *
 * On a single-row read, pick the verb that matches intent:
 *   - `.single()`      — a missing row IS a failure; Supabase errors, must() throws.
 *   - `.maybeSingle()` — a missing row is legitimately empty; data is null, no throw.
 * Never use `.single()` for something optional: "no rows" and "query broke" come
 * back as the same error shape and the distinction is lost again.
 */

/**
 * Await a Supabase query builder and return its data, throwing on error.
 * @param {string} label  What was being read — appears in the error message.
 * @param query           A Supabase query builder (thenable).
 */
async function must(label, query) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}

/**
 * Same as must(), but for a read whose absence should not fail the request —
 * an optional enrichment, not a KPI input. Returns `fallback` and logs the real
 * error rather than throwing, so the failure is still visible in the log
 * instead of vanishing into a default.
 */
async function optional(label, query, fallback = null) {
  const { data, error } = await query
  if (error) {
    console.warn(`[supabase] optional read failed — ${label}: ${error.message}`)
    return fallback
  }
  return data ?? fallback
}

module.exports = { must, optional }
