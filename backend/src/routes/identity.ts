// =============================================================================
// Horquva Continuity Platform — Identity Queue REST API
// =============================================================================
// Implements SRS ID-02 & ID-03:
// - GET /api/identity-queue (List pending unlinked accounts with suggestions)
// - POST /api/identity-queue/confirm-suggestions (Bulk confirm stored suggestions)
// - POST /api/identity-queue/:id/resolve (Resolve with link/service_account/departed/ignore)
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataService } from '../services/dataService.js';
import { IdentityQueueError } from '../identity/queue.js';

export const identityRouter = Router();

// 1. GET /api/identity-queue
identityRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const queueService = dataService.getQueueService();
    const items = await queueService.listPendingWithSuggestions(dataService.getGraph());

    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch identity queue.' });
  }
});

// 2. POST /api/identity-queue/confirm-suggestions
const ConfirmSuggestionsSchema = z.object({
  linkIds: z.array(z.string().min(1)).min(1).max(200),
});

identityRouter.post('/confirm-suggestions', async (req: Request, res: Response) => {
  const parsed = ConfirmSuggestionsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid confirm-suggestions payload.' });
    return;
  }

  try {
    const dataService = DataService.getInstance();
    const queueService = dataService.getQueueService();
    const actor = req.user!.id;

    const links = await queueService.confirmSuggestions(parsed.data.linkIds, actor);
    await dataService.reattributeGraph();

    for (const link of links) {
      dataService.addAuditEntry(
        actor,
        'IDENTITY_SUGGESTION_CONFIRMED',
        `identity_link:${link.id}`,
        `Confirmed suggested link for ${link.accountId} to ${link.personId}.`
      );
    }

    res.json({ confirmed: links.length, links });
  } catch (err: any) {
    if (err instanceof IdentityQueueError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message || 'Failed to confirm suggested links.' });
  }
});

// 3. POST /api/identity-queue/:id/resolve
const ResolveSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('link'),
    personId: z.string().min(1),
  }),
  z.object({
    action: z.literal('service_account'),
  }),
  z.object({
    action: z.literal('departed'),
  }),
  z.object({
    action: z.literal('ignore'),
  }),
]);

identityRouter.post('/:id/resolve', async (req: Request, res: Response) => {
  const parsed = ResolveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid identity resolution payload.' });
    return;
  }

  try {
    const dataService = DataService.getInstance();
    const queueService = dataService.getQueueService();
    const actor = req.user!.id; // the signed-in admin, not a hard-coded one
    const queueItemId = String(req.params.id);

    const item = await queueService.getQueueItem(queueItemId);
    if (!item) {
      res.status(404).json({ error: 'Identity queue item not found.' });
      return;
    }
    if (item.status !== 'pending') {
      res.status(409).json({ error: `Already resolved (${item.status}).` });
      return;
    }

    let outcome: string;
    if (parsed.data.action === 'link') {
      const person = dataService.getGraph().getNode(parsed.data.personId)?.entity;
      if (!person || person.kind !== 'person') {
        res.status(400).json({ error: 'Link target must be a person in the directory.' });
        return;
      }
      await queueService.resolveLink(queueItemId, person.id, actor);
      await dataService.reattributeGraph();
      outcome = `linked to ${person.name}`;
    } else if (parsed.data.action === 'service_account') {
      await queueService.resolveMarkServiceAccount(queueItemId, actor);
      outcome = 'marked as a service account';
    } else if (parsed.data.action === 'departed') {
      await queueService.resolveMarkDeparted(queueItemId, actor);
      outcome = 'marked as a former employee';
    } else {
      await queueService.resolveIgnore(queueItemId, actor);
      outcome = 'ignored';
    }

    const label = item.displayName || item.emailCandidate || item.externalAccountId;
    dataService.addAuditEntry(actor, 'IDENTITY_RESOLVED', `identity:${queueItemId}`, `${item.source} account "${label}" ${outcome}.`);

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof IdentityQueueError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message || 'Failed to resolve identity item.' });
  }
});
