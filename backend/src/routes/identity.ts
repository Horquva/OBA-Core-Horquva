// =============================================================================
// Horquva Continuity Platform — Identity Queue REST API
// =============================================================================
// Implements SRS ID-02 & ID-03:
// - GET /api/identity-queue (List pending items with suggestion)
// - POST /api/identity-queue/:id/resolve (Resolve with link/service_account/departed/ignore)
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataService } from '../services/dataService.js';
import { IdentityMatcher } from '../identity/matcher.js';

export const identityRouter = Router();

// 1. GET /api/identity-queue
identityRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const queueService = dataService.getQueueService();
    const pending = await queueService.listQueue({ status: 'pending' });
    const graph = dataService.getGraph();

    // Prepare directory people for matcher
    const peopleNodes = graph.getAllNodes().filter((n) => n.entity.kind === 'person');
    const directoryPeople = peopleNodes.map((n) => ({
      id: n.entity.id,
      primaryEmail: (n.entity.externalRefs as any)?.email || n.entity.id.replace('person:', ''),
      displayName: n.entity.name,
      status: (n.facts.get('status')?.value as 'active' | 'departed') || 'active',
    }));

    const matcher = new IdentityMatcher(directoryPeople);

    const items = pending.map((item) => {
      let suggestion = null;
      if (item.emailCandidate || item.displayName) {
        const match = matcher.match({
          source: item.source,
          externalAccountId: item.externalAccountId,
          email: item.emailCandidate || undefined,
          displayName: item.displayName || undefined,
        });

        if (match.matched && match.directoryPersonId) {
          const matchedNode = graph.getNode(match.directoryPersonId);
          suggestion = {
            person: {
              id: match.directoryPersonId,
              kind: 'person' as const,
              name: matchedNode?.entity.name || match.directoryPersonId,
            },
            reason: match.reasons.join('; ') || 'Name/email similarity match',
          };
        }
      }

      return {
        id: item.id,
        source: item.source,
        displayName: item.displayName,
        emailCandidate: item.emailCandidate,
        suggestion,
      };
    });

    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch identity queue.' });
  }
});

// 2. POST /api/identity-queue/:id/resolve
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
    const adminUser = 'user:admin';

    const queueItemId = String(req.params.id);

    if (parsed.data.action === 'link') {
      await queueService.resolveLink(queueItemId, parsed.data.personId, adminUser);
    } else if (parsed.data.action === 'service_account') {
      await queueService.resolveMarkServiceAccount(queueItemId, adminUser);
    } else if (parsed.data.action === 'departed') {
      await queueService.resolveMarkDeparted(queueItemId, adminUser);
    } else if (parsed.data.action === 'ignore') {
      await queueService.resolveIgnore(queueItemId, adminUser);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to resolve identity item.' });
  }
});
