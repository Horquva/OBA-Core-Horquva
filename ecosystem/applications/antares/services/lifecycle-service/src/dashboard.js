'use strict';

const { loadOrCreate } = require('./persistence');
const { getFullObservability } = require('./observability');

/**
 * dashboard.js
 * ------------
 * Day 6's "clean operational dashboard" — a text-based version of the
 * Antares UI screenshots (Overview, Live Signals, Evidence Integrity).
 * This same data structure (`getFullObservability`) could later feed a
 * real web UI — for now it runs in the terminal so it works instantly
 * without extra setup.
 *
 * Run: node src/dashboard.js
 */

function bar(pct, width = 20) {
  if (pct === null || pct === undefined) return '-'.repeat(width) + '  (no data)';
  const filled = Math.round((pct / 100) * width);
  return '#'.repeat(filled) + '-'.repeat(width - filled) + `  ${pct}%`;
}

function box(title) {
  console.log('\u2554' + '\u2550'.repeat(58) + '\u2557');
  const pad = 58 - title.length - 2;
  console.log('\u2551 ' + title + ' '.repeat(Math.max(pad, 0)) + '\u2551');
  console.log('\u255a' + '\u2550'.repeat(58) + '\u255d');
}

function printDashboard(engine) {
  const obs = getFullObservability(engine);
  const sh = obs.systemHealth;
  const eh = obs.engineeringHealth;

  box('ANTARES — ENGINEERING OPERATIONS OVERVIEW');

  console.log(`\nSYSTEM HEALTH        \u25cf ${sh.healthLabel}`);
  console.log(`PLATFORMS ${sh.totalPlatforms}   |   JOBS ${sh.totalJobs}   |   BLOCKED ${sh.blocked}   |   FAILED ${sh.failed}`);
  console.log(`INTEGRATED ${sh.integrated}   |   RELEASE READY ${sh.releaseReady}   |   GATE PASS RATE ${sh.gatePassRatePct}%`);

  console.log('\n--- ENGINEERING HEALTH (last ' + eh.runsTracked + ' CI runs) ---');
  if (eh.runsTracked === 0) {
    console.log('  No CI history found yet. Run "node scripts/ci.js" first.');
  } else {
    console.log(`  Lint    [${bar(eh.lintPassRate)}]`);
    console.log(`  Build   [${bar(eh.buildPassRate)}]`);
    console.log(`  Tests   [${bar(eh.testPassRate)}]`);
    console.log(`  Overall [${bar(eh.overallPassRate)}]`);
    console.log(`  Last CI run: ${eh.lastRunAt}`);
  }

  console.log('\n--- PLATFORM HEALTH (Evidence Integrity per owner) ---');
  const active = obs.platformHealth.filter((ph) => ph.totalJobs > 0);
  if (active.length === 0) {
    console.log('  No platform has any jobs yet.');
  } else {
    for (const ph of active) {
      const platform = engine.platforms.get(ph.platformId);
      const name = `${platform.name} (${platform.owner})`.padEnd(46);
      console.log(`  ${name} jobs:${ph.totalJobs}  blocked:${ph.byStatus.BLOCKED}  failed:${ph.byStatus.FAILED}  integrated:${ph.byStatus.INTEGRATED}`);
    }
  }

  console.log('\n--- ATTENTION ---');
  const attention = [];
  for (const j of engine.jobs.values()) {
    if (j.status === 'BLOCKED') attention.push(`Blocked: ${j.id} (${j.task})`);
    if (j.status === 'FAILED') attention.push(`Failed: ${j.id} (${j.task})`);
  }
  if (attention.length === 0) {
    console.log('  Nothing needs attention. \u2705');
  } else {
    attention.forEach((a) => console.log('  \u2192 ' + a));
  }

  console.log('\n--- RECENT EVENTS (Live Signals) ---');
  if (obs.recentEvents.length === 0) {
    console.log('  No events have happened yet.');
  } else {
    obs.recentEvents.slice(0, 8).forEach((e) => console.log(`  [${e.at}] (${e.type}) ${e.message}`));
  }

  console.log('\n' + '\u2550'.repeat(60));
}

if (require.main === module) {
  const engine = loadOrCreate();
  if (engine.platforms.size === 0) {
    console.log('No saved data found. Run "node src/demo.js" or "node src/cli.js" first to create some work.');
  } else {
    printDashboard(engine);
  }
}

module.exports = { printDashboard };
