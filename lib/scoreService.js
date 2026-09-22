// backend/lib/scoreService.js
// AI-1: Score calculation and persistence

const { supabase } = require('../supabase');

/**
 * Calculate score for an entity
 * @param {string} entityId - The entity being scored
 * @param {string} entityType - Type of entity (employee, agent, workflow, etc)
 * @param {object} factors - Scoring factors/data
 * @returns {object} Score object with value and confidence
 */
function calculateScore(entityId, entityType, factors) {
  // Simple scoring logic for now
  // In production: use complex algorithms based on factors
  
  if (!factors) {
    throw new Error('Factors required for scoring');
  }

  // Calculate base score (0-100)
  let score = 50; // Default middle score
  let confidence = 0.5;

  // Adjust based on factors
  if (factors.riskLevel === 'high') {
    score += 30;
    confidence += 0.3;
  } else if (factors.riskLevel === 'low') {
    score -= 20;
    confidence += 0.2;
  }

  if (factors.dependencies > 5) {
    score += 15;
    confidence += 0.15;
  }

  if (factors.workload > 80) {
    score += 20;
    confidence += 0.1;
  }

  // Clamp score between 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));
  confidence = Math.max(0, Math.min(1, parseFloat(confidence.toFixed(2))));

  return { score, confidence };
}

/**
 * Save score to database
 * @param {string} entityId 
 * @param {string} entityType 
 * @param {number} scoreValue 
 * @param {number} confidence 
 * @returns {object} Saved score record
 */
async function saveScore(entityId, entityType, scoreValue, confidence) {
  try {
    // When database is ready, uncomment this:
    // const { data, error } = await supabase
    //   .from('scores')
    //   .insert({
    //     entity_id: entityId,
    //     entity_type: entityType,
    //     score_value: scoreValue,
    //     confidence: confidence,
    //     created_at: new Date().toISOString()
    //   })
    //   .select();

    // if (error) throw error;
    // return data[0];

    // For now, return mock data
    console.log(`✅ Score saved: ${entityId} = ${scoreValue} (confidence: ${confidence})`);
    return {
      id: 'mock-id-' + Date.now(),
      entity_id: entityId,
      entity_type: entityType,
      score_value: scoreValue,
      confidence: confidence,
      created_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error saving score:', error.message);
    throw error;
  }
}

/**
 * Get score history for an entity
 * @param {string} entityId 
 * @param {number} days - Number of days to look back
 * @returns {array} Array of score records
 */
async function getScoreHistory(entityId, days = 30) {
  try {
    // When database is ready, uncomment this:
    // const { data, error } = await supabase
    //   .from('scores')
    //   .select('*')
    //   .eq('entity_id', entityId)
    //   .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    //   .order('created_at', { ascending: false });

    // if (error) throw error;
    // return data;

    // For now, return empty
    console.log(`Retrieving ${days}-day history for ${entityId}`);
    return [];

  } catch (error) {
    console.error('Error retrieving score history:', error.message);
    throw error;
  }
}

/**
 * Calculate and save score in one operation
 * @param {string} entityId 
 * @param {string} entityType 
 * @param {object} factors 
 * @returns {object} Saved score with ID
 */
async function calculateAndSave(entityId, entityType, factors) {
  // Step 1: Calculate score
  const { score, confidence } = calculateScore(entityId, entityType, factors);

  // Step 2: Save to database
  const savedScore = await saveScore(entityId, entityType, score, confidence);

  // Step 3: Return with metadata
  return {
    ...savedScore,
    factors: factors,
    calculatedAt: new Date().toISOString()
  };
}

module.exports = {
  calculateScore,
  saveScore,
  getScoreHistory,
  calculateAndSave
};