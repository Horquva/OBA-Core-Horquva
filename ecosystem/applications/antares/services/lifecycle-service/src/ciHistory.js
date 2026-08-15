'use strict';

const fs = require('fs');
const path = require('path');

/**
 * ciHistory.js
 * ------------
 * Day 5's `scripts/ci.js` only showed a result in the terminal, then
 * it was gone. To compute "Engineering Health" we save every CI run's
 * result here — so we can report things like "how many of the last 20
 * runs passed".
 */

const DEFAULT_HISTORY_PATH = path.join(__dirname, '..', 'store', 'ci-history.json');

function loadHistory(historyPath = DEFAULT_HISTORY_PATH) {
  if (!fs.existsSync(historyPath)) return [];
  return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
}

/** result = { lintPassed, buildPassed, testsPassed, overallPassed } */
function recordCiRun(result, historyPath = DEFAULT_HISTORY_PATH) {
  const dir = path.dirname(historyPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const history = loadHistory(historyPath);
  history.push({ at: new Date().toISOString(), ...result });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  return history;
}

/** Engineering Health = pass-rate over the last `windowSize` recorded CI runs. */
function getEngineeringHealth(windowSize = 20, historyPath = DEFAULT_HISTORY_PATH) {
  const history = loadHistory(historyPath).slice(-windowSize);
  if (history.length === 0) {
    return {
      runsTracked: 0,
      lintPassRate: null,
      buildPassRate: null,
      testPassRate: null,
      overallPassRate: null,
      lastRunAt: null,
    };
  }
  const pct = (key) => Math.round((history.filter((h) => h[key]).length / history.length) * 100);
  return {
    runsTracked: history.length,
    lintPassRate: pct('lintPassed'),
    buildPassRate: pct('buildPassed'),
    testPassRate: pct('testsPassed'),
    overallPassRate: pct('overallPassed'),
    lastRunAt: history[history.length - 1].at,
  };
}

module.exports = { recordCiRun, loadHistory, getEngineeringHealth, DEFAULT_HISTORY_PATH };
