// =============================================================================
// Horquva Continuity Platform — Confirmation campaigns + magic-link answers
// (CHK-01, CHK-02, CHK-04 partial; B-08, B-15)
// =============================================================================
// Runs on the same in-memory store as the rest of the MVP (departures, actions,
// identity queue). The Postgres AttestationEngine is not used by the API yet.
//
// One unguessable link per reviewer per campaign covers all their assets.
// Truth rules for an answer:
//   - Only the owner's own answers become `confirmed` facts (criticality,
//     documented, fallback) and confirm their own ownership.
//   - A backup the owner names is `stated`: only the backup can confirm it.
//   - "Don't know" leaves the fact unknown — it is never stored as "no".
//   - "I'm not the owner" confirms nothing; it is raised as a change for an
//     admin to resolve (and stated as such in the audit log).
// =============================================================================

import crypto from 'node:crypto';
import type { CanonicalEdge, CanonicalFact, FactAttribute } from '@horquva/types';
import type { ContinuityGraph } from '../domain/graph/index.js';
import { evaluateAllChecks } from '../domain/checks/index.js';
import { DataService } from '../services/dataService.js';
import { listTeams } from '../views/peopleViews.js';
import { AttestationMailer } from './mailer.js';

type Ref = { id: string; kind: string; name: string };

export type CampaignScope =
  | { kind: 'all_unknown_critical' }
  | { kind: 'department'; department: string }
  | { kind: 'leaver'; personId: string }
  | { kind: 'selected'; assetIds: string[] };

export type AttestAnswers =
  | {
      isOwner: true;
      ownerPersonId: null;
      backup: { kind: 'person'; personId: string } | { kind: 'none' };
      criticality: 'critical' | 'high' | 'medium' | 'low';
      criticalityReason: string;
      runbook: { kind: 'url'; url: string } | { kind: 'not_documented' };
      fallback: 'yes' | 'no' | 'unknown';
    }
  | { isOwner: false; ownerPersonId: string | null };

interface Campaign {
  id: string;
  name: string;
  dueDate: string;
  createdAt: string;
  createdBy: string; // user name
  introLine: string | null;
}

interface Task {
  id: string;
  campaignId: string;
  reviewerPersonId: string;
  assetId: string;
  status: 'pending' | 'saved';
  answers: AttestAnswers | null;
  savedAt: string | null;
}

interface Link {
  token: string;
  campaignId: string;
  reviewerPersonId: string;
}

/** Links stay usable this long after the campaign's due date. */
export const LINK_GRACE_DAYS = 14;

const campaigns = new Map<string, Campaign>();
const tasks = new Map<string, Task>();
const links = new Map<string, Link>();

export class AttestationError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const refOf = (graph: ContinuityGraph, id: string): Ref | null => {
  const e = graph.getNode(id)?.entity;
  return e ? { id: e.id, kind: e.kind, name: e.name } : null;
};
const emailOf = (graph: ContinuityGraph, personId: string) =>
  (graph.getNode(personId)?.entity?.externalRefs as Record<string, string> | undefined)?.email ?? personId.replace(/^person:/, '');
const isAsset = (kind: string | undefined) => !!kind && kind !== 'person' && kind !== 'group';
// Things an owner can attest to. Models and vendors are external: nobody inside "owns" them.
const isOwnedAsset = (kind: string | undefined) => isAsset(kind) && kind !== 'model' && kind !== 'vendor';

// ── Campaign preview / create (admin) ───────────────────────────────────────

function assetsInScope(graph: ContinuityGraph, scope: CampaignScope): string[] {
  switch (scope.kind) {
    case 'selected':
      return scope.assetIds.filter((id) => isAsset(graph.getNode(id)?.entity?.kind));
    case 'leaver':
      return graph.getOwnedAssets(scope.personId).map((a) => a.id);
    case 'department': {
      const team = listTeams(graph).find((t) => t.group.id === scope.department || t.group.name === scope.department);
      if (!team) throw new AttestationError(404, `No team "${scope.department}" in the directory.`);
      return [...new Set(team.memberIds.flatMap((p) => graph.getOwnedAssets(p).map((a) => a.id)))];
    }
    case 'all_unknown_critical': {
      // Assets with an UNKNOWN check, plus assets whose criticality is itself unknown.
      const unknown = new Set(evaluateAllChecks(graph).filter((c) => c.status === 'UNKNOWN').map((c) => c.entityId));
      for (const n of graph.getAllNodes()) {
        const crit = n.facts.get('criticality');
        if (isAsset(n.entity.kind) && (!crit || crit.grade === 'unknown')) unknown.add(n.entity.id);
      }
      return [...unknown].filter((id) => isOwnedAsset(graph.getNode(id)?.entity?.kind));
    }
  }
}

export function previewCampaign(graph: ContinuityGraph, scope: CampaignScope) {
  const assetIds = assetsInScope(graph, scope).sort();
  const taskList: Array<{ reviewerPersonId: string; assetEntityId: string }> = [];
  const unassigned: Ref[] = [];
  for (const assetId of assetIds) {
    // The reviewer is the asset's owner. No owner on record → nobody to ask (ID-02 queue).
    const owners = graph.getOwners(assetId).filter((o) => graph.getNode(o.id)?.facts.get('status')?.value !== 'departed');
    if (owners.length === 0) {
      unassigned.push(refOf(graph, assetId)!);
      continue;
    }
    for (const o of owners) taskList.push({ reviewerPersonId: o.id, assetEntityId: assetId });
  }
  const byReviewer = new Map<string, number>();
  for (const t of taskList) byReviewer.set(t.reviewerPersonId, (byReviewer.get(t.reviewerPersonId) ?? 0) + 1);

  const reviewers = [...byReviewer.entries()]
    .map(([id, assetCount]) => ({ person: refOf(graph, id)!, email: emailOf(graph, id), assetCount, viaManager: false }))
    .sort((a, b) => a.person.name.localeCompare(b.person.name));

  return {
    emailCount: reviewers.length,
    questionCount: taskList.length * 5,
    reviewers,
    tasks: taskList,
    unassignedAssets: unassigned,
    email: {
      subject: 'Please confirm who owns and backs up your systems',
      bodyText:
        'You are listed as the owner of the systems below. Please confirm who backs each one up, whether it is documented, and whether there is a fallback. It takes about a minute per system.',
    },
  };
}

export async function createCampaign(
  ds: DataService,
  input: {
    name: string;
    dueDate: string;
    introLine: string | null;
    email?: { subject: string; bodyText: string } | null;
    tasks: Array<{ reviewerPersonId: string; assetEntityId: string }>;
  },
  actorName: string,
) {
  const graph = ds.getGraph();
  const due = new Date(input.dueDate);
  if (Number.isNaN(due.getTime()) || due.getTime() < Date.now() - 86_400_000) {
    throw new AttestationError(400, 'The due date must be today or later.');
  }
  for (const t of input.tasks) {
    if (graph.getNode(t.reviewerPersonId)?.entity?.kind !== 'person') throw new AttestationError(400, `Not a person: ${t.reviewerPersonId}`);
    if (!isAsset(graph.getNode(t.assetEntityId)?.entity?.kind)) throw new AttestationError(400, `Not an asset: ${t.assetEntityId}`);
  }

  const campaign: Campaign = {
    id: crypto.randomUUID(),
    name: input.name,
    dueDate: due.toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: actorName,
    introLine: input.introLine,
  };
  campaigns.set(campaign.id, campaign);

  const seen = new Set<string>();
  for (const t of input.tasks) {
    const key = `${t.reviewerPersonId}|${t.assetEntityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const task: Task = { id: crypto.randomUUID(), campaignId: campaign.id, reviewerPersonId: t.reviewerPersonId, assetId: t.assetEntityId, status: 'pending', answers: null, savedAt: null };
    tasks.set(task.id, task);
  }

  // One link per reviewer; email it (or, without SMTP, the mailer logs it on the server).
  const appUrl = (process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const mailer = new AttestationMailer();
  const reviewers = [...new Set(input.tasks.map((t) => t.reviewerPersonId))];
  let sent = 0;
  for (const reviewerPersonId of reviewers) {
    const token = crypto.randomBytes(32).toString('hex');
    links.set(token, { token, campaignId: campaign.id, reviewerPersonId });
    const names = [...tasks.values()].filter((t) => t.campaignId === campaign.id && t.reviewerPersonId === reviewerPersonId).map((t) => refOf(graph, t.assetId)!.name);
    const result = await mailer.sendAttestationEmail({
      to: emailOf(graph, reviewerPersonId),
      reviewerName: refOf(graph, reviewerPersonId)!.name,
      assetName: names.length === 1 ? names[0] : `${names.length} systems (${names.join(', ')})`,
      magicLinkUrl: `${appUrl}/attest/${token}`,
      campaignDueDate: due,
      subject: input.email?.subject,
      introLine: input.introLine,
      bodyText: input.email?.bodyText,
    });
    if (result.success) sent++;
  }

  ds.addAuditEntry(actorName, 'CREATE_CAMPAIGN', `campaign:${campaign.id}`, `"${campaign.name}": ${seen.size} asset(s), ${reviewers.length} reviewer(s).`);
  return {
    campaignId: campaign.id,
    reviewers: reviewers.length,
    emailsSent: sent,
    // 'logged' = no SMTP configured: nothing was emailed, links are only in the server log.
    emailDelivery: process.env.SMTP_HOST ? ('smtp' as const) : ('logged' as const),
  };
}

export function listCampaigns() {
  return [...campaigns.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => {
      const ts = [...tasks.values()].filter((t) => t.campaignId === c.id);
      return {
        id: c.id,
        name: c.name,
        status: ts.length > 0 && ts.every((t) => t.status === 'saved') ? 'completed' : 'active',
        due_date: c.dueDate,
        created_at: c.createdAt,
        total_tasks: ts.length,
        completed_tasks: ts.filter((t) => t.status === 'saved').length,
      };
    });
}

export function campaignDetail(graph: ContinuityGraph, id: string) {
  if (!campaigns.has(id)) return null;
  const byReviewer = new Map<string, { completed: number; total: number }>();
  for (const t of tasks.values()) {
    if (t.campaignId !== id) continue;
    const row = byReviewer.get(t.reviewerPersonId) ?? { completed: 0, total: 0 };
    row.total++;
    if (t.status === 'saved') row.completed++;
    byReviewer.set(t.reviewerPersonId, row);
  }
  return {
    id,
    reviewers: [...byReviewer.entries()]
      .map(([pid, r]) => ({ person: refOf(graph, pid)!, ...r }))
      .sort((a, b) => a.person.name.localeCompare(b.person.name)),
    // Reminders and escalation are not scheduled yet (CHK-04): say so with null.
    reminderAt: null,
    escalationAt: null,
  };
}

// ── Magic-link session (public, token-gated) ────────────────────────────────

function linkFor(token: string): Link {
  const link = links.get(token);
  if (!link) throw new AttestationError(404, 'This link is not valid.');
  return link;
}

const isExpired = (c: Campaign) => Date.now() > new Date(c.dueDate).getTime() + LINK_GRACE_DAYS * 86_400_000;

export function getSession(ds: DataService, token: string) {
  const link = linkFor(token);
  const graph = ds.getGraph();
  const campaign = campaigns.get(link.campaignId)!;
  const mine = [...tasks.values()].filter((t) => t.campaignId === link.campaignId && t.reviewerPersonId === link.reviewerPersonId);
  const org = ds.getOrganization();
  return {
    reviewer: { name: refOf(graph, link.reviewerPersonId)?.name ?? link.reviewerPersonId, email: emailOf(graph, link.reviewerPersonId) },
    requestedBy: campaign.createdBy,
    company: { name: org.companyName, logoUrl: org.logoUrl },
    expired: isExpired(campaign),
    submitted: mine.length > 0 && mine.every((t) => t.status === 'saved'),
    assets: mine.map((t) => ({ taskId: t.id, asset: refOf(graph, t.assetId)!, status: t.status === 'saved' ? 'saved' : 'todo' })),
  };
}

export function peopleForLink(ds: DataService, token: string): Ref[] {
  linkFor(token);
  return ds
    .getGraph()
    .getAllNodes()
    .filter((n) => n.entity.kind === 'person' && n.facts.get('status')?.value !== 'departed')
    .map((n) => ({ id: n.entity.id, kind: 'person', name: n.entity.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveAnswers(ds: DataService, token: string, taskId: string, answers: AttestAnswers) {
  const link = linkFor(token);
  const campaign = campaigns.get(link.campaignId)!;
  if (isExpired(campaign)) throw new AttestationError(410, 'This link has expired. Ask your admin for a new one.');
  const task = tasks.get(taskId);
  if (!task || task.campaignId !== link.campaignId || task.reviewerPersonId !== link.reviewerPersonId) {
    throw new AttestationError(404, 'This system is not part of your review.');
  }
  if (task.status === 'saved') throw new AttestationError(409, 'You already answered for this system.');

  const graph = ds.getGraph();
  const reviewer = task.reviewerPersonId;
  const assetId = task.assetId;
  const assetName = refOf(graph, assetId)?.name ?? assetId;
  const reviewerName = refOf(graph, reviewer)?.name ?? reviewer;
  const at = new Date();
  const sourceRef = `attestation:${task.id}`;

  if (!answers.isOwner) {
    // Confirms nothing. Raise it for an admin.
    const named = answers.ownerPersonId ? refOf(graph, answers.ownerPersonId) : null;
    if (answers.ownerPersonId && named?.kind !== 'person') throw new AttestationError(400, 'The owner you named is not in the directory.');
    ds.addChangeEvent({
      kind: 'owner_changed',
      title: `${reviewerName} says they don't own ${assetName}`,
      impact: named ? `They named ${named.name} as the owner. Nothing was confirmed; please check and reassign.` : 'Nothing was confirmed; please find the real owner.',
      href: `/assets/${assetId}`,
    });
    ds.addAuditEntry(reviewer, 'ATTESTATION_OWNER_DISPUTED', `asset:${assetId}`, `${reviewerName} says they don't own ${assetName}${named ? `; named ${named.name}` : ''}. No facts confirmed.`);
  } else {
    if (!graph.getOwners(assetId).some((o) => o.id === reviewer)) {
      throw new AttestationError(409, "You aren't recorded as this system's owner any more, so your answers can't confirm it.");
    }
    if (answers.backup.kind === 'person') {
      const b = graph.getNode(answers.backup.personId)?.entity;
      if (b?.kind !== 'person') throw new AttestationError(400, 'The backup you named is not in the directory.');
      if (b.id === reviewer) throw new AttestationError(400, "You can't be your own backup.");
    }

    const setFact = async (attribute: FactAttribute, value: unknown, ref = sourceRef) => {
      const fact: CanonicalFact = { entityId: assetId, attribute, value, grade: 'confirmed', source: 'attestation', sourceRef: ref, attestedBy: reviewer, validFrom: at, validTo: null };
      graph.setFact(fact); // what every screen reads
      await ds.getFactStore().insertFact({ entityId: assetId, attribute, value, grade: 'confirmed', source: 'attestation', sourceRef: ref, attestedBy: reviewer, validFrom: at }); // history
    };
    await setFact('criticality', answers.criticality);
    await setFact('documented', answers.runbook.kind === 'url', answers.runbook.kind === 'url' ? answers.runbook.url : sourceRef);
    if (answers.fallback !== 'unknown') await setFact('fallback_exists', answers.fallback === 'yes'); // "Don't know" stays unknown

    // The owner confirms their own ownership.
    graph.closeEdges((e) => e.type === 'owns' && e.fromId === reviewer && e.toId === assetId, at);
    graph.addEdge(edge(reviewer, assetId, 'owns', 'confirmed', sourceRef, at));

    let backupNote: string;
    if (answers.backup.kind === 'person') {
      const backupId = answers.backup.personId;
      const existing = graph.getAllEdges().find((e) => e.type === 'backs_up' && e.fromId === backupId && e.toId === assetId && !e.validTo);
      if (!existing) graph.addEdge(edge(backupId, assetId, 'backs_up', 'stated', sourceRef, at)); // only the backup can confirm
      backupNote = `backup ${refOf(graph, backupId)!.name}${existing ? ' (already on record)' : ' (stated; awaits their confirmation)'}`;
    } else {
      const removed = graph.closeEdges((e) => e.type === 'backs_up' && e.toId === assetId, at);
      backupNote = removed.length ? `no backup (removed ${removed.map((e) => refOf(graph, e.fromId)?.name ?? e.fromId).join(', ')})` : 'no backup';
    }
    ds.addAuditEntry(
      reviewer,
      'ATTESTATION_SUBMITTED',
      `asset:${assetId}`,
      `${reviewerName} confirmed ${assetName}: criticality ${answers.criticality} (${answers.criticalityReason}), ${answers.runbook.kind === 'url' ? 'documented' : 'not documented'}, fallback ${answers.fallback}, ${backupNote}.`,
    );
  }

  task.status = 'saved';
  task.answers = answers;
  task.savedAt = at.toISOString();
  return { ok: true };
}

function edge(fromId: string, toId: string, type: CanonicalEdge['type'], grade: CanonicalEdge['grade'], sourceRef: string, at: Date): CanonicalEdge {
  return { id: crypto.randomUUID(), fromId, toId, type, grade, source: 'attestation', sourceRef, validFrom: at, validTo: null };
}

/** Tests only: the links of a campaign, keyed by reviewer. */
export function _tokensFor(campaignId: string): Record<string, string> {
  return Object.fromEntries([...links.values()].filter((l) => l.campaignId === campaignId).map((l) => [l.reviewerPersonId, l.token]));
}

/** Tests only. */
export function _resetAttestations() {
  campaigns.clear();
  tasks.clear();
  links.clear();
}
