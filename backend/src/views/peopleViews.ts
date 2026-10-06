// =============================================================================
// Horquva Continuity Platform — People & Teams read models (UI-03, SIM-06)
// =============================================================================
// Teams are the directory's groups (`group` entities + `member_of` edges from
// the Entra/Google connectors, CON-06/07) — never a hard-coded roster.
//
// SEC-07 / UX rule 4: people are never ranked. Members are listed
// alphabetically. The one approved exception (UX D-23) is the team card's
// named share bar; its sentence stays aggregate ("2 people hold 70% …").
// Teams below the minimum group size show no per-person breakdown at all.
// =============================================================================

import type { ContinuityGraph } from '../domain/graph/index.js';
import type { DataService } from '../services/dataService.js';
import { criticalityView, edgeFactView, type FactView } from './factViews.js';

type Ref = { id: string; kind: string; name: string };

export interface Team {
  group: Ref;
  memberIds: string[];
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
const possessive = (name: string) => (name.endsWith('s') ? `${name}'` : `${name}'s`);

function ref(graph: ContinuityGraph, id: string): Ref | null {
  const e = graph.getNode(id)?.entity;
  return e ? { id: e.id, kind: e.kind, name: e.name } : null;
}

function isCriticalAsset(graph: ContinuityGraph, id: string): boolean {
  const level = criticalityView(graph.getNode(id)?.facts.get('criticality')).level;
  return level === 'critical' || level === 'high';
}

export function listTeams(graph: ContinuityGraph): Team[] {
  const members = new Map<string, Set<string>>();
  for (const e of graph.getAllEdges()) {
    if (e.type !== 'member_of' || e.validTo) continue;
    if (graph.getNode(e.fromId)?.entity?.kind !== 'person') continue;
    if (!members.has(e.toId)) members.set(e.toId, new Set());
    members.get(e.toId)!.add(e.fromId);
  }
  return [...members.entries()]
    .map(([groupId, ids]) => ({ group: ref(graph, groupId), memberIds: [...ids] }))
    .filter((t): t is Team => t.group !== null && t.group.kind === 'group')
    .sort((a, b) => byName(a.group, b.group));
}

export function teamOfPerson(graph: ContinuityGraph, personId: string): Ref | null {
  return listTeams(graph).find((t) => t.memberIds.includes(personId))?.group ?? null;
}

export interface TeamSummary {
  id: string;
  name: string;
  memberCount: number;
  rolledUp: boolean;
  coverage: { total: number; covered: number; exposed: number; unknown: number | null; definition: string };
  concentration: { sentence: string; holders: Array<{ person: Ref; sharePct: number }> } | null;
}

export function teamSummary(graph: ContinuityGraph, team: Team, minGroupSize: number): TeamSummary {
  const rolledUp = team.memberIds.length < minGroupSize;
  let total = 0;
  let covered = 0;
  const heldBy = new Map<string, number>();

  for (const personId of team.memberIds) {
    for (const asset of graph.getOwnedAssets(personId)) {
      if (!isCriticalAsset(graph, asset.id)) continue;
      total++;
      heldBy.set(personId, (heldBy.get(personId) ?? 0) + 1);
      if (graph.getBackups(asset.id).length > 0) covered++;
    }
  }

  let concentration: TeamSummary['concentration'] = null;
  if (!rolledUp && total > 0) {
    const holders = [...heldBy.entries()]
      .map(([id, count]) => ({ person: ref(graph, id)!, count, sharePct: Math.round((count / total) * 100) }))
      .filter((h) => h.person)
      .sort((a, b) => b.count - a.count || byName(a.person, b.person)); // D-23: bar segments by descending share

    // Aggregate sentence: the fewest people who together hold a majority. Names stay in the bar only.
    let held = 0;
    let people = 0;
    for (const h of holders) {
      held += h.count;
      people++;
      if (held * 2 > total) break;
    }
    const pct = Math.round((held / total) * 100);
    concentration = {
      sentence: `${people} ${people === 1 ? 'person holds' : 'people hold'} ${pct}% of ${possessive(team.group.name)} critical assets.`,
      holders: holders.map(({ person, sharePct }) => ({ person, sharePct })),
    };
  }

  return {
    id: team.group.id,
    name: team.group.name,
    memberCount: team.memberIds.length,
    rolledUp,
    coverage: {
      total,
      covered,
      exposed: total - covered,
      unknown: null,
      definition: "Critical and high assets owned by the team's members; covered = at least one backup on record.",
    },
    concentration,
  };
}

export interface Holding {
  asset: Ref;
  relation: 'owns' | 'backs_up' | 'credential';
  criticality: ReturnType<typeof criticalityView>['level'];
  backup: FactView;
}

/** What a person holds, with evidence taken from the records (factViews). Ordered by asset name. */
export function holdingsOf(graph: ContinuityGraph, personId: string): Holding[] {
  const out: Holding[] = [];
  const crit = (id: string) => criticalityView(graph.getNode(id)?.facts.get('criticality')).level;

  for (const asset of graph.getOwnedAssets(personId)) {
    out.push({ asset: ref(graph, asset.id)!, relation: 'owns', criticality: crit(asset.id), backup: edgeFactView(graph, asset.id, 'backs_up') });
  }
  for (const e of graph.getEdgesForEntity(personId)) {
    const asset = ref(graph, e.toId);
    if (e.type === 'backs_up' && e.fromId === personId && asset) {
      // Their own backup role, with that edge's real evidence.
      out.push({ asset, relation: 'backs_up', criticality: crit(asset.id), backup: edgeFactView(graph, asset.id, 'backs_up', (p) => p !== personId) });
    }
    const wf = ref(graph, e.fromId);
    if (e.type === 'runs_on_credentials_of' && e.toId === personId && wf) {
      out.push({ asset: wf, relation: 'credential', criticality: crit(wf.id), backup: edgeFactView(graph, wf.id, 'backs_up') });
    }
  }
  return out.sort((a, b) => byName(a.asset, b.asset) || a.relation.localeCompare(b.relation));
}

export function teamDetail(ds: DataService, teamId: string) {
  const graph = ds.getGraph();
  const team = listTeams(graph).find((t) => t.group.id === teamId);
  if (!team) return null;
  const summary = teamSummary(graph, team, ds.getOrganization().minGroupSize);
  // Below the minimum group size there is no per-person view (privacy floor).
  const members = summary.rolledUp
    ? []
    : team.memberIds
        .map((id) => ref(graph, id)!)
        .filter(Boolean)
        .sort(byName) // alphabetical only — never by holdings
        .map((person) => ({
          person,
          title: graph.getNode(person.id)?.entity?.description ?? null,
          holdings: holdingsOf(graph, person.id),
        }));
  return { team: summary, members };
}
