'use strict';

const { loadOrCreate, saveState } = require('./persistence');
const { printBoard } = require('./board');
const { checkAllContracts } = require('./contracts');

/**
 * cli.js
 * ------
 * Day 3-4's "Engineering API / Service Interface": this is the place
 * where any team member — without writing any JS — can use Kamil's
 * Engineering Operations Platform live. Every command loads state from
 * disk, performs one action, then saves it back — that's what makes
 * this "live orchestration" instead of a one-shot demo.
 *
 * Usage:
 *   node src/cli.js register-platform <id> <name> <owner>
 *   node src/cli.js create-job <id> <platformId> <task> [dep1,dep2,...]
 *   node src/cli.js start <jobId> [triggeredBy]
 *   node src/cli.js evidence <jobId> <ref>
 *   node src/cli.js submit <jobId> <summary>
 *   node src/cli.js retry <jobId>
 *   node src/cli.js integrate <jobId>
 *   node src/cli.js release <jobId>
 *   node src/cli.js history <jobId>
 *   node src/cli.js board
 *   node src/cli.js ask "<question>"
 */

function handleCommand(argv, engine) {
  const [cmd, ...args] = argv;

  switch (cmd) {
    case 'register-platform': {
      const [id, name, owner] = args;
      if (!id || !name || !owner) return { ok: false, message: 'Usage: register-platform <id> <name> <owner>' };
      engine.registerPlatform({ id, name, owner });
      return { ok: true, message: `Platform registered: ${name} (${owner})` };
    }
    case 'create-job': {
      const [id, platformId, task, depsRaw] = args;
      if (!id || !platformId || !task) return { ok: false, message: 'Usage: create-job <id> <platformId> <task> [dep1,dep2]' };
      const dependsOn = depsRaw ? depsRaw.split(',').filter(Boolean) : [];
      const job = engine.createJob({ id, platformId, task, dependsOn });
      return { ok: true, message: `Job created: ${job.id} -> ${job.status}` };
    }
    case 'start': {
      const [jobId, triggeredBy] = args;
      if (!jobId) return { ok: false, message: 'Usage: start <jobId> [triggeredBy]' };
      const job = engine.start(jobId, triggeredBy || 'cli-user');
      return { ok: true, message: `${job.id} -> ${job.status}` };
    }
    case 'evidence': {
      const [jobId, ref] = args;
      if (!jobId || !ref) return { ok: false, message: 'Usage: evidence <jobId> <ref>' };
      engine.attachEvidence(jobId, ref);
      return { ok: true, message: `Evidence attached to ${jobId}: ${ref}` };
    }
    case 'submit': {
      const [jobId, ...summaryParts] = args;
      const summary = summaryParts.join(' ');
      if (!jobId || !summary) return { ok: false, message: 'Usage: submit <jobId> <summary text>' };
      const job = engine.submitForValidation(jobId, { summary, output: { note: summary } });
      return { ok: true, message: `${job.id} -> ${job.status}` };
    }
    case 'retry': {
      const [jobId] = args;
      if (!jobId) return { ok: false, message: 'Usage: retry <jobId>' };
      const job = engine.retry(jobId);
      return { ok: true, message: `${job.id} -> ${job.status}` };
    }
    case 'integrate': {
      const [jobId] = args;
      if (!jobId) return { ok: false, message: 'Usage: integrate <jobId>' };
      const job = engine.integrate(jobId);
      return { ok: true, message: `${job.id} -> ${job.status}` };
    }
    case 'release': {
      const [jobId] = args;
      if (!jobId) return { ok: false, message: 'Usage: release <jobId>' };
      const job = engine.releaseReady(jobId);
      return { ok: true, message: `${job.id} -> ${job.status}` };
    }
    case 'history': {
      const [jobId] = args;
      if (!jobId) return { ok: false, message: 'Usage: history <jobId>' };
      const history = engine.getExecutionHistory(jobId);
      if (history.length === 0) return { ok: true, message: `${jobId} has no executions yet.` };
      const lines = history.map(
        (e) => `  ${e.id} | triggered by ${e.triggeredBy} | started ${e.startedAt} | ${e.endedAt ? `ended ${e.endedAt} | result ${e.result}` : 'still running'}`
      );
      return { ok: true, message: `Execution history for ${jobId}:\n${lines.join('\n')}` };
    }
    case 'board': {
      printBoard(engine);
      return { ok: true, silent: true };
    }
    case 'contracts': {
      const result = checkAllContracts(engine);
      if (result.valid) return { ok: true, message: 'All platform-to-platform contracts are valid \u2705' };
      return { ok: false, message: 'Contract violations found:\n' + result.violations.map((v) => '  - ' + v).join('\n') };
    }
    case 'ask': {
      const question = args.join(' ');
      return { ok: true, message: engine.askAssistant(question) };
    }
    default:
      return {
        ok: false,
        message:
          'Unknown command. Available: register-platform, create-job, start, evidence, submit, retry, integrate, release, history, board, ask',
      };
  }
}

if (require.main === module) {
  const engine = loadOrCreate();
  const result = handleCommand(process.argv.slice(2), engine);
  if (!result.silent) {
    console.log(result.ok ? result.message : `ERROR: ${result.message}`);
  }
  if (result.ok) saveState(engine);
  process.exitCode = result.ok ? 0 : 1;
}

module.exports = { handleCommand };
