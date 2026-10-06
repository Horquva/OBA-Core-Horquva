// =============================================================================
// Horquva Continuity Platform — Ask OBA REST API (AI-01, B-14)
// =============================================================================
// - GET  /api/assistant/conversations      (the signed-in user's own)
// - GET  /api/assistant/conversations/:id  (own only; otherwise 404)
// - POST /api/assistant/messages           { conversationId | null, query }
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataService } from '../services/dataService.js';
import { AssistantError, getConversation, listConversations, sendMessage } from '../assistant/assistantService.js';

export const assistantRouter = Router();

assistantRouter.get('/conversations', (req: Request, res: Response) => {
  res.json({ conversations: listConversations(req.user!.id) });
});

assistantRouter.get('/conversations/:id', (req: Request, res: Response) => {
  const found = getConversation(req.user!.id, String(req.params.id));
  if (!found) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  res.json(found);
});

const MessageSchema = z.object({
  conversationId: z.string().min(1).nullable().optional(),
  query: z.string().trim().min(1).max(2000),
});

assistantRouter.post('/messages', async (req: Request, res: Response) => {
  const parsed = MessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ask a question (up to 2,000 characters).' });
    return;
  }
  try {
    const graph = DataService.getInstance().getGraph();
    res.json(await sendMessage(req.user!.id, parsed.data.conversationId ?? null, parsed.data.query, graph));
  } catch (err: any) {
    if (err instanceof AssistantError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message || 'Failed to answer.' });
  }
});
