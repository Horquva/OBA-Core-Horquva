// =============================================================================
// Ask OBA history survives a restart (migration 007): conversations, both turns
// of each exchange, renames and deletes are all rebuilt from Postgres.
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { DataService } from '../../src/services/dataService.js';
import { query } from '../../src/db/client.js';
import { authedFetch } from '../helpers/session.js';
import { resetDatabase, startServer, json } from './db.js';

let server: http.Server;
let baseUrl: string;

const restart = () => DataService.initialize({ ...process.env, DEMO_MODE: 'true' });

beforeAll(async () => {
  await resetDatabase();
  await restart();
  ({ server, baseUrl } = await startServer());
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

async function streamAsk(query: string, conversationId: string | null = null): Promise<string> {
  const res = await authedFetch(`${baseUrl}/api/assistant/messages/stream`, json('POST', { conversationId, query }));
  expect(res.status).toBe(200);
  const text = await res.text();
  return JSON.parse(/^data: (.+)$/m.exec(text)![1]).conversationId;
}

describe('Ask OBA conversations on Postgres', () => {
  it('keeps conversations, messages, renames and deletes across a restart', async () => {
    const kept = await streamAsk('What happens if Omar leaves?');
    await streamAsk('And who could back him up?', kept);
    const dropped = await streamAsk('Throwaway question');

    expect((await authedFetch(`${baseUrl}/api/assistant/conversations/${kept}`, json('PATCH', { title: 'Omar leaving' }))).status).toBe(200);
    expect((await authedFetch(`${baseUrl}/api/assistant/conversations/${dropped}`, { method: 'DELETE' })).status).toBe(204);

    await restart();

    const list = (await (await authedFetch(`${baseUrl}/api/assistant/conversations`)).json()) as any;
    expect(list.conversations.map((c: any) => [c.id, c.title])).toEqual([[kept, 'Omar leaving']]);

    const convo = (await (await authedFetch(`${baseUrl}/api/assistant/conversations/${kept}`)).json()) as any;
    expect(convo.messages.map((m: any) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    expect(convo.messages[1].content).toContain('(oba://automation/automation:n8n:101)');
    expect(convo.messages[1].sources.length).toBeGreaterThan(0);

    // Deleting a conversation removes its messages too.
    const orphans = await query(`SELECT COUNT(*)::int n FROM assistant_message WHERE conversation_id = $1`, [dropped]);
    expect(orphans.rows[0].n).toBe(0);
  });
});
