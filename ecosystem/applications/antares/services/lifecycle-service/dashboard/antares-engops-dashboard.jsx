import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, GitBranch, Send,
  PlayCircle, RotateCcw, Radio, ShieldCheck, XCircle, ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// ANTARES ENGINEERING OPERATIONS — LIVE DASHBOARD
// Owner: Kamil Ejaz
//
// Same status flow / quality-gate rules as the Node.js engine
// (src/engine.js + src/qualityGates.js). This file re-implements that
// logic in the browser so the dashboard is genuinely interactive, not a
// static mockup.
// ---------------------------------------------------------------------------

const PLATFORMS = [
  { id: 'tech-intel', name: 'Technology Intelligence', owner: 'Aurangzeb Malik' },
  { id: 'org-futures', name: 'Organizational Futures', owner: 'Muhammad Muzammel Aslam' },
  { id: 'future-signal', name: 'Future-Signal Intelligence', owner: 'Syed Hadeed Safdar' },
  { id: 'future-org', name: 'Future Organization (AI Agents)', owner: 'Zeeshan Farooq' },
  { id: 'aiml-intel', name: 'AI/ML Intelligence', owner: 'Muhammad Hasnain Ajmal' },
  { id: 'trust-gov', name: 'Trust & Governance', owner: 'Kanwal Raveen' },
  { id: 'cap-validation', name: 'Capability Validation', owner: 'Zara Fatima' },
  { id: 'enterprise-validation', name: 'Enterprise Validation', owner: 'Ammara Nasir' },
  { id: 'knowledge-ops', name: 'Knowledge Operationalization', owner: 'Laiba Mahboob' },
  { id: 'cap-ops', name: 'Capability Operationalization', owner: 'Abbas Raza' },
  { id: 'eng-ops', name: 'Engineering Operations', owner: 'Kamil Ejaz' },
];

const STATUS_META = {
  QUEUED: { label: 'Queued', color: 'gray' },
  BLOCKED: { label: 'Blocked', color: 'red' },
  RUNNING: { label: 'Running', color: 'blue' },
  VALIDATING: { label: 'Validating', color: 'amber' },
  FAILED: { label: 'Failed', color: 'red' },
  PASSED: { label: 'Passed', color: 'teal' },
  INTEGRATED: { label: 'Integrated', color: 'purple' },
  RELEASE_READY: { label: 'Release ready', color: 'green' },
};

const COLOR_CLASSES = {
  gray: 'bg-slate-100 text-slate-600 border-slate-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  purple: 'bg-violet-50 text-violet-700 border-violet-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

// -------------------- deterministic quality-gate check --------------------
const FORBIDDEN = [/todo/i, /mock/i, /hard[- ]?coded/i, /placeholder/i, /\bfake\b/i, /lorem ipsum/i];

function runQualityGates(job, artifact, depStatuses) {
  const checks = [];
  const unmet = depStatuses.filter((d) => !d.satisfied);
  checks.push({
    name: 'dependency-integrity',
    passed: unmet.length === 0,
    message: unmet.length === 0 ? 'all dependencies satisfied' : `unmet: ${unmet.map((d) => d.jobId).join(', ')}`,
  });
  const missing = ['summary', 'output'].filter((f) => !artifact || !artifact[f]);
  checks.push({
    name: 'required-fields',
    passed: missing.length === 0,
    message: missing.length === 0 ? 'summary + output present' : `missing: ${missing.join(', ')}`,
  });
  const hay = JSON.stringify(artifact || {});
  const hit = FORBIDDEN.find((re) => re.test(hay));
  checks.push({ name: 'no-mock-markers', passed: !hit, message: hit ? `forbidden marker matched ${hit}` : 'clean' });
  const evCount = (job.evidence || []).length;
  checks.push({ name: 'evidence-attached', passed: evCount > 0, message: evCount > 0 ? `${evCount} evidence ref(s)` : 'no evidence attached' });
  const passed = checks.every((c) => c.passed);
  return { passed, checks };
}

// -------------------- scripted end-to-end scenario --------------------
// Mirrors src/demo.js exactly: a real capability moving through the whole
// Antares chain, with one deliberate FAILED->retry and one deliberate
// BLOCKED->auto-unblock, so the dashboard proves the engine genuinely
// enforces its own rules instead of fake-passing everything.
function buildScript() {
  const steps = [];
  const add = (fn) => steps.push(fn);

  add((s) => s.createJob('J-TECH-01', 'tech-intel', 'Detect emerging pattern: governance tooling maturity'));
  add((s) => s.start('J-TECH-01'));
  add((s) => s.evidence('J-TECH-01', 'source:governance-radar-2026'));
  add((s) => s.submit('J-TECH-01', { summary: 'On-chain governance tooling reached early-majority adoption', output: { maturity: 'developing' } }));

  add((s) => s.createJob('J-SIGNAL-01', 'future-signal', 'Correlate signal with organizational impact', ['J-TECH-01']));
  add((s) => s.start('J-SIGNAL-01'));
  add((s) => s.evidence('J-SIGNAL-01', 'ref:J-TECH-01'));
  add((s) => s.submit('J-SIGNAL-01', { summary: 'Correlated with adaptive-governance pattern', output: { pattern: 'adaptive-governance' } }));

  add((s) => s.createJob('J-ORGFUT-01', 'org-futures', 'Model future organization: adaptive-governance', ['J-SIGNAL-01']));
  add((s) => s.start('J-ORGFUT-01'));
  add((s) => s.evidence('J-ORGFUT-01', 'ref:J-SIGNAL-01'));
  add((s) => s.submit('J-ORGFUT-01', { summary: 'Future org model drafted', output: { model: 'Adaptive-Governance Enterprise' } }));

  add((s) => s.createJob('J-TRUST-01', 'trust-gov', 'Governance evaluation of the model', ['J-ORGFUT-01']));
  add((s) => s.start('J-TRUST-01'));
  add((s) => s.evidence('J-TRUST-01', 'ref:J-ORGFUT-01'));
  add((s) => s.submit('J-TRUST-01', { summary: 'Constitutional check: no conflicts', output: { decision: 'ALLOW' } }));

  add((s) => s.createJob('J-VALID-01', 'cap-validation', 'Validate candidate capability', ['J-ORGFUT-01', 'J-TRUST-01']));
  add((s) => s.start('J-VALID-01'));
  add((s) => s.submit('J-VALID-01', { summary: 'Capability looks strong', output: { rec: 'VALIDATE' } }, 'no evidence attached on purpose \u2014 watch the gate reject it'));

  add((s) => s.createJob('J-FUTUREORG-01', 'future-org', 'Instantiate executable org runtime', ['J-VALID-01']));
  add((s) => s.note('J-FUTUREORG-01 depends on J-VALID-01, which just FAILED \u2192 it is created BLOCKED'));

  add((s) => s.retry('J-VALID-01'));
  add((s) => s.start('J-VALID-01'));
  add((s) => s.evidence('J-VALID-01', 'ref:J-ORGFUT-01'));
  add((s) => s.evidence('J-VALID-01', 'ref:J-TRUST-01'));
  add((s) => s.submit('J-VALID-01', { summary: 'Validated: Org Value=High, Evidence=Strong, Constitutional=Pass', output: { rec: 'VALIDATE' } }));
  add((s) => s.integrate('J-VALID-01'));
  add((s) => s.note('J-VALID-01 integrated \u2192 J-FUTUREORG-01 auto-unblocks'));

  add((s) => s.createJob('J-ENTVAL-01', 'enterprise-validation', 'AI/ML evidence scoring', ['J-VALID-01']));
  add((s) => s.start('J-ENTVAL-01'));
  add((s) => s.evidence('J-ENTVAL-01', 'ref:J-VALID-01'));
  add((s) => s.submit('J-ENTVAL-01', { summary: 'Confidence-scored via evidence model', output: { confidence: 0.86 } }));
  add((s) => s.integrate('J-ENTVAL-01'));

  add((s) => s.createJob('J-KNOW-01', 'knowledge-ops', 'Persist as structured knowledge object', ['J-ENTVAL-01']));
  add((s) => s.start('J-KNOW-01'));
  add((s) => s.evidence('J-KNOW-01', 'ref:J-ENTVAL-01'));
  add((s) => s.submit('J-KNOW-01', { summary: 'Knowledge object persisted with provenance', output: { id: 'KO-01' } }));
  add((s) => s.integrate('J-KNOW-01'));

  add((s) => s.createJob('J-CAPOPS-01', 'cap-ops', 'Package as operational artifact', ['J-KNOW-01']));
  add((s) => s.start('J-CAPOPS-01'));
  add((s) => s.evidence('J-CAPOPS-01', 'ref:J-KNOW-01'));
  add((s) => s.submit('J-CAPOPS-01', { summary: 'Operational package generated', output: { pkg: 'PKG-01' } }));
  add((s) => s.integrate('J-CAPOPS-01'));
  add((s) => s.release('J-CAPOPS-01'));

  add((s) => s.start('J-FUTUREORG-01'));
  add((s) => s.evidence('J-FUTUREORG-01', 'ref:J-CAPOPS-01'));
  add((s) => s.submit('J-FUTUREORG-01', { summary: 'Org runtime instantiated in sandbox', output: { runtime: 'RT-01' } }));
  add((s) => s.integrate('J-FUTUREORG-01'));

  return steps;
}

const SATISFYING = new Set(['PASSED', 'INTEGRATED', 'RELEASE_READY']);

function makeInitialState() {
  return { jobs: {}, order: [], events: [] };
}

export default function AntaresEngOpsDashboard() {
  const [state, setState] = useState(makeInitialState());
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const script = useMemo(buildScript, []);
  const timerRef = useRef(null);

  const emit = (draft, type, jobId, message) => {
    draft.events.push({ type, jobId, message, at: new Date().toLocaleTimeString() });
  };

  const depStatuses = (draft, job) =>
    job.dependsOn.map((depId) => {
      const dep = draft.jobs[depId];
      return { jobId: depId, satisfied: !!dep && SATISFYING.has(dep.status) };
    });

  const recomputeBlocked = (draft, jobId) => {
    const job = draft.jobs[jobId];
    if (!['QUEUED', 'BLOCKED'].includes(job.status)) return;
    const deps = depStatuses(draft, job);
    const blocked = deps.some((d) => !d.satisfied);
    const target = blocked ? 'BLOCKED' : 'QUEUED';
    if (job.status !== target) {
      job.status = target;
      emit(draft, 'STATUS_CHANGE', jobId, `\u2192 ${target}`);
    }
  };

  // step "actions" — a tiny in-browser port of the Node engine
  const actions = {
    createJob: (draft, id, platformId, task, dependsOn = []) => {
      draft.jobs[id] = { id, platformId, task, dependsOn, status: 'QUEUED', evidence: [], artifact: null, gate: null };
      draft.order.push(id);
      emit(draft, 'JOB_CREATED', id, task);
      recomputeBlocked(draft, id);
    },
    start: (draft, id) => {
      recomputeBlocked(draft, id);
      const job = draft.jobs[id];
      if (job.status === 'QUEUED') {
        job.status = 'RUNNING';
        emit(draft, 'STATUS_CHANGE', id, '\u2192 RUNNING');
      }
    },
    evidence: (draft, id, ref) => {
      draft.jobs[id].evidence.push(ref);
      emit(draft, 'EVIDENCE_ATTACHED', id, ref);
    },
    submit: (draft, id, artifact, extraNote) => {
      const job = draft.jobs[id];
      job.status = 'VALIDATING';
      job.artifact = artifact;
      const gate = runQualityGates(job, artifact, depStatuses(draft, job));
      job.gate = gate;
      if (gate.passed) {
        job.status = 'PASSED';
        emit(draft, 'STATUS_CHANGE', id, '\u2192 PASSED (all gates ok)');
      } else {
        job.status = 'FAILED';
        const failedNames = gate.checks.filter((c) => !c.passed).map((c) => c.name).join(', ');
        emit(draft, 'GATE_FAILED', id, `${failedNames}${extraNote ? ' \u2014 ' + extraNote : ''}`);
      }
    },
    retry: (draft, id) => {
      draft.jobs[id].status = 'QUEUED';
      emit(draft, 'STATUS_CHANGE', id, '\u2192 QUEUED (retry)');
      recomputeBlocked(draft, id);
    },
    integrate: (draft, id) => {
      draft.jobs[id].status = 'INTEGRATED';
      emit(draft, 'INTEGRATION', id, 'consumed downstream');
      for (const other of draft.order) {
        if (draft.jobs[other].dependsOn.includes(id)) recomputeBlocked(draft, other);
      }
    },
    release: (draft, id) => {
      draft.jobs[id].status = 'RELEASE_READY';
      emit(draft, 'STATUS_CHANGE', id, '\u2192 RELEASE_READY');
    },
    note: (draft, text) => emit(draft, 'NOTE', null, text),
  };

  const applyStep = (idx) => {
    setState((prev) => {
      const draft = { jobs: { ...prev.jobs }, order: [...prev.order], events: [...prev.events] };
      // deep-clone job objects we might mutate
      for (const k of Object.keys(draft.jobs)) {
        draft.jobs[k] = { ...draft.jobs[k], evidence: [...draft.jobs[k].evidence], dependsOn: [...draft.jobs[k].dependsOn] };
      }
      const stepFn = script[idx];
      const proxy = {
        createJob: (...args) => actions.createJob(draft, ...args),
        start: (...args) => actions.start(draft, ...args),
        evidence: (...args) => actions.evidence(draft, ...args),
        submit: (...args) => actions.submit(draft, ...args),
        retry: (...args) => actions.retry(draft, ...args),
        integrate: (...args) => actions.integrate(draft, ...args),
        release: (...args) => actions.release(draft, ...args),
        note: (...args) => actions.note(draft, ...args),
      };
      stepFn(proxy);
      return draft;
    });
  };

  const stepForward = () => {
    if (stepIndex >= script.length) return;
    applyStep(stepIndex);
    setStepIndex((i) => i + 1);
  };

  const reset = () => {
    clearTimeout(timerRef.current);
    setPlaying(false);
    setState(makeInitialState());
    setStepIndex(0);
    setAnswer('');
    setSelectedJob(null);
  };

  useEffect(() => {
    if (!playing) return;
    if (stepIndex >= script.length) { setPlaying(false); return; }
    timerRef.current = setTimeout(() => stepForward(), 550);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, stepIndex]);

  const jobs = state.order.map((id) => state.jobs[id]);
  const byStatus = jobs.reduce((acc, j) => { acc[j.status] = (acc[j.status] || 0) + 1; return acc; }, {});
  const evaluated = jobs.filter((j) => j.gate);
  const gatePassRate = evaluated.length ? Math.round((evaluated.filter((j) => j.gate.passed).length / evaluated.length) * 100) : 100;
  const blockedCount = byStatus.BLOCKED || 0;
  const failedCount = byStatus.FAILED || 0;
  const healthy = blockedCount === 0 && failedCount === 0;

  // ------------- rule-based AI assistant (mirrors engine.askAssistant) -------------
  const askAssistant = (q) => {
    const query = q.toLowerCase();
    if (query.includes('block')) {
      const blocked = jobs.filter((j) => j.status === 'BLOCKED');
      if (blocked.length === 0) return 'Koi platform/job is waqt blocked nahi hai.';
      return blocked
        .map((j) => {
          const deps = depStatuses(state, j).filter((d) => !d.satisfied);
          return `${j.id} (${j.task}) is BLOCKED because: ${deps.map((d) => `${d.jobId} [${state.jobs[d.jobId]?.status}]`).join(', ')}`;
        })
        .join('\n');
    }
    if (query.includes('fail')) {
      const failed = jobs.filter((j) => j.status === 'FAILED');
      if (failed.length === 0) return 'Koi job is waqt failed state mein nahi hai.';
      return failed
        .map((j) => `${j.id} (${j.task}) failed on: ${j.gate.checks.filter((c) => !c.passed).map((c) => `${c.name} \u2014 ${c.message}`).join('; ')}`)
        .join('\n');
    }
    if (query.includes('health') || query.includes('status')) {
      return `System health: ${healthy ? 'HEALTHY' : 'ATTENTION_NEEDED'}. ${jobs.length} jobs total \u2014 ${blockedCount} blocked, ${failedCount} failed, ${byStatus.INTEGRATED || 0} integrated, ${byStatus.RELEASE_READY || 0} release-ready. Gate pass rate: ${gatePassRate}%.`;
    }
    if (query.includes('recent') || query.includes('event') || query.includes('change')) {
      return state.events.slice(-5).reverse().map((e) => `[${e.type}] ${e.message}`).join('\n') || 'Abhi koi event nahi hua.';
    }
    return "Samajh nahi aaya \u2014 poochho: 'kya blocked hai', 'kya failed hai', 'system health kya hai', ya 'recent changes kya hain'.";
  };

  const handleAsk = (q) => {
    const query = q ?? question;
    if (!query.trim()) return;
    setAnswer(askAssistant(query));
  };

  const quickQuestions = ['Kya kuch blocked hai?', 'Kya kuch failed hai?', 'System health kya hai?', 'Recent changes kya hain?'];

  return (
    <div className="w-full min-h-screen bg-slate-50 flex text-sm">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="w-7 h-7 rounded bg-violet-500 flex items-center justify-center text-white font-bold text-xs">A</div>
          <div>
            <div className="text-white font-semibold tracking-wide text-sm">ANTARES</div>
            <div className="text-[10px] text-slate-400">Engineering Operations</div>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 px-2 mt-2 mb-1">Platforms</div>
        {PLATFORMS.map((p) => {
          const pJobs = jobs.filter((j) => j.platformId === p.id);
          const hasIssue = pJobs.some((j) => j.status === 'BLOCKED' || j.status === 'FAILED');
          const active = pJobs.length > 0;
          return (
            <div key={p.id} className={`px-2 py-1.5 rounded flex items-center justify-between gap-2 ${active ? 'text-white' : 'text-slate-500'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasIssue ? 'bg-red-400' : active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <span className="truncate text-xs">{p.name}</span>
              </div>
              {pJobs.length > 0 && <span className="text-[10px] text-slate-500 flex-shrink-0">{pJobs.length}</span>}
            </div>
          );
        })}
      </div>

      {/* Main */}
      <div className="flex-1 p-6 flex flex-col gap-5 max-w-6xl">
        {/* Header + controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Live capability run: Adaptive-Governance Enterprise</h1>
            <p className="text-xs text-slate-500 mt-0.5">Step {Math.min(stepIndex, script.length)} / {script.length} \u2014 same scenario as src/demo.js</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              disabled={stepIndex >= script.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-600 text-white text-xs font-medium disabled:opacity-40 hover:bg-violet-700"
            >
              <PlayCircle size={14} /> {playing ? 'Pause' : 'Run demo'}
            </button>
            <button
              onClick={stepForward}
              disabled={stepIndex >= script.length || playing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 text-xs font-medium disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronRight size={14} /> Step
            </button>
            <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100">
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* Health cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <HealthCard icon={<Activity size={16} />} label="System health" value={healthy ? 'Healthy' : 'Attention'} tone={healthy ? 'green' : 'red'} />
          <HealthCard icon={<GitBranch size={16} />} label="Total jobs" value={jobs.length} tone="gray" />
          <HealthCard icon={<AlertTriangle size={16} />} label="Blocked" value={blockedCount} tone={blockedCount ? 'red' : 'gray'} />
          <HealthCard icon={<XCircle size={16} />} label="Failed" value={failedCount} tone={failedCount ? 'red' : 'gray'} />
          <HealthCard icon={<ShieldCheck size={16} />} label="Gate pass rate" value={`${gatePassRate}%`} tone="teal" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Job pipeline */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Job pipeline</h2>
            {jobs.length === 0 && <p className="text-xs text-slate-400">Click "Run demo" to start the live capability flow.</p>}
            <div className="flex flex-col gap-2">
              {jobs.map((j) => {
                const meta = STATUS_META[j.status];
                const platform = PLATFORMS.find((p) => p.id === j.platformId);
                return (
                  <button
                    key={j.id}
                    onClick={() => setSelectedJob(j.id === selectedJob ? null : j.id)}
                    className={`text-left border rounded-md px-3 py-2 flex items-center justify-between gap-3 hover:border-slate-300 ${selectedJob === j.id ? 'ring-1 ring-violet-400' : 'border-slate-200'}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">{j.id}</span>
                        <span className="text-xs font-medium text-slate-800 truncate">{j.task}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{platform?.name} \u2014 {platform?.owner}</div>
                    </div>
                    <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded border ${COLOR_CLASSES[meta.color]}`}>{meta.label}</span>
                  </button>
                );
              })}
            </div>

            {selectedJob && state.jobs[selectedJob]?.gate && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">Quality gate result \u2014 {selectedJob}</div>
                <div className="flex flex-col gap-1">
                  {state.jobs[selectedJob].gate.checks.map((c) => (
                    <div key={c.name} className="flex items-start gap-2 text-[11px]">
                      {c.passed ? <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" /> : <XCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />}
                      <span className="text-slate-600"><span className="font-medium text-slate-800">{c.name}:</span> {c.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Events + AI assistant */}
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5"><Radio size={14} /> Recent events</h2>
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                {state.events.length === 0 && <p className="text-xs text-slate-400">No events yet.</p>}
                {[...state.events].reverse().slice(0, 12).map((e, i) => (
                  <div key={i} className="text-[11px] text-slate-600 border-b border-slate-50 pb-1.5 last:border-0">
                    <span className="text-slate-400">{e.at}</span> <span className="font-medium text-slate-700">[{e.type}]</span> {e.jobId ? <span className="font-mono text-slate-500">{e.jobId}</span> : null} {e.message}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">AI engineering ops assistant</h2>
              <p className="text-[11px] text-slate-400 mb-3">Rule-based \u2014 sirf real state se jawab deta hai, kabhi bana kar nahi batata.</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {quickQuestions.map((q) => (
                  <button key={q} onClick={() => { setQuestion(q); handleAsk(q); }} className="text-[11px] px-2 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  placeholder="Apna sawal likho..."
                  className="flex-1 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
                <button onClick={() => handleAsk()} className="px-2.5 py-1.5 rounded-md bg-slate-900 text-white"><Send size={13} /></button>
              </div>
              {answer && (
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-md p-2.5 text-[11px] text-slate-700 whitespace-pre-line">
                  {answer}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthCard({ icon, label, value, tone }) {
  const toneClasses = {
    green: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50',
    gray: 'text-slate-600 bg-slate-100',
    teal: 'text-teal-600 bg-teal-50',
  };
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center mb-2 ${toneClasses[tone]}`}>{icon}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-base font-semibold text-slate-800">{value}</div>
    </div>
  );
}
