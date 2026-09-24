/**
 * AI-3: Replaceability Scoring
 * Computes Replaceability rating and explanation for any entity (person, AI agent, vendor, system).
 */

function computeReplaceability(entity = {}) {
  // Extract and normalize the three factors as booleans
  const backupExists = Boolean(entity.backupExists);
  const alternativeExists = Boolean(entity.alternativeExists);
  const isDocumented = Boolean(entity.isDocumented);

  // Count present factors
  const presentFactorsCount = [backupExists, alternativeExists, isDocumented].filter(Boolean).length;
  const missingFactorsCount = 3 - presentFactorsCount;

  let rating = '';
  let explanation = '';

  if (missingFactorsCount === 0) {
    rating = 'High';
    explanation = 'Entity is highly replaceable: backup exists, alternative vendor/model exists, and knowledge is documented.';
  } else if (missingFactorsCount === 1) {
    rating = 'Medium';
    explanation = 'Entity has medium replaceability: missing exactly one critical factor (backup, alternative, or documentation).';
  } else {
    rating = 'Low';
    explanation = 'Entity has low replaceability: missing two or more critical factors (backup, alternative, or documentation).';
  }

  return {
    entityId: entity.id || entity.entityId || 'unknown',
    rating,
    explanation,
    factors: {
      backupExists,
      alternativeExists,
      isDocumented
    }
  };
}

module.exports = { computeReplaceability };