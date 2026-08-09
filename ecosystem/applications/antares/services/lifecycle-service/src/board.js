'use strict';

const { loadOrCreate } = require('./persistence');

/**
 * board.js
 * --------
 * Din 2 ka "basic dashboard": teen sawalon ka jawab deta hai —
 *   1) Kya chal raha hai?
 *   2) Kya block hai?
 *   3) Kya change hua (recently)?
 *
 * Ye saved state (store/state.json) se padhta hai — matlab kabhi bhi
 * chalao, chahe demo abhi na chal raha ho, tumhe pichla saved snapshot
 * dikhega. Ye asal "operational dashboard" ka pehla, sabse simple
 * version hai — Din 6 mein isay poora observability layer mil jayega.
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

  // ---------- 1) Kya chal raha hai? ----------
  console.log('1) KYA CHAL RAHA HAI? (RUNNING / VALIDATING)');
  const running = jobs.filter((j) => j.status === 'RUNNING' || j.status === 'VALIDATING');
  if (running.length === 0) {
    console.log('   Abhi koi job active nahi hai.');
  } else {
    for (const j of running) {
      const p = engine.platforms.get(j.platformId);
      console.log(`   [${j.status}] ${j.id} — ${j.task}  (${p ? p.owner : j.platformId})`);
    }
  }
  console.log('');

  // ---------- 2) Kya block hai? ----------
  console.log('2) KYA BLOCK HAI?');
  const blocked = jobs.filter((j) => j.status === 'BLOCKED');
  const failed = jobs.filter((j) => j.status === 'FAILED');
  if (blocked.length === 0 && failed.length === 0) {
    console.log('   Kuch bhi blocked ya failed nahi hai. \u2705');
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

  // ---------- 3) Kya change hua? ----------
  console.log('3) KYA RECENT CHANGE HUA? (last 8 events)');
  const recent = engine.events.slice(-8).reverse();
  if (recent.length === 0) {
    console.log('   Abhi tak koi event nahi hua.');
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
    console.log('Koi saved data nahi mila. Pehle "node src/demo.js" chalao,');
    console.log('phir "node src/board.js" chalao taake saved state dikhe.');
  } else {
    printBoard(engine);
  }
}

module.exports = { printBoard };
