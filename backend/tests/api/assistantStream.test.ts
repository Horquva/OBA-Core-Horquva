// =============================================================================
// Horquva Continuity Platform — Ask OBA streaming, rename and delete
// =============================================================================
// No AI model in tests (GEMINI_API_KEY is blanked in vitest.config.ts), so the
// stream carries the graph answer. Hand-checked against handCheckableTruth.json:
// Omar owns 101 "Billing Sync to Stripe" and 102, with no backups.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { safeCut } from '../../src/assistant/assistantService.js';
import { authedFetch } from '../helpers/session.js';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

interface SseEvent {
  event: string;
  data: any;
}

async function streamAsk(query: string, conversationId: string | null = null, as = 'user:admin') {
  const res = await authedFetch(
    `${baseUrl}/api/assistant/messages/stream`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, query }) },
    as,
  );
  const text = await res.text();
  const events: SseEvent[] = text
    .split('\n\n')
    .filter((block) => block.trim())
    .map((block) => {
      const event = /^event: (.+)$/m.exec(block)?.[1] ?? '';
      const data = /^data: (.+)$/m.exec(block)?.[1];
      return { event, data: data ? JSON.parse(data) : null };
    });
  return { status: res.status, contentType: res.headers.get('content-type'), events, raw: text };
}

const json = async (res: Response) => ({ status: res.status, body: res.status === 204 ? null : ((await res.json()) as any) });

describe('POST /api/assistant/messages/stream', () => {
  it('streams start, linked deltas and a done message that matches them', async () => {
    const { status, contentType, events } = await streamAsk('What happens if Omar leaves?');
    expect(status).toBe(200);
    expect(contentType).toContain('text/event-stream');

    const kinds = events.map((e) => e.event);
    expect(kinds[0]).toBe('start');
    expect(kinds.at(-1)).toBe('done');
    expect(kinds.filter((k) => k === 'delta').length).toBeGreaterThan(0);

    const start = events[0].data;
    expect(start.userMessage).toMatchObject({ role: 'user', content: 'What happens if Omar leaves?' });

    const streamed = events.filter((e) => e.event === 'delta').map((e) => e.data.text).join('');
    const done = events.at(-1)!.data;
    expect(done.conversationId).toBe(start.conversationId);
    expect(done.message.answeredBy).toBe('graph');
    expect(done.message.content).toBe(streamed);
    // Citations arrive already linked, never as raw [[ids]].
    expect(streamed).toContain('[Billing Sync to Stripe](oba://automation/automation:n8n:101)');
    expect(streamed).not.toContain('[[');
    expect(done.message.sources.map((s: any) => s.entity.id)).toContain('automation:n8n:101');
  });

  it('saves both turns to the conversation, and a follow-up continues it', async () => {
    const first = await streamAsk('Which critical automations have no backup?');
    const id = first.events[0].data.conversationId;
    const second = await streamAsk('And what if Omar leaves?', id);
    expect(second.events[0].data.conversationId).toBe(id);

    const { body } = await json(await authedFetch(`${baseUrl}/api/assistant/conversations/${id}`));
    expect(body.messages.map((m: any) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
  });

  it("refuses someone else's conversation before streaming anything", async () => {
    const mine = await streamAsk('How are we doing?');
    const id = mine.events[0].data.conversationId;
    const other = await streamAsk('hi', id, 'user:chen');
    expect(other.status).toBe(404);
    expect(other.contentType).toContain('application/json');
  });

  it('refuses an empty question', async () => {
    expect((await streamAsk('   ')).status).toBe(400);
  });
});

describe('Renaming and deleting conversations', () => {
  it('the owner can rename; the new title shows in the list', async () => {
    const id = (await streamAsk('Who backs up payroll?')).events[0].data.conversationId;
    const renamed = await json(
      await authedFetch(`${baseUrl}/api/assistant/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '  Payroll backups  ' }),
      }),
    );
    expect(renamed.status).toBe(200);
    expect(renamed.body.conversation.title).toBe('Payroll backups');

    const list = await json(await authedFetch(`${baseUrl}/api/assistant/conversations`));
    expect(list.body.conversations.find((c: any) => c.id === id).title).toBe('Payroll backups');
  });

  it('refuses a blank title, and anyone but the owner gets 404', async () => {
    const id = (await streamAsk('What has no fallback?')).events[0].data.conversationId;
    const patch = (body: unknown, as = 'user:admin') =>
      authedFetch(
        `${baseUrl}/api/assistant/conversations/${id}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        as,
      );
    expect((await patch({ title: '   ' })).status).toBe(400);
    expect((await patch({ title: 'Mine now' }, 'user:chen')).status).toBe(404);
    expect((await authedFetch(`${baseUrl}/api/assistant/conversations/${id}`, { method: 'DELETE' }, 'user:chen')).status).toBe(404);
  });

  it('the owner can delete; it is gone from the list and can no longer be opened', async () => {
    const id = (await streamAsk('Delete me')).events[0].data.conversationId;
    expect((await authedFetch(`${baseUrl}/api/assistant/conversations/${id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await authedFetch(`${baseUrl}/api/assistant/conversations/${id}`)).status).toBe(404);
    const list = await json(await authedFetch(`${baseUrl}/api/assistant/conversations`));
    expect(list.body.conversations.some((c: any) => c.id === id)).toBe(false);
  });

  it('a viewer can manage their own conversations', async () => {
    const id = (await streamAsk('How are we doing?', null, 'user:maya')).events[0].data.conversationId;
    expect((await authedFetch(`${baseUrl}/api/assistant/conversations/${id}`, { method: 'DELETE' }, 'user:maya')).status).toBe(204);
  });
});

describe('safeCut', () => {
  it('holds back an unclosed citation and the last unfinished word', () => {
    expect(safeCut('Owned by [[person:om')).toBe('Owned by '.length);
    expect(safeCut('Owned by [[person:omar@acme.com]] and autom')).toBe('Owned by [[person:omar@acme.com]] and '.length);
    expect(safeCut('complete sentence. ')).toBe('complete sentence. '.length);
    expect(safeCut('partial')).toBe(0);
  });
});
