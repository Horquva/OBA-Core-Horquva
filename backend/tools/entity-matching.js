/**
 * Task 10.3: Entity Matching
 *
 * Two-stage strategy per the implementation plan (§10.3) — lifted and
 * generalised from routes/voice/voice.js's findEntity()/findPerson()
 * rather than invented from scratch:
 *   1. Exact or substring match — fast, most reliable, tried first.
 *   2. Fuzzy fallback — score by the fraction of the entity name's
 *      SIGNIFICANT words (generic category words stripped) that appear
 *      in the query, exactly voice.js's own scoring rule.
 *
 * Unlike voice.js — which silently returns its single best guess — this
 * never silently picks one: every candidate found at whichever stage
 * matched is returned, each carrying a confidence label, and `ambiguous`
 * is set when two or more sit within a narrow band of the top score.
 */

// Generic category words a person actually says that don't discriminate
// between entities ("the workflow", "that agent") — stripped before fuzzy
// scoring so they can't inflate a match. Same list as voice.js's
// GENERIC_WORDS, kept in sync deliberately rather than imported, since
// tools/ has no existing dependency on routes/.
const GENERIC_WORDS = new Set([
  'the', 'a', 'an', 'workflow', 'process', 'pipeline', 'agent', 'bot', 'system', 'platform', 'tool',
]);

// Two fuzzy candidates within this fraction of the top score both count
// as live contenders for "ambiguous", not just the single highest scorer.
const AMBIGUITY_BAND = 0.15;
// A fuzzy match needs at least half of an entity's significant words
// present in the query before it counts at all (voice.js's own threshold).
const FUZZY_SCORE_THRESHOLD = 0.5;

function displayName(entity) {
  const firstName = entity.firstName || entity.first_name || '';
  const lastName = entity.lastName || entity.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  return entity.name || entity.displayName || fullName;
}

function significantTokens(name) {
  const tokens = String(name).toLowerCase().split(/\s+/).filter(Boolean);
  const significant = tokens.filter((t) => !GENERIC_WORDS.has(t));
  return significant.length ? significant : tokens;
}

function exactOrSubstringMatch(entity, normalizedQuery) {
  const firstName = (entity.firstName || entity.first_name || '').toLowerCase();
  const lastName = (entity.lastName || entity.last_name || '').toLowerCase();
  const fullName = `${firstName} ${lastName}`.trim();
  const name = displayName(entity).toLowerCase();

  return (
    firstName === normalizedQuery ||
    lastName === normalizedQuery ||
    fullName === normalizedQuery ||
    name === normalizedQuery ||
    fullName.includes(normalizedQuery) ||
    name.includes(normalizedQuery)
  );
}

/**
 * @param {string} query - Search string (e.g. "Sarah" or "Smith")
 * @param {Array<Object>} entities - List of entity objects containing names/IDs
 * @returns {{ candidates: Array<Object & {confidence: 'high'|'medium'|'low'}>, ambiguous: boolean }}
 */
function resolveEntityMatches(query, entities = []) {
  if (!query || typeof query !== 'string') {
    return { candidates: [], ambiguous: false };
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return { candidates: [], ambiguous: false };
  }

  // Stage 1: exact or substring match.
  const exact = entities.filter((entity) => exactOrSubstringMatch(entity, normalizedQuery));
  if (exact.length) {
    const candidates = exact.map((entity) => ({ ...entity, confidence: 'high' }));
    return { candidates, ambiguous: candidates.length > 1 };
  }

  // Stage 2: fuzzy fallback — only reached when nothing matched exactly.
  const queryTokens = new Set(normalizedQuery.split(/\s+/).filter(Boolean));
  const scored = [];
  for (const entity of entities) {
    const significant = significantTokens(displayName(entity));
    const matchedCount = significant.filter((t) => queryTokens.has(t)).length;
    const score = significant.length ? matchedCount / significant.length : 0;
    if (matchedCount >= 1 && score >= FUZZY_SCORE_THRESHOLD) {
      scored.push({ entity, score });
    }
  }

  if (!scored.length) {
    return { candidates: [], ambiguous: false };
  }

  scored.sort((a, b) => b.score - a.score);
  const bestScore = scored[0].score;
  const top = scored.filter((s) => bestScore - s.score <= AMBIGUITY_BAND);

  const candidates = top.map((s) => ({
    ...s.entity,
    confidence: s.score >= 0.75 ? 'medium' : 'low',
  }));

  return { candidates, ambiguous: candidates.length > 1 };
}

module.exports = {
  resolveEntityMatches,
};
