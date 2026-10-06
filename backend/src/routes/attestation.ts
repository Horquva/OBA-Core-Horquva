// =============================================================================
// Horquva Continuity Platform — Confirmation campaigns + magic-link form API
// =============================================================================
// Campaigns (signed in; creation is admin-only via RBAC):
//   GET  /api/attestation/campaigns
//   POST /api/attestation/campaigns/preview   { scope }
//   POST /api/attestation/campaigns           { name, dueDate, introLine?, tasks }
//   GET  /api/attestation/campaigns/:id
// Magic link (public, the unguessable token is the credential):
//   GET  /api/attest/:token
//   GET  /api/attest/:token/people
//   PUT  /api/attest/:token/tasks/:taskId     AttestAnswers
// Logic and truth rules live in attestation/attestationService.ts.
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataService } from '../services/dataService.js';
import {
  AttestationError,
  campaignDetail,
  createCampaign,
  getSession,
  listCampaigns,
  peopleForLink,
  previewCampaign,
  saveAnswers,
  type AttestAnswers,
} from '../attestation/attestationService.js';

function sendError(res: Response, err: any) {
  if (err instanceof AttestationError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: err?.message || 'Something went wrong.' });
}

// ── Campaigns ────────────────────────────────────────────────────────────────
export const attestationRouter = Router();

attestationRouter.get('/campaigns', (_req: Request, res: Response) => {
  res.json({ campaigns: listCampaigns() });
});

const ScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('all_unknown_critical') }),
  z.object({ kind: z.literal('department'), department: z.string().min(1) }),
  z.object({ kind: z.literal('leaver'), personId: z.string().min(1) }),
  z.object({ kind: z.literal('selected'), assetIds: z.array(z.string().min(1)).min(1) }),
]);

attestationRouter.post('/campaigns/preview', (req: Request, res: Response) => {
  const parsed = z.object({ scope: ScopeSchema }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid campaign scope.' });
    return;
  }
  try {
    res.json(previewCampaign(DataService.getInstance().getGraph(), parsed.data.scope));
  } catch (err) {
    sendError(res, err);
  }
});

const CreateCampaignSchema = z.object({
  name: z.string().trim().min(1),
  dueDate: z.string().min(1),
  introLine: z.string().nullable().optional(),
  sendAt: z.string().nullable().optional(),
  email: z.object({ subject: z.string().trim().min(1).max(200), bodyText: z.string().trim().min(1).max(4000) }).nullable().optional(),
  tasks: z.array(z.object({ reviewerPersonId: z.string().min(1), assetEntityId: z.string().min(1) })).min(1),
});

attestationRouter.post('/campaigns', async (req: Request, res: Response) => {
  const parsed = CreateCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid campaign request payload.' });
    return;
  }
  if (parsed.data.sendAt) {
    res.status(400).json({ error: 'Scheduled sending is not available yet; send now instead.' });
    return;
  }
  try {
    const result = await createCampaign(
      DataService.getInstance(),
      { name: parsed.data.name, dueDate: parsed.data.dueDate, introLine: parsed.data.introLine ?? null, email: parsed.data.email ?? null, tasks: parsed.data.tasks },
      req.user!.name,
    );
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    sendError(res, err);
  }
});

attestationRouter.get('/campaigns/:id', (req: Request, res: Response) => {
  const detail = campaignDetail(DataService.getInstance().getGraph(), String(req.params.id));
  if (!detail) {
    res.status(404).json({ error: 'Campaign not found.' });
    return;
  }
  res.json(detail);
});

// ── Magic-link form ──────────────────────────────────────────────────────────
export const attestRouter = Router();

attestRouter.get('/:token', (req: Request, res: Response) => {
  try {
    res.json(getSession(DataService.getInstance(), String(req.params.token)));
  } catch (err) {
    sendError(res, err);
  }
});

attestRouter.get('/:token/people', (req: Request, res: Response) => {
  try {
    res.json({ people: peopleForLink(DataService.getInstance(), String(req.params.token)) });
  } catch (err) {
    sendError(res, err);
  }
});

// The owner answers everything; "not the owner" only says who is (if they know).
const OwnerAnswers = z.object({
  isOwner: z.literal(true),
  ownerPersonId: z.null().optional().transform(() => null),
  backup: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('person'), personId: z.string().min(1) }),
    z.object({ kind: z.literal('none') }),
  ]),
  criticality: z.enum(['critical', 'high', 'medium', 'low']),
  criticalityReason: z.string().trim().min(1),
  runbook: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('url'), url: z.string().url() }),
    z.object({ kind: z.literal('not_documented') }),
  ]),
  fallback: z.enum(['yes', 'no', 'unknown']),
});
const NotOwnerAnswers = z.object({
  isOwner: z.literal(false),
  ownerPersonId: z.string().min(1).nullable(),
});
const AnswersSchema = z.union([OwnerAnswers, NotOwnerAnswers]);

attestRouter.put('/:token/tasks/:taskId', async (req: Request, res: Response) => {
  const parsed = AnswersSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Some answers are missing or invalid.' });
    return;
  }
  try {
    res.json(await saveAnswers(DataService.getInstance(), String(req.params.token), String(req.params.taskId), parsed.data as AttestAnswers));
  } catch (err) {
    sendError(res, err);
  }
});
