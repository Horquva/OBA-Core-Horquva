// =============================================================================
// Horquva Continuity Platform — Reviewer queue read model (/api/me/tasks, HND-04)
// =============================================================================
// What the signed-in person has to answer, and nothing else:
//   - confirmations: their own open magic links from real campaigns
//   - handovers: assets they were named successor for and asked to accept
// One row per handover, because acceptance is per asset (HND-04/05).
// Facts are shown as recorded: unknown criticality stays unknown, a missing
// runbook link is null, and the credential note appears only when the asset
// really runs on the leaver's personal credentials.
// =============================================================================

import type { EvidenceGrade } from '@horquva/types';
import type { ContinuityGraph } from '../domain/graph/index.js';
import type { DataService, UserAccount } from '../services/dataService.js';
import { personIdForUser } from '../handover/successionService.js';
import { openLinksFor } from '../attestation/attestationService.js';
import { criticalityView } from './factViews.js';

type Ref = { id: string; kind: string; name: string };

export interface ReviewerHandoverItem {
  handoverId: string;
  asset: Ref;
  criticality: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  criticalityGrade: EvidenceGrade;
  runbookUrl: string | null;
  credentialNote: string | null;
}

export interface ReviewerTasks {
  confirmations: Array<{ token: string; campaignName: string; assetCount: number; dueDate: string }>;
  handovers: Array<{ departureId: string; from: Ref; leaveDate: string; assets: ReviewerHandoverItem[] }>;
}

const refOf = (graph: ContinuityGraph, id: string): Ref => {
  const e = graph.getNode(id)?.entity;
  return { id, kind: e?.kind ?? 'unknown', name: e?.name ?? id };
};

function runsOnCredentialsOf(graph: ContinuityGraph, assetId: string, personId: string): boolean {
  return graph
    .getEdgesForEntity(assetId)
    .some((e) => e.type === 'runs_on_credentials_of' && e.fromId === assetId && e.toId === personId && !e.validTo);
}

export function reviewerTasksFor(ds: DataService, user: UserAccount): ReviewerTasks {
  const graph = ds.getGraph();
  const me = personIdForUser(graph, user);
  // A user with no person record owns nothing and can be named for nothing.
  if (!me) return { confirmations: [], handovers: [] };

  const handovers: ReviewerTasks['handovers'] = [];
  for (const dep of ds.getDepartures()) {
    const mine = dep.handovers.filter((h) => h.successorId === me && h.acceptance === 'requested');
    if (mine.length === 0) continue;
    const from = refOf(graph, dep.personId);
    handovers.push({
      departureId: dep.id,
      from,
      leaveDate: dep.leaveDate,
      assets: mine.map((h) => {
        const node = graph.getNode(h.assetId);
        const crit = criticalityView(node?.facts.get('criticality'));
        const runbookUrl = (node?.entity?.externalRefs as Record<string, string> | undefined)?.runbookUrl ?? null;
        return {
          handoverId: h.id,
          asset: refOf(graph, h.assetId),
          criticality: crit.level,
          criticalityGrade: crit.grade,
          runbookUrl,
          credentialNote: runsOnCredentialsOf(graph, h.assetId, dep.personId)
            ? `Runs on ${from.name}'s personal credentials. Move it to a service account before their account is disabled.`
            : null,
        };
      }),
    });
  }
  handovers.sort((a, b) => a.leaveDate.localeCompare(b.leaveDate));

  return { confirmations: openLinksFor(me), handovers };
}
