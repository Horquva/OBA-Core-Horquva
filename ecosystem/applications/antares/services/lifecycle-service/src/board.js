'use strict';

const { loadOrCreate } = require('./persistence');

/**
 * board.js
 * --------
 * Day 2's "basic dashboard": answers three questions —
 *   1) What is currently running?
 *   2) What is blocked?
 *   3) What changed recently?
 *
 * This reads from saved state (store/state.json) — meaning you can run
 * it any time, even if the demo isn't currently running, and it will
 * show the last saved snapshot. This is the first, simplest version of
 * the real "operational dashboard" — Day 6 gives it a full
 * observability layer.
 *
 * Run: node src/board.js
 */

function line(char = '-', len = 60) {
  return char.repeat(len);
}

function printBoard(engine) {
  const jobs = [...engine.jobs.values()];
  const platforms = [...engine.platforms.values()];

  console.log(line('='));
  console.log('ANTARES ENGINEERING OPERATIONS — STATUS BOARD');
  console.log(line('='));
  console.log(`Platforms registered: ${platforms.length}   |   Jobs tracked: ${jobs.length}`);
  console.log('');

  // ---------- 1) What is currently running? ----------
  console.log('1) WHAT IS CURRENTLY RUNNING? (RUNNING / VALIDATING)');
  const running = jobs.filter((j) => j.status === 'RUNNING' || j.status === 'VALIDATING');
  if (running.length === 0) {
    console.log('   No job is active right now.');
  } else {
    for (const j of running) {
      const p = engine.platforms.get(j.platformId);
      console.log(`   [${j.status}] ${j.id} — ${j.task}  (${p ? p.owner : j.platformId})`);
    }
  }
  console.log('');

  // ---------- 2) What is blocked? ----------
  console.log('2) WHAT IS BLOCKED?');
  const blocked = jobs.filter((j) => j.status === 'BLOCKED');
  const failed = jobs.filter((j) => j.status === 'FAILED');
  if (blocked.length === 0 && failed.length === 0) {
    console.log('   Nothing is blocked or failed. \u2705');
  } else {
    for (const j of blocked) {
      const unmet = j.dependsOn.filter((depId) => {
        const dep = engine.jobs.get(depId);
        return !dep || !['PASSED', 'INTEGRATED', 'RELEASE_READY'].includes(dep.status);
      });
      console.log(`   [BLOCKED] ${j.id} — waiting on: ${unmet.join(', ') || 'unknown'}`);
    }
    for (const j of failed) {
      const reason = j.qualityGateResult
        ? j.qualityGateResult.checks.filter((c) => !c.passed).map((c) => c.name).join(', ')
        : 'unknown';
      console.log(`   [FAILED] ${j.id} — gate failed on: ${reason}`);
    }
  }
  console.log('');

  // ---------- 3) What changed recently? ----------
  console.log('3) WHAT CHANGED RECENTLY? (last 8 events)');
  const recent = engine.events.slice(-8).reverse();
  if (recent.length === 0) {
    console.log('   No events have happened yet.');
  } else {
    for (const e of recent) {
      console.log(`   [${e.at}] (${e.type}) ${e.message}`);
    }
  }
  console.log('');
  console.log(line('='));
}

if (require.main === module) {
  const engine = loadOrCreate();
  if (engine.platforms.size === 0) {
    console.log('No saved data found. Run "node src/demo.js" first,');
    console.log('then run "node src/board.js" to see the saved state.');
  } else {
    printBoard(engine);
  }
}

module.exports = { printBoard };
