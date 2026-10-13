// =============================================================================
// Horquva Continuity Platform — Ask OBA REST API (AI-01, B-14)
// =============================================================================
// - GET  /api/assistant/conversations      (the signed-in user's own)
// - GET  /api/assistant/conversations/:id  (own only; otherwise 404)
// - POST /api/assistant/messages           { conversationId | null, query }
// - POST /api/assistant/messages/stream    same body; Server-Sent Events:
//        start {conversationId, conversation, userMessage} · delta {text}* ·
//        done {conversationId, conversation, message} · error {error}
// - PATCH  /api/assistant/conversations/:id  { title }   (own only)
// - DELETE /api/assistant/conversations/:id             (own only)
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataService } from '../services/dataService.js';
import {
  AssistantError,
  TITLE_MAX,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  sendMessage,
  streamMessage,
} from '../assistant/assistantService.js';

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

assistantRouter.post('/messages/stream', async (req: Request, res: Response) => {
  const parsed = MessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ask a question (up to 2,000 characters).' });
    return;
  }

  let events: ReturnType<typeof streamMessage>;
  try {
    // Validation and the ownership check happen here, before any bytes are streamed.
    events = streamMessage(req.user!.id, parsed.data.conversationId ?? null, parsed.data.query, DataService.getInstance().getGraph());
  } catch (err: any) {
    res.status(err instanceof AssistantError ? err.status : 500).json({ error: err.message || 'Failed to answer.' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (event: string, data: unknown) => {
    if (!res.writableEnded && !res.destroyed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // If the viewer leaves mid-answer the turn still finishes, so it is saved to their history.
    for await (const ev of events) send(ev.type, ev.data);
  } catch (err: any) {
    console.error('[assistant] Streaming answer failed:', err);
    send('error', { error: "The answer was interrupted. Try again." });
  }
  res.end();
});

const RenameSchema = z.object({ title: z.string().trim().min(1).max(TITLE_MAX) });

assistantRouter.patch('/conversations/:id', (req: Request, res: Response) => {
  const parsed = RenameSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: `Give the conversation a title (up to ${TITLE_MAX} characters).` });
    return;
  }
  try {
    res.json({ conversation: renameConversation(req.user!.id, String(req.params.id), parsed.data.title) });
  } catch (err: any) {
    res.status(err instanceof AssistantError ? err.status : 500).json({ error: err.message || 'Failed to rename.' });
  }
});

assistantRouter.delete('/conversations/:id', (req: Request, res: Response) => {
  try {
    deleteConversation(req.user!.id, String(req.params.id));
    res.status(204).end();
  } catch (err: any) {
    res.status(err instanceof AssistantError ? err.status : 500).json({ error: err.message || 'Failed to delete.' });
  }
});
