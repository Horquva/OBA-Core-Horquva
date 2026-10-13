// =============================================================================
// Horquva Continuity Platform — Ask OBA conversations (AI-01, B-14)
// =============================================================================
// Each signed-in user has their own conversation history, kept in Postgres
// (migration 007) with an in-memory working copy. Answers cite entities as [[id]];
// here those become chip links `[Name](oba://<kind>/<id>)` and the cited
// entities are returned as the answer's sources. Ids the graph doesn't know
// are left as plain text, never turned into a made-up name.
// =============================================================================

import crypto from 'node:crypto';
import type { ContinuityGraph } from '../domain/graph/index.js';
import { AskHorquvaEngine, type ChatTurn } from '../ai/gemini.js';
import { DataService, onDatabaseReload } from '../services/dataService.js';
import * as repo from '../repositories/assistantRepository.js';

export interface AssistantSource {
  label: string;
  detail: string;
  entity: { id: string; kind: string; name: string };
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: AssistantSource[];
  /** Assistant messages only: 'ai' = the model answered, 'graph' = computed directly from the graph. */
  answeredBy: 'ai' | 'graph' | null;
  createdAt: string;
}

export interface StoredConversation {
  id: string;
  ownerUserId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AssistantMessage[];
}

const conversations = new Map<string, StoredConversation>();
let engine: AskHorquvaEngine | null = null;
const getEngine = () => (engine ??= new AskHorquvaEngine());

// Postgres holds the history (migration 007); this map is the working copy.
onDatabaseReload(async () => {
  const all = await repo.loadAll();
  conversations.clear();
  for (const c of all) conversations.set(c.id, c);
});

const persist = (write: () => Promise<void>) => DataService.getInstance().queueWrite(write);
const header = ({ messages: _m, ...rest }: StoredConversation) => rest;

const KIND_DETAIL: Record<string, string> = {
  person: 'Person',
  automation: 'Automation',
  model: 'AI model',
  vendor: 'Vendor',
  app: 'App',
  process: 'Process',
  credential: 'Credential',
  group: 'Team',
};

const BARE_ID = /`?\b((?:person|automation|model|vendor|app|process|credential|group):[A-Za-z0-9@._:-]*[A-Za-z0-9])`?/g;

/** [[id]] and bare known ids become chip links; the cited entities become the sources. */
export function linkEntities(text: string, graph: ContinuityGraph): { content: string; sources: AssistantSource[] } {
  const cited = new Map<string, AssistantSource>();
  const toLink = (id: string): string | null => {
    const e = graph.getNode(id)?.entity;
    if (!e) return null;
    cited.set(e.id, { label: e.name, detail: KIND_DETAIL[e.kind] ?? e.kind, entity: { id: e.id, kind: e.kind, name: e.name } });
    return `[${e.name}](oba://${e.kind}/${e.id})`;
  };

  // 1. Explicit [[id]] citations.
  let content = text.replace(/\[\[([^\]\s]+)\]\]/g, (_m, id: string) => toLink(id) ?? id);
  // 2. Bare ids the model wrote anyway, skipping ones already inside a link.
  content = content.replace(BARE_ID, (m: string, id: string, offset: number, whole: string) => {
    const before = whole.slice(Math.max(0, offset - 24), offset);
    if (/oba:\/\/\w+\/$/.test(before)) return m;
    return toLink(id) ?? m;
  });
  return { content, sources: [...cited.values()] };
}

/**
 * Where streamed text can safely be cut: before an unclosed "[[" citation and before the
 * last, possibly unfinished word, so a citation or bare id is never split across pieces.
 */
export function safeCut(buffer: string): number {
  const open = buffer.lastIndexOf('[[');
  const cutAtCitation = open !== -1 && buffer.indexOf(']]', open) === -1 ? open : buffer.length;
  const lastSpace = Math.max(buffer.lastIndexOf(' '), buffer.lastIndexOf('\n'));
  const cutAtWord = lastSpace === -1 ? 0 : lastSpace + 1;
  return Math.min(cutAtCitation, cutAtWord);
}

function view(c: StoredConversation) {
  return { id: c.id, title: c.title, updatedAt: c.updatedAt };
}

export function listConversations(userId: string) {
  return [...conversations.values()]
    .filter((c) => c.ownerUserId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(view);
}

/** Only the owner can read a conversation; anyone else gets null (404). */
export function getConversation(userId: string, id: string) {
  const c = conversations.get(id);
  if (!c || c.ownerUserId !== userId) return null;
  return { conversation: view(c), messages: c.messages };
}

export class AssistantError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function owned(userId: string, id: string): StoredConversation {
  const c = conversations.get(id);
  if (!c || c.ownerUserId !== userId) throw new AssistantError(404, 'Conversation not found.');
  return c;
}

export const TITLE_MAX = 80;

export function renameConversation(userId: string, id: string, title: string) {
  const c = owned(userId, id);
  c.title = title.trim().slice(0, TITLE_MAX);
  persist(() => repo.saveConversation(header(c)));
  return view(c);
}

export function deleteConversation(userId: string, id: string): void {
  owned(userId, id);
  conversations.delete(id);
  persist(() => repo.deleteConversation(id));
}

const now = () => new Date().toISOString();

/** Opens (or continues) a conversation and records the question. Throws 404 for someone else's. */
function startTurn(userId: string, conversationId: string | null, query: string) {
  let convo: StoredConversation;
  if (conversationId) {
    convo = owned(userId, conversationId);
  } else {
    const at = now();
    convo = {
      id: crypto.randomUUID(),
      ownerUserId: userId,
      title: query.length > 60 ? `${query.slice(0, 57)}...` : query,
      createdAt: at,
      updatedAt: at,
      messages: [],
    };
    conversations.set(convo.id, convo);
  }
  const history: ChatTurn[] = convo.messages.map((m) => ({ role: m.role, content: m.content }));
  const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: 'user', content: query, sources: [], answeredBy: null, createdAt: now() };
  convo.messages.push(userMessage);
  convo.updatedAt = userMessage.createdAt;
  const snapshot = header(convo);
  persist(async () => {
    await repo.saveConversation(snapshot);
    await repo.insertMessage(snapshot.id, userMessage);
  });
  return { convo, history, userMessage };
}

function finishTurn(convo: StoredConversation, content: string, sources: AssistantSource[], answeredBy: 'ai' | 'graph') {
  const message: AssistantMessage = { id: crypto.randomUUID(), role: 'assistant', content, sources, answeredBy, createdAt: now() };
  convo.messages.push(message);
  convo.updatedAt = message.createdAt;
  const snapshot = header(convo);
  const saved = persist(async () => {
    await repo.saveConversation(snapshot);
    await repo.insertMessage(snapshot.id, message);
  });
  return { message, saved };
}

export async function sendMessage(userId: string, conversationId: string | null, query: string, graph: ContinuityGraph) {
  const { convo, history } = startTurn(userId, conversationId, query);
  const { answer, answeredBy } = await getEngine().askDetailed(query, graph, history);
  const { content, sources } = linkEntities(answer, graph);
  const { message } = finishTurn(convo, content, sources, answeredBy);
  return { conversationId: convo.id, message };
}

export type StreamEvent =
  | { type: 'start'; data: { conversationId: string; conversation: ReturnType<typeof view>; userMessage: AssistantMessage } }
  | { type: 'delta'; data: { text: string } }
  | { type: 'done'; data: { conversationId: string; conversation: ReturnType<typeof view>; message: AssistantMessage } };

/**
 * Starts the turn (throwing AssistantError before anything streams) and returns the event
 * stream. Deltas are already linked: citations become `[Name](oba://kind/id)` as they arrive.
 */
export function streamMessage(userId: string, conversationId: string | null, query: string, graph: ContinuityGraph): AsyncGenerator<StreamEvent> {
  const { convo, history, userMessage } = startTurn(userId, conversationId, query);

  return (async function* () {
    yield { type: 'start', data: { conversationId: convo.id, conversation: view(convo), userMessage } } as StreamEvent;

    const sources = new Map<string, AssistantSource>();
    let pending = '';
    let content = '';
    const emit = (text: string): StreamEvent | null => {
      if (!text) return null;
      const linked = linkEntities(text, graph);
      for (const s of linked.sources) sources.set(s.entity.id, s);
      content += linked.content;
      return { type: 'delta', data: { text: linked.content } };
    };

    const stream = getEngine().askStream(query, graph, history);
    let answeredBy: 'ai' | 'graph' = 'graph';
    while (true) {
      const next = await stream.next();
      if (next.done) {
        answeredBy = next.value;
        break;
      }
      pending += next.value;
      const cut = safeCut(pending);
      const ev = emit(pending.slice(0, cut));
      pending = pending.slice(cut);
      if (ev) yield ev;
    }
    const tail = emit(pending);
    if (tail) yield tail;

    const { message, saved } = finishTurn(convo, content, [...sources.values()], answeredBy);
    await saved.catch(() => undefined); // logged by DataService; the answer is still shown
    yield { type: 'done', data: { conversationId: convo.id, conversation: view(convo), message } } as StreamEvent;
  })();
}
