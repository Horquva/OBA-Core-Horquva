// =============================================================================
// Horquva Continuity Platform — Ask OBA conversations (AI-01, B-14)
// =============================================================================
// Each signed-in user has their own conversation history (in memory, like the
// rest of the MVP's state; lost on restart). Answers cite entities as [[id]];
// here those become chip links `[Name](oba://<kind>/<id>)` and the cited
// entities are returned as the answer's sources. Ids the graph doesn't know
// are left as plain text, never turned into a made-up name.
// =============================================================================

import crypto from 'node:crypto';
import type { ContinuityGraph } from '../domain/graph/index.js';
import { AskHorquvaEngine } from '../ai/gemini.js';

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

interface StoredConversation {
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

export async function sendMessage(userId: string, conversationId: string | null, query: string, graph: ContinuityGraph) {
  const now = () => new Date().toISOString();
  let convo: StoredConversation;
  if (conversationId) {
    const found = conversations.get(conversationId);
    if (!found || found.ownerUserId !== userId) throw new AssistantError(404, 'Conversation not found.');
    convo = found;
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

  convo.messages.push({ id: crypto.randomUUID(), role: 'user', content: query, sources: [], answeredBy: null, createdAt: now() });
  const { answer, answeredBy } = await getEngine().askDetailed(query, graph);
  const { content, sources } = linkEntities(answer, graph);
  const message: AssistantMessage = { id: crypto.randomUUID(), role: 'assistant', content, sources, answeredBy, createdAt: now() };
  convo.messages.push(message);
  convo.updatedAt = message.createdAt;
  return { conversationId: convo.id, message };
}
