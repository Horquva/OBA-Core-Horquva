'use strict';

const { getEngineeringHealth } = require('./ciHistory');

/**
 * observability.js
 * ----------------
 * Din 6 ka core: teen alag "health" cheezein ek jagah la kar deta hai.
 *
 *   1) System Health     — engine.getSystemHealth()      (Din 1 se hai)
 *   2) Engineering Health — ciHistory.getEngineeringHealth() (AAJ naya)
 *   3) Platform Health    — engine.getPlatformHealth() (har platform ke liye)
 *
 * Ye teeno alag concepts hain: System = job-level status,
 * Engineering = code-quality/CI trend, Platform = per-owner breakdown.
 */

function getPlatformHealthAll(engine) {
  return [...engine.platforms.values()].map((p) => engine.getPlatformHealth(p.id));
}

function getFullObservability(engine) {
  return {
    systemHealth: engine.getSystemHealth(),
    engineeringHealth: getEngineeringHealth(),
    platformHealth: getPlatformHealthAll(engine),
    recentEvents: engine.recentEvents(10),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getFullObservability, getPlatformHealthAll };
