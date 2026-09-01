/**
 * Task 10.3: Entity Matching
 * Matches incoming query strings against entity database records.
 * Rules:
 * 1. Matches first name, last name, or full name.
 * 2. If multiple records match (e.g., shared surname), returns ALL matching entities.
 * 3. Never silently pick one candidate when ambiguity exists.
 */

/**
 * @param {string} query - Search string (e.g. "Sarah" or "Smith")
 * @param {Array<Object>} entities - List of entity objects containing names/IDs
 * @returns {Array<Object>} List of matching entities
 */
function resolveEntityMatches(query, entities = []) {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return entities.filter((entity) => {
    const firstName = (entity.firstName || entity.first_name || '').toLowerCase();
    const lastName = (entity.lastName || entity.last_name || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();
    const displayName = (entity.name || entity.displayName || '').toLowerCase();

    return (
      firstName === normalizedQuery ||
      lastName === normalizedQuery ||
      fullName === normalizedQuery ||
      displayName === normalizedQuery ||
      fullName.includes(normalizedQuery) ||
      displayName.includes(normalizedQuery)
    );
  });
}

module.exports = {
  resolveEntityMatches,
};