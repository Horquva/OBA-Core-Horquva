/**
 * COMMAND INDEX — the destination catalog behind the executive command bar.
 *
 * Three kinds of destination, all resolvable from one text box:
 *   page    — a route in the workspace                       ("/risk")
 *   section — a named block inside a route                   ("/risk" -> "Critical Risk Agents")
 *   module  — a constitutional module M01–M55, mapped to the page that renders it
 *
 * Live entities (people, agents, workflows, tools) come from `lib/search.ts`
 * and are merged in at query time — they are data, not a static catalog.
 *
 * `match` is the on-screen heading text the focus engine scrolls to. It is only
 * set where the heading was verified to exist in the component tree; where a
 * page has no stable heading the target simply lands at the top of the page.
 */

export type CommandKind = 'page' | 'section' | 'module' | 'entity';

export interface CommandTarget {
  id: string;
  label: string;
  kind: CommandKind;
  /** Route this target lives on. */
  page: string;
  /** Heading text to scroll to and highlight once the route has rendered. */
  match?: string;
  /** Page label, shown as the breadcrumb on section/module results. */
  parent?: string;
  /** Extra search terms that should hit this target. */
  keywords?: string[];
  /** Roles allowed to see it — mirrors the sidebar's gating. Undefined = everyone. */
  roles?: string[];
  /** Constitutional module code, when this target is a module. */
  code?: string;
  /** One-line description shown under the label. */
  hint?: string;
}

const EXEC = ['admin', 'ceo', 'cto', 'coo'];
const MANAGER_UP = [...EXEC, 'manager'];
const ADMIN = ['admin', 'ceo', 'cto'];

// ─────────────────────────────────────────────────────────────
// PAGES — mirrors Sidebar.tsx navigation, plus the routes it omits
// ─────────────────────────────────────────────────────────────

export const PAGES: CommandTarget[] = [
  { id: 'p-dashboard', label: 'Dashboard', kind: 'page', page: '/', hint: 'What matters right now', keywords: ['home', 'overview', 'briefing', 'kpi', 'executive'] },
  { id: 'p-ownership', label: 'Ownership Intelligence', kind: 'page', page: '/ownership', hint: 'Who owns what', keywords: ['owner', 'who owns', 'accountable', 'registry', 'people'] },
  { id: 'p-risk', label: 'Risk Intelligence', kind: 'page', page: '/risk', hint: 'What is risky', roles: MANAGER_UP, keywords: ['risk', 'critical', 'vulnerable', 'exposure', 'health'] },
  { id: 'p-map', label: 'Dependency Map', kind: 'page', page: '/map', hint: 'What depends on what', keywords: ['dependency', 'graph', 'blast radius', 'spof', 'chain'] },
  { id: 'p-simulation', label: 'What-If Simulation', kind: 'page', page: '/simulation', hint: 'What happens if something breaks', roles: EXEC, keywords: ['simulate', 'scenario', 'what if', 'twin', 'sandbox'] },
  { id: 'p-recommendations', label: 'Recommendations', kind: 'page', page: '/recommendations', hint: 'What should be done next', roles: MANAGER_UP, keywords: ['advice', 'actions', 'next steps', 'advisor', 'opportunity'] },
  { id: 'p-ai-tools', label: 'AI Tool Intelligence', kind: 'page', page: '/ai-tools', hint: 'Which tools exist and how they are governed', keywords: ['tools', 'vendor', 'saas', 'spend', 'license'] },
  { id: 'p-knowledge', label: 'Knowledge Risk', kind: 'page', page: '/knowledge', hint: 'Where critical knowledge is concentrated', keywords: ['knowledge', 'documentation', 'undocumented', 'tribal', 'bus factor'] },
  { id: 'p-memory', label: 'Org Memory', kind: 'page', page: '/memory', hint: 'What the organization remembers', roles: MANAGER_UP, keywords: ['history', 'past', 'memory', 'what happened', 'timeline'] },
  { id: 'p-decision', label: 'Decision Intelligence', kind: 'page', page: '/decision', hint: 'How decisions are made and with what quality', roles: EXEC, keywords: ['decision', 'approve', 'quality', 'trail', 'truth gate'] },
  { id: 'p-continuity', label: 'Continuity & Governance', kind: 'page', page: '/continuity', hint: 'Can the organization survive disruption', roles: MANAGER_UP, keywords: ['continuity', 'governance', 'compliance', 'resilience', 'disruption'] },
  { id: 'p-workflows', label: 'Workflows', kind: 'page', page: '/workflows', hint: 'How work actually flows', keywords: ['workflow', 'process', 'steps', 'runbook', 'collision'] },
  { id: 'p-forecast', label: 'Forecast', kind: 'page', page: '/forecast', hint: 'What the organization will look like ahead', roles: MANAGER_UP, keywords: ['forecast', 'outlook', 'trend', 'trajectory', 'predict'] },
  { id: 'p-org-science', label: 'Org Science', kind: 'page', page: '/org-science', hint: 'DNA, culture, maturity, benchmarks', roles: EXEC, keywords: ['culture', 'dna', 'maturity', 'benchmark', 'behavior'] },
  { id: 'p-network', label: 'Network Intelligence', kind: 'page', page: '/network', hint: 'Central actors and information pathways', keywords: ['network', 'centrality', 'connected', 'bottleneck', 'isolated'] },
  { id: 'p-notifications', label: 'Notifications', kind: 'page', page: '/notifications', hint: 'Signals raised for your attention', keywords: ['alerts', 'signals', 'inbox'] },
  { id: 'p-admin', label: 'Admin', kind: 'page', page: '/admin', hint: 'Endpoint health, data freshness, automation mode', roles: ADMIN, keywords: ['settings', 'system', 'health check', 'endpoints', 'brain'] },
];

const PAGE_LABEL = new Map(PAGES.map((p) => [p.page, p.label]));
const PAGE_ROLES = new Map(PAGES.map((p) => [p.page, p.roles]));

// ─────────────────────────────────────────────────────────────
// SECTIONS — headings verified to exist in the component tree
// ─────────────────────────────────────────────────────────────

type SectionSeed = [page: string, heading: string, keywords?: string[]];

const SECTION_SEEDS: SectionSeed[] = [
  ['/', 'Agent Summary Directory', ['all agents', 'directory', 'list']],
  ['/', 'Risk Distribution by Department', ['heatmap', 'department risk']],
  ['/', 'Top At-Risk Agents', ['worst', 'most risky']],
  ['/', 'Priority Actions', ['todo', 'do first']],

  ['/ownership', 'Ownership Intelligence', ['ownership summary']],
  ['/ownership', 'Owner Concentration & Coverage', ['concentration', 'coverage', 'backup']],
  ['/ownership', 'Human-Agent Dependency Pipeline', ['human agent', 'pipeline']],
  ['/ownership', 'Human Dependency Risks', ['key person', 'human risk']],
  ['/ownership', 'Organizational Relationship Map', ['relationships', 'org map']],
  ['/ownership', 'Detailed Owner Registries', ['registry', 'owner list']],

  ['/risk', 'Risk Intelligence', ['risk header', 'risk score']],
  ['/risk', 'Organizational Health Summary', ['org health', 'health banner']],
  ['/risk', 'Critical Risk Agents', ['critical', 'severe']],
  ['/risk', 'Predictive Risk Forecast', ['predicted risk', 'likely risk']],
  ['/risk', 'High Risk Agents', ['high risk']],
  ['/risk', 'Medium Risk Agents', ['medium risk']],
  ['/risk', 'Low Risk Agents', ['low risk']],

  ['/map', 'Dependency Intelligence', ['dependency graph', 'canvas']],
  ['/map', 'Blast Radius Simulator', ['blast radius', 'downstream', 'impact']],
  ['/map', 'Agent Continuity Matrix', ['dependency table', 'continuity matrix']],
  ['/map', 'Hidden Dependency Overlay', ['hidden', 'undocumented dependency']],
  ['/map', 'Dependency Evolution', ['evolution', 'changing dependencies']],

  ['/simulation', 'Simulation Universe Ranking', ['universe', 'ranked scenarios']],

  ['/recommendations', 'Decision Support Queue', ['support queue', 'pending decisions']],
  ['/recommendations', 'Verified Advisor Panel', ['advisor', 'autonomous advice']],
  ['/recommendations', 'Opportunity Backlog', ['opportunities', 'backlog']],

  ['/ai-tools', 'High Risk Tools', ['risky tools']],
  ['/ai-tools', 'Medium Risk Tools', []],
  ['/ai-tools', 'Low Risk Tools', []],
  ['/ai-tools', 'External Vendor Ecosystem', ['vendors', 'ecosystem', 'third party']],

  ['/knowledge', 'Knowledge Concentration Gauge', ['concentration', 'gauge']],
  ['/knowledge', 'Global Entity Search', ['entity search']],

  ['/continuity', 'Continuity & Governance', ['continuity header']],
  ['/continuity', 'Disruption Continuity', ['disruption', 'survive']],
  ['/continuity', 'Department Disruption Map', ['department disruption']],
  ['/continuity', 'Compliance Governance', ['compliance', 'policy']],
  ['/continuity', 'Governance Heatmap', ['governance heat']],

  ['/workflows', 'Workflow Step Chains', ['steps', 'chain']],
  ['/workflows', 'Collision Detection', ['collisions', 'conflicts']],
  ['/workflows', 'Shared-Actor Conflicts', ['shared actor', 'double booked']],
  ['/workflows', 'Blocked Workflows', ['blocked', 'stuck']],
  ['/workflows', 'Verification Ledger', ['verification', 'ledger', 'flagged']],
  ['/workflows', 'Self-Healing Feed', ['self healing', 'auto fix']],

  ['/forecast', 'Organizational Outlook', ['outlook']],
  ['/forecast', 'Health Trajectory', ['trajectory', 'trend']],

  ['/org-science', 'DNA Fingerprint', ['dna', 'identity']],
  ['/org-science', 'Culture Health', ['culture']],
  ['/org-science', 'Maturity Curve', ['maturity']],
  ['/org-science', 'Behavioral Profile', ['behavior']],
  ['/org-science', 'Collaboration Matrix', ['collaboration', 'human ai']],
  ['/org-science', 'Capability Intel', ['capabilities', 'skills']],
  ['/org-science', 'Ownership Coverage', ['ownership', 'coverage']],
  ['/org-science', 'Learning Maturity', ['learning', 'improvement']],
  ['/org-science', 'Pattern Regularity', ['patterns', 'recurring']],
  ['/org-science', 'Industry Benchmark', ['benchmark', 'compare', 'peers']],

  ['/network', 'Network Visualization', ['network graph']],
  ['/network', 'People Centrality Graph (M35)', ['centrality', 'most connected']],

  ['/admin', 'Endpoint Health', ['endpoints', 'api health']],
  ['/admin', 'Data Freshness', ['freshness', 'stale data']],
  ['/admin', 'Automation Mode', ['automation', 'advisory mode']],
];

export const SECTIONS: CommandTarget[] = SECTION_SEEDS.map(([page, heading, keywords]) => ({
  id: `s-${page}-${heading}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  label: heading,
  kind: 'section' as const,
  page,
  match: heading,
  parent: PAGE_LABEL.get(page) ?? page,
  keywords: keywords ?? [],
  roles: PAGE_ROLES.get(page),
}));

// ─────────────────────────────────────────────────────────────
// MODULES — M01–M55 minus four retired (M10, M12, M17, M47; see
// backend/brain/data/constitutional-modules.js), each pointed at the
// surface that renders it. A module with no `match` has no dedicated
// block on its page yet.
// ─────────────────────────────────────────────────────────────

type ModuleSeed = [code: string, name: string, page: string, match?: string];

const MODULE_SEEDS: ModuleSeed[] = [
  ['M01', 'Ownership Intelligence', '/ownership', 'Ownership Intelligence'],
  ['M02', 'Dependency Intelligence', '/map', 'Dependency Intelligence'],
  ['M03', 'Risk Intelligence', '/risk', 'Risk Intelligence'],
  ['M04', 'Recommendation Engine', '/recommendations'],
  ['M05', 'What-If Simulation Engine', '/simulation'],
  ['M06', 'Human-Agent Dependency Map', '/ownership', 'Human-Agent Dependency Pipeline'],
  ['M07', 'AI Tool Intelligence', '/ai-tools'],
  ['M08', 'Workflow Intelligence', '/workflows', 'Workflow Step Chains'],
  ['M09', 'Knowledge Risk Intelligence', '/knowledge'],
  ['M11', 'Predictive Risk Intelligence', '/risk', 'Predictive Risk Forecast'],
  ['M13', 'Human-AI Collaboration Intelligence', '/org-science', 'Collaboration Matrix'],
  ['M14', 'Decision Intelligence', '/decision'],
  ['M15', 'Verification Intelligence', '/workflows', 'Verification Ledger'],
  ['M16', 'Workflow Orchestration Intelligence', '/workflows', 'Collision Detection'],
  ['M18', 'Organizational Continuity Intelligence', '/continuity', 'Disruption Continuity'],
  ['M19', 'Governance Intelligence', '/continuity', 'Governance Heatmap'],
  ['M20', 'Accountability Intelligence', '/continuity', 'Compliance Governance'],
  ['M21', 'Executive Avatar Intelligence', '/'],
  ['M22', 'Voice Intelligence Engine', '/'],
  ['M23', 'Executive Briefing Intelligence', '/'],
  ['M24', 'Decision Support Intelligence', '/recommendations', 'Decision Support Queue'],
  ['M25', 'Organizational Health Intelligence', '/risk', 'Organizational Health Summary'],
  ['M26', 'Executive Memory Intelligence', '/memory'],
  ['M27', 'Executive Context Intelligence', '/memory'],
  ['M28', 'Universal Dependency Graph', '/map', 'Agent Continuity Matrix'],
  ['M29', 'Organizational Relationship Intelligence', '/ownership', 'Organizational Relationship Map'],
  ['M30', 'Knowledge Concentration Intelligence', '/knowledge', 'Knowledge Concentration Gauge'],
  ['M31', 'Organizational Ecosystem Intelligence', '/ai-tools', 'External Vendor Ecosystem'],
  ['M32', 'Dependency Impact Intelligence', '/map', 'Blast Radius Simulator'],
  ['M33', 'Dependency Evolution Intelligence', '/map', 'Dependency Evolution'],
  ['M34', 'Hidden Dependency Intelligence', '/map', 'Hidden Dependency Overlay'],
  ['M35', 'Organizational Network Intelligence', '/network', 'People Centrality Graph (M35)'],
  ['M36', 'Signal Intelligence', '/notifications'],
  ['M37', 'Pattern Intelligence', '/org-science', 'Pattern Regularity'],
  ['M38', 'Opportunity Intelligence', '/recommendations', 'Opportunity Backlog'],
  ['M39', 'Capability Intelligence', '/org-science', 'Capability Intel'],
  ['M40', 'Ownership Coverage Intelligence', '/org-science', 'Ownership Coverage'],
  ['M41', 'Organizational DNA Intelligence', '/org-science', 'DNA Fingerprint'],
  ['M42', 'Culture Intelligence', '/org-science', 'Culture Health'],
  ['M43', 'Organizational Maturity Intelligence', '/org-science', 'Maturity Curve'],
  ['M44', 'Organizational Behavior Intelligence', '/org-science', 'Behavioral Profile'],
  ['M45', 'Benchmark Intelligence', '/org-science', 'Industry Benchmark'],
  ['M46', 'Truth Intelligence', '/decision'],
  ['M48', 'Autonomous Advisor', '/recommendations', 'Verified Advisor Panel'],
  ['M49', 'Digital Twin Intelligence', '/simulation'],
  ['M50', 'Organizational Brain Core Logic', '/admin'],
  ['M51', 'Self-Healing Intelligence', '/workflows', 'Self-Healing Feed'],
  ['M52', 'Governance Automation Intelligence', '/admin', 'Automation Mode'],
  ['M53', 'Continuity Automation Intelligence', '/continuity', 'Department Disruption Map'],
  ['M54', 'Simulation Universe', '/simulation', 'Simulation Universe Ranking'],
  ['M55', 'Meta-Brain Orchestrator', '/admin'],
];

export const MODULES: CommandTarget[] = MODULE_SEEDS.map(([code, name, page, match]) => ({
  id: `m-${code}`,
  code,
  label: `${code} — ${name}`,
  kind: 'module' as const,
  page,
  match,
  parent: PAGE_LABEL.get(page) ?? page,
  keywords: [code, name],
  roles: PAGE_ROLES.get(page),
  hint: match
    ? `Opens ${PAGE_LABEL.get(page)} → ${match}`
    : `Opens ${PAGE_LABEL.get(page)}`,
}));

export const STATIC_TARGETS: CommandTarget[] = [...PAGES, ...SECTIONS, ...MODULES];

// ─────────────────────────────────────────────────────────────
// RANKING
// ─────────────────────────────────────────────────────────────

const KIND_BASE: Record<CommandKind, number> = {
  page: 40,
  section: 34,
  module: 30,
  entity: 26,
};

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Relevance score, or -1 when the target does not match at all.
 * Earlier and whole-word matches beat late substring matches, so "risk"
 * surfaces "Risk Intelligence" above "Predictive Risk Forecast".
 */
export function scoreTarget(target: CommandTarget, rawQuery: string): number {
  const q = normalize(rawQuery);
  if (!q) return -1;

  const haystacks: Array<[text: string, weight: number]> = [
    [normalize(target.label), 1],
    [normalize(target.code ?? ''), 1.2],
    [normalize(target.parent ?? ''), 0.35],
    [normalize((target.keywords ?? []).join(' ')), 0.55],
    [normalize(target.hint ?? ''), 0.25],
  ];

  let best = -1;
  for (const [text, weight] of haystacks) {
    if (!text) continue;
    const at = text.indexOf(q);
    if (at === -1) continue;

    let hit = 30;
    if (text === q) hit = 100;
    else if (at === 0) hit = 78;
    else if (text[at - 1] === ' ') hit = 58;

    // A short target that mostly *is* the query outranks a long one that
    // merely contains it.
    hit += Math.round(14 * (q.length / Math.max(text.length, 1)));
    best = Math.max(best, hit * weight);
  }

  if (best < 0) return -1;
  return best + KIND_BASE[target.kind];
}

export function searchTargets(
  targets: CommandTarget[],
  query: string,
  role: string,
  limit = 24,
): CommandTarget[] {
  const r = (role || 'employee').toLowerCase();
  return targets
    .filter((t) => !t.roles || t.roles.includes(r))
    .map((t) => ({ t, score: scoreTarget(t, query) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score || a.t.label.length - b.t.label.length)
    .slice(0, limit)
    .map((x) => x.t);
}

/** Suggestions shown before the executive types anything. */
export function defaultSuggestions(role: string): CommandTarget[] {
  const r = (role || 'employee').toLowerCase();
  const wanted = [
    'p-dashboard',
    's-risk-critical-risk-agents',
    'p-ownership',
    's-map-blast-radius-simulator',
    'p-knowledge',
    'p-decision',
  ];
  return wanted
    .map((id) => STATIC_TARGETS.find((t) => t.id === id))
    .filter((t): t is CommandTarget => !!t && (!t.roles || t.roles.includes(r)));
}
