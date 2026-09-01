function resolveEntityMatches(query, entities = []) {
  if (!query || typeof query !== 'string') return [];
  const nq = query.trim().toLowerCase();
  return entities.filter(e => {
    const fn = (e.firstName || e.first_name || '').toLowerCase();
    const ln = (e.lastName || e.last_name || '').toLowerCase();
    const full = (fn + ' ' + ln).trim();
    return fn === nq || ln === nq || full === nq || full.includes(nq);
  });
}
module.exports = { resolveEntityMatches };
