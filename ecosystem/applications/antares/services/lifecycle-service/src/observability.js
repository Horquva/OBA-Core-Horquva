'use strict';

const { getEngineeringHealth } = require('./ciHistory');

/**
 * observability.js
 * ----------------
 * Day 6's core: brings three separate "health" concepts together.
 *
 *   1) System Health      — engine.getSystemHealth()         (since Day 1)
 *   2) Engineering Health  — ciHistory.getEngineeringHealth() (new today)
 *   3) Platform Health     — engine.getPlatformHealth()       (per platform)
 *
 * These are three distinct concepts: System = job-level status,
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
