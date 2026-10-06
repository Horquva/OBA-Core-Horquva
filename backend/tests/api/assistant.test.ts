// =============================================================================
// Horquva Continuity Platform — Ask OBA (Sprint 2 D12b, AI-01)
// =============================================================================
// No AI model in tests (GEMINI_API_KEY is blanked in vitest.config.ts), so every
// answer is computed from the graph. Hand-checked against handCheckableTruth.json:
//   Omar owns 101 (critical, 500/wk) + 102 (critical, 120/wk), no backups.
//   105 calls GPT-4o and runs on David's personal credentials (2,500/wk).
//   Critical/high without backup: 101, 102, 104. Covered: 103 (Chen backs it up).
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { DataService } from '../../src/services/dataService.js';
import { linkEntities } from '../../src/assistant/assistantService.js';
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

async function ask(query: string, conversationId: string | null = null, as = 'user:admin') {
  const res = await authedFetch(
    `${baseUrl}/api/assistant/messages`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, query }) },
    as,
  );
  return { status: res.status, body: (await res.json()) as any };
}

const ids = (sources: any[]) => sources.map((s) => s.entity.id).sort();

describe('Ask OBA answers from the graph', () => {
  it('"what if Omar leaves" runs the departure simulation and cites what it found', async () => {
    const { status, body } = await ask('What happens if Omar leaves?');
    expect(status).toBe(200);
    expect(body.message.answeredBy).toBe('graph');
    expect(body.message.content).toContain('[Billing Sync to Stripe](oba://automation/automation:n8n:101)');
    expect(body.message.content).toContain('Weekly runs affected: 620');
    expect(ids(body.message.sources)).toEqual(['automation:n8n:101', 'automation:n8n:102', 'person:omar@acme.com']);
  });

  it('"what breaks if GPT-4o goes down" walks dependants, not dependencies', async () => {
    const { body } = await ask('What breaks if OpenAI GPT-4o goes down?');
    expect(body.message.content).toContain('[AI Ticket Routing](oba://automation/automation:n8n:105)');
    expect(body.message.content).toContain('2,500 runs/week');
  });

  it('lists critical assets without a backup', async () => {
    const { body } = await ask('Which critical automations have no backup?');
    expect(body.message.content).toMatch(/^3 critical or high asset\(s\) have no backup/);
    expect(ids(body.message.sources)).toEqual(
      expect.arrayContaining(['automation:n8n:101', 'automation:n8n:102', 'automation:n8n:104']),
    );
    expect(body.message.content).not.toContain('CRM Lead Enrichment'); // 103 is backed up by Chen
  });

  it('lists automations on personal credentials', async () => {
    const { body } = await ask('Which workflows run on personal credentials?');
    expect(body.message.content).toContain('[AI Ticket Routing](oba://automation/automation:n8n:105) runs on the personal credentials of [David Miller](oba://person/person:david@acme.com)');
  });

  it('defaults to the honest headline, and admits when a person is not found', async () => {
    expect((await ask('How are we doing?')).body.message.content).toMatch(/^1 of 4 critical assets are fully covered\./);
    expect((await ask('What if Zed Nobody leaves?')).body.message.content).toMatch(/couldn't find that person/);
  });
});

describe('Ask OBA conversations', () => {
  it('keeps history per user; others cannot read it', async () => {
    const first = await ask('How are we doing?');
    const id = first.body.conversationId;
    const second = await ask('Which critical automations have no backup?', id);
    expect(second.body.conversationId).toBe(id);

    const mine = (await (await authedFetch(`${baseUrl}/api/assistant/conversations/${id}`)).json()) as any;
    expect(mine.messages.map((m: any) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    expect(mine.conversation.title).toBe('How are we doing?');

    expect((await authedFetch(`${baseUrl}/api/assistant/conversations/${id}`, {}, 'user:chen')).status).toBe(404);
    expect((await ask('hi', id, 'user:chen')).status).toBe(404);
    const chens = (await (await authedFetch(`${baseUrl}/api/assistant/conversations`, {}, 'user:chen')).json()) as any;
    expect(chens.conversations.find((c: any) => c.id === id)).toBeUndefined();
  });

  it('any signed-in role can ask; empty questions are refused', async () => {
    expect((await ask('How are we doing?', null, 'user:maya')).status).toBe(200);
    expect((await ask('   ')).status).toBe(400);
  });
});

describe('linkEntities', () => {
  it('links known ids, leaves unknown ones as plain text', () => {
    const graph = DataService.getInstance().getGraph();
    const { content, sources } = linkEntities('See [[automation:n8n:101]] and [[automation:n8n:999]] and `model:openai:gpt-4o`.', graph);
    expect(content).toBe(
      'See [Billing Sync to Stripe](oba://automation/automation:n8n:101) and automation:n8n:999 and [OpenAI GPT-4o](oba://model/model:openai:gpt-4o).',
    );
    expect(sources.map((s) => s.label)).toEqual(['Billing Sync to Stripe', 'OpenAI GPT-4o']);
  });
});
