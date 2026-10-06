// =============================================================================
// Horquva Continuity Platform — Ask OBA: answers computed from the graph (AI-01)
// =============================================================================
// Used when no AI model is configured, and as the fallback when the model call
// fails. Every sentence is computed from the graph — nothing is generated.
// Entities are cited as [[entity id]]; the assistant service turns those into
// chips. Unknown facts are said to be unknown (DATA-03). People are never
// ranked (SEC-07): we answer "what happens if X leaves", never "who is riskiest".
// =============================================================================

import type { ContinuityGraph } from '../domain/graph/index.js';
import { calculateHeadlineMetrics, evaluateAllChecks } from '../domain/checks/index.js';
import { SimulationEngine } from '../domain/simulation/index.js';

const cite = (id: string) => `[[${id}]]`;
const runs = (n: number | null) => (n === null ? 'unknown run volume' : `${n.toLocaleString('en-US')} runs/week`);

function critOf(graph: ContinuityGraph, id: string): string {
  const f = graph.getNode(id)?.facts.get('criticality');
  return f && f.grade !== 'unknown' && f.value ? String(f.value) : 'unknown';
}

function weeklyRuns(graph: ContinuityGraph, id: string): number | null {
  const v = graph.getNode(id)?.facts.get('run_volume_weekly')?.value;
  return typeof v === 'number' ? v : null;
}

/** Longest entity name (or person first name) that appears in the question. */
function findMentioned(graph: ContinuityGraph, q: string, want: (kind: string) => boolean) {
  const text = q.toLowerCase();
  let best: { id: string; kind: string; name: string; len: number } | null = null;
  for (const n of graph.getAllNodes()) {
    const e = n.entity;
    if (!want(e.kind)) continue;
    const names = [e.name.toLowerCase()];
    if (e.kind === 'person') names.push(e.name.split(' ')[0].toLowerCase());
    for (const name of names) {
      if (name.length >= 3 && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)) {
        if (!best || name.length > best.len) best = { id: e.id, kind: e.kind, name: e.name, len: name.length };
      }
    }
  }
  return best;
}

function personLeaves(graph: ContinuityGraph, personId: string): string {
  const r = new SimulationEngine(graph).simulateCombined({ departingPersonIds: [personId] });
  const lines = [`If ${cite(personId)} leaves:`];
  if (r.orphanedCriticalAssets.length === 0) {
    lines.push('- No critical asset is left without an owner or backup.');
  } else {
    lines.push(`- ${r.orphanedCriticalAssets.length} critical asset(s) are left with no owner or backup:`);
    for (const o of r.orphanedCriticalAssets) lines.push(`  - ${cite(o.asset.id)} (criticality ${o.criticality}, ${runs(weeklyRuns(graph, o.asset.id))})`);
  }
  if (r.stoppedAutomations.length > 0) {
    lines.push(`- ${r.stoppedAutomations.length} automation(s) run on their personal credentials and would stop:`);
    for (const s of r.stoppedAutomations) lines.push(`  - ${cite(s.workflow.id)} (${runs(s.weeklyRuns)})`);
  }
  if (r.downstream.length > 0) lines.push(`- Also affected downstream: ${r.downstream.map((d) => cite(d.id)).join(', ')}.`);
  lines.push(
    `- Weekly runs affected: ${r.runsPerWeekAffected.toLocaleString('en-US')}${r.runsUnknownCount > 0 ? ` plus ${r.runsUnknownCount} automation(s) with unknown volume` : ''}.`,
  );
  return lines.join('\n');
}

function entityFails(graph: ContinuityGraph, id: string): string {
  const dependants = graph.getDownstreamImpact(id);
  if (dependants.length === 0) return `Nothing on record depends on ${cite(id)}, so its failure stops nothing else.`;
  const lines = [`If ${cite(id)} fails or goes down, ${dependants.length} thing(s) that depend on it would stop:`];
  for (const d of dependants) lines.push(`- ${cite(d)} (${runs(weeklyRuns(graph, d))})`);
  return lines.join('\n');
}

function whoOwns(graph: ContinuityGraph, id: string): string {
  const owners = graph.getOwners(id);
  const backups = graph.getBackups(id);
  return [
    `${cite(id)}:`,
    `- Owner: ${owners.length ? owners.map((o) => cite(o.id)).join(', ') : 'unknown (no owner on record)'}`,
    `- Backup: ${backups.length ? backups.map((b) => cite(b.id)).join(', ') : 'none on record'}`,
    `- Criticality: ${critOf(graph, id)}`,
  ].join('\n');
}

function noBackup(graph: ContinuityGraph): string {
  const rows = graph
    .getAllNodes()
    .filter((n) => ['critical', 'high'].includes(critOf(graph, n.entity.id)) && graph.getBackups(n.entity.id).length === 0)
    .map((n) => `- ${cite(n.entity.id)} (criticality ${critOf(graph, n.entity.id)}, owner ${graph.getOwners(n.entity.id).map((o) => cite(o.id)).join(', ') || 'unknown'})`);
  const unknown = graph.getAllNodes().filter((n) => n.entity.kind !== 'person' && n.entity.kind !== 'group' && critOf(graph, n.entity.id) === 'unknown').length;
  const out = rows.length ? [`${rows.length} critical or high asset(s) have no backup on record:`, ...rows] : ['Every critical or high asset has at least one backup on record.'];
  if (unknown > 0) out.push(`- ${unknown} asset(s) have unknown criticality and aren't counted here.`);
  return out.join('\n');
}

function personalCredentials(graph: ContinuityGraph): string {
  const rows = graph
    .getAllEdges()
    .filter((e) => e.type === 'runs_on_credentials_of' && !e.validTo)
    .map((e) => `- ${cite(e.fromId)} runs on the personal credentials of ${cite(e.toId)} (${runs(weeklyRuns(graph, e.fromId))})`);
  return rows.length ? [`${rows.length} automation(s) run on someone's personal credentials:`, ...rows].join('\n') : 'No automation on record runs on personal credentials.';
}

function overview(graph: ContinuityGraph): string {
  const m = calculateHeadlineMetrics(graph);
  const failing = evaluateAllChecks(graph).filter((c) => c.status === 'FAIL');
  const lines = [
    `${m.fullyCoveredCriticalAssets} of ${m.totalCriticalAssets} critical assets are fully covered.`,
    `- Exposed (a known gap): ${m.exposedCriticalAssets}`,
    `- Unknown (something not yet confirmed): ${m.unknownCriticalAssets}`,
  ];
  if (failing.length) {
    lines.push(`Failing checks (${failing.length}):`);
    for (const c of failing) lines.push(`- ${cite(c.entityId)}: ${c.reason}`);
  }
  return lines.join('\n');
}

export function answerFromGraph(query: string, graph: ContinuityGraph): string {
  const q = query.toLowerCase();
  const notPerson = (k: string) => k !== 'person' && k !== 'group';

  if (/\b(leave|leaves|left|leaving|quit|quits|depart|departs|resign)\b/.test(q)) {
    const p = findMentioned(graph, q, (k) => k === 'person');
    if (p) return personLeaves(graph, p.id);
    return "I couldn't find that person in the directory. Try their full name as it appears on the People page.";
  }
  if (/\b(fail|fails|failing|down|outage|break|breaks|blast)\b/.test(q)) {
    const e = findMentioned(graph, q, notPerson);
    if (e) return entityFails(graph, e.id);
  }
  if (/\b(own|owns|owner|owned|responsible|backup for|who backs)\b/.test(q)) {
    const e = findMentioned(graph, q, notPerson);
    if (e) return whoOwns(graph, e.id);
  }
  if (/\bbackups?\b|backed up|unbacked/.test(q)) return noBackup(graph);
  if (/personal credential|personal token|credentials? of/.test(q)) return personalCredentials(graph);
  return overview(graph);
}
