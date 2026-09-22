// backend/lib/evidenceService.js
// AI-1: Evidence capture and persistence

const { supabase } = require('../supabase');

/**
 * Generate evidence text from factors
 * @param {string} entityId 
 * @param {object} factors 
 * @returns {array} Array of evidence strings
 */
function generateEvidence(entityId, factors) {
  const evidence = [];

  if (factors.riskLevel === 'high') {
    evidence.push('High risk level detected - entity requires closer monitoring');
  }

  if (factors.dependencies > 5) {
    evidence.push(`Entity has ${factors.dependencies} critical dependencies - score impacted by complexity`);
  }

  if (factors.workload > 80) {
    evidence.push('Workload exceeds safe threshold - capacity concerns flagged');
  }

  if (!factors.backup) {
    evidence.push('No backup or redundancy identified - continuity risk');
  }

  if (evidence.length === 0) {
    evidence.push('Entity meets baseline criteria - low risk profile');
  }

  return evidence;
}

/**
 * Save evidence for a score
 * @param {string} scoreId - ID of the score this evidence relates to
 * @param {string} reasonText - Human-readable reason
 * @param {string} factorType - Type of factor (risk, dependency, workload, etc)
 * @param {string} impactDirection - up/down/neutral
 * @returns {object} Saved evidence record
 */
async function saveEvidence(scoreId, reasonText, factorType = null, impactDirection = 'neutral') {
  try {
    // When database is ready, uncomment this:
    // const { data, error } = await supabase
    //   .from('evidence')
    //   .insert({
    //     score_id: scoreId,
    //     reason_text: reasonText,
    //     factor_type: factorType,
    //     impact_direction: impactDirection,
    //     created_at: new Date().toISOString()
    //   })
    //   .select();

    // if (error) throw error;
    // return data[0];

    // For now, return mock data
    console.log(`✅ Evidence saved for score ${scoreId}: "${reasonText}"`);
    return {
      id: 'mock-evidence-' + Date.now(),
      score_id: scoreId,
      reason_text: reasonText,
      factor_type: factorType,
      impact_direction: impactDirection,
      created_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error saving evidence:', error.message);
    throw error;
  }
}

/**
 * Save multiple evidence records for a score
 * @param {string} scoreId 
 * @param {array} evidenceList - Array of {reason, factorType, impactDirection}
 * @returns {array} Saved evidence records
 */
async function saveEvidenceList(scoreId, evidenceList) {
  try {
    const saved = [];

    for (const evidence of evidenceList) {
      const saved_evidence = await saveEvidence(
        scoreId,
        evidence.reason,
        evidence.factorType,
        evidence.impactDirection
      );
      saved.push(saved_evidence);
    }

    console.log(`✅ Saved ${saved.length} evidence records for score ${scoreId}`);
    return saved;

  } catch (error) {
    console.error('Error saving evidence list:', error.message);
    throw error;
  }
}

/**
 * Get evidence for a score
 * @param {string} scoreId 
 * @returns {array} Array of evidence records
 */
async function getEvidenceForScore(scoreId) {
  try {
    // When database is ready, uncomment this:
    // const { data, error } = await supabase
    //   .from('evidence')
    //   .select('*')
    //   .eq('score_id', scoreId)
    //   .order('created_at', { ascending: false });

    // if (error) throw error;
    // return data;

    // For now, return empty
    console.log(`Retrieving evidence for score ${scoreId}`);
    return [];

  } catch (error) {
    console.error('Error retrieving evidence:', error.message);
    throw error;
  }
}

/**
 * Validate that score has evidence (no orphan scores)
 * @param {string} scoreId 
 * @returns {boolean} True if score has at least one evidence record
 */
async function hasEvidence(scoreId) {
  const evidence = await getEvidenceForScore(scoreId);
  return evidence && evidence.length > 0;
}

module.exports = {
  generateEvidence,
  saveEvidence,
  saveEvidenceList,
  getEvidenceForScore,
  hasEvidence
};