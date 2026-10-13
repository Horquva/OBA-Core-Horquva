import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { AskView } from '@/features/ask/AskView';
import { SessionProvider } from '@/lib/session';
import { ToastProvider } from '@/components/ui/Toast';
import type { ChatMessage, Conversation, Session } from '@/types/view';
import * as assistantApi from '@/lib/api/assistant';
import { ApiError } from '@/lib/api/client';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/',
  useSearchParams: () => mockSearchParams,
}));

// The drawer fetches asset details; here we only need to know it opened, and for what.
vi.mock('@/features/assets/AssetDrawer', () => ({
  AssetDrawer: ({ assetId, isOpen }: { assetId: string | null; isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Asset details">{assetId}</div> : null,
}));

const today = new Date().toISOString();
const conversations: Conversation[] = [
  { id: 'conv-1', title: 'Billing automations review', updatedAt: today },
  { id: 'conv-2', title: 'What if Omar leaves?', updatedAt: '2025-01-02T09:30:00.000Z' },
];

const answer: ChatMessage = {
  id: 'm-2',
  role: 'assistant',
  content: '1 critical asset has no backup:\n- [Billing Sync to Stripe](oba://automation/automation:n8n:101), owned by [Omar Farooq](oba://person/person:omar@acme.com)',
  sources: [
    { label: 'Billing Sync to Stripe', detail: 'Automation', entity: { id: 'automation:n8n:101', kind: 'automation', name: 'Billing Sync to Stripe' } },
    { label: 'Omar Farooq', detail: 'Person', entity: { id: 'person:omar@acme.com', kind: 'person', name: 'Omar Farooq' } },
  ],
  answeredBy: 'graph',
  createdAt: today,
};
const thread: ChatMessage[] = [{ id: 'm-1', role: 'user', content: 'Which critical systems have no backup?', sources: [], createdAt: today }, answer];

const session: Session = { userId: 'u1', name: 'Alex Rivera', email: 'alex@acme.com', role: 'admin', isHrManager: true, title: 'Ops lead' };

function renderAsk() {
  return render(
    <ToastProvider>
      <SessionProvider initialSession={session}>
        <AskView />
      </SessionProvider>
    </ToastProvider>,
  );
}

/** A stream that answers in two pieces, like the real SSE endpoint. */
function streamsAnswer(conversationId = 'conv-new') {
  return vi.spyOn(assistantApi, 'streamMessage').mockImplementation(async (_id, query, h) => {
    const userMessage: ChatMessage = { id: 'u-real', role: 'user', content: query, sources: [], createdAt: today };
    const conversation = { id: conversationId, title: query, updatedAt: today };
    h.onStart?.({ conversationId, conversation, userMessage });
    h.onDelta?.('1 critical asset has no backup:\n- ');
    h.onDelta?.('[Billing Sync to Stripe](oba://automation/automation:n8n:101)');
    h.onDone?.({ conversationId, conversation, message: { ...answer, id: 'm-new', content: '1 critical asset has no backup:\n- [Billing Sync to Stripe](oba://automation/automation:n8n:101)' } });
  });
}

describe('Ask OBA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    vi.spyOn(assistantApi, 'fetchConversations').mockResolvedValue(conversations);
    vi.spyOn(assistantApi, 'fetchConversation').mockResolvedValue({ conversation: conversations[0], messages: thread });
  });

  it('greets the user with a composer, suggestions and their chat history', async () => {
    const { container } = renderAsk();
    expect(screen.getByRole('heading', { level: 1, name: /Alex/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Ask OBA a question' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Which critical automations have no backup?' })).toBeInTheDocument();

    const history = within(screen.getAllByRole('complementary', { name: 'Chat history' })[0]);
    expect(await history.findByText('Billing automations review')).toBeInTheDocument();
    expect(history.getByText('Today')).toBeInTheDocument();
    expect(history.getByText('Older')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says when past chats could not be loaded, with a retry', async () => {
    vi.spyOn(assistantApi, 'fetchConversations').mockRejectedValue(new Error('offline'));
    renderAsk();
    expect(await screen.findByText(/couldn.t load your chats/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('streams an answer: question bubble, linked entities as chips, and the new chat in the URL', async () => {
    const stream = streamsAnswer();
    renderAsk();
    fireEvent.change(screen.getByRole('textbox', { name: 'Ask OBA a question' }), { target: { value: 'What has no backup?' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Ask OBA a question' }), { key: 'Enter' });

    expect(await screen.findByText('What has no backup?')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Billing Sync to Stripe/ })).toBeInTheDocument();
    expect(stream).toHaveBeenCalledWith(null, 'What has no backup?', expect.any(Object), expect.any(AbortSignal));
    expect(mockReplace).toHaveBeenCalledWith('/?c=conv-new', { scroll: false });
    // Raw citation syntax never shows.
    expect(screen.queryByText(/oba:\/\//)).not.toBeInTheDocument();
  });

  it('Shift+Enter does not send', () => {
    const stream = streamsAnswer();
    renderAsk();
    const box = screen.getByRole('textbox', { name: 'Ask OBA a question' });
    fireEvent.change(box, { target: { value: 'line one' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(stream).not.toHaveBeenCalled();
  });

  it('opens the chat named in the URL, renders markdown, and says how it was answered', async () => {
    mockSearchParams = new URLSearchParams('c=conv-1');
    renderAsk();
    expect(await screen.findByText('Which critical systems have no backup?')).toBeInTheDocument();
    // The '- ' bullet renders as a real list item, not literal text.
    expect(screen.getAllByRole('listitem').some((li) => li.textContent?.includes('owned by'))).toBe(true);
    expect(screen.getByText(/Answered directly from OBA.s records/)).toBeInTheDocument();
    expect(assistantApi.fetchConversation).toHaveBeenCalledWith('conv-1');

    // Mentioned entities, collapsed until asked for
    fireEvent.click(screen.getByRole('button', { name: /Mentioned/ }));
    expect(within(screen.getByRole('list', { name: 'Entities mentioned in this answer' })).getAllByRole('button')).toHaveLength(2);
  });

  it('clicking an asset opens its details; a person opens their page', async () => {
    mockSearchParams = new URLSearchParams('c=conv-1');
    renderAsk();
    fireEvent.click((await screen.findAllByRole('button', { name: /Billing Sync to Stripe/ }))[0]);
    expect(screen.getByRole('dialog', { name: 'Asset details' })).toHaveTextContent('automation:n8n:101');
    fireEvent.click(screen.getAllByRole('button', { name: /Omar Farooq/ })[0]);
    expect(mockPush).toHaveBeenCalledWith('/people/person%3Aomar%40acme.com');
  });

  it('a failed answer is shown as an error; Try again re-asks without repeating the question', async () => {
    const stream = vi.spyOn(assistantApi, 'streamMessage').mockRejectedValueOnce(new ApiError(502, 'The answer was interrupted.'));
    renderAsk();
    fireEvent.click(screen.getByRole('button', { name: 'How are we doing on continuity?' }));
    expect(await screen.findByText('The answer was interrupted.')).toBeInTheDocument();

    expect(stream).toHaveBeenCalledTimes(1);
    const retried = streamsAnswer('conv-x');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(retried).toHaveBeenCalledWith(null, 'How are we doing on continuity?', expect.any(Object), expect.any(AbortSignal)));
    expect(screen.getAllByText('How are we doing on continuity?').filter((el) => el.tagName !== 'BUTTON')).toHaveLength(1);
  });

  it('renames and deletes a chat from its menu', async () => {
    const rename = vi.spyOn(assistantApi, 'renameConversation').mockResolvedValue({ ...conversations[0], title: 'Billing review' });
    const remove = vi.spyOn(assistantApi, 'deleteConversation').mockResolvedValue(undefined);
    renderAsk();
    const history = within(screen.getAllByRole('complementary', { name: 'Chat history' })[0]);

    fireEvent.click(await history.findByRole('button', { name: 'More options for Billing automations review' }));
    fireEvent.click(history.getByRole('menuitem', { name: /Rename/ }));
    const input = history.getByRole('textbox', { name: 'Conversation title' });
    fireEvent.change(input, { target: { value: 'Billing review' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(rename).toHaveBeenCalledWith('conv-1', 'Billing review'));
    expect(await history.findByText('Billing review')).toBeInTheDocument();

    fireEvent.click(history.getByRole('button', { name: 'More options for What if Omar leaves?' }));
    fireEvent.click(history.getByRole('menuitem', { name: /Delete/ }));
    fireEvent.click(history.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('conv-2'));
    await waitFor(() => expect(history.queryByText('What if Omar leaves?')).not.toBeInTheDocument());
  });

  it('a question handed over in the URL is asked once', async () => {
    mockSearchParams = new URLSearchParams('q=Who owns billing?');
    const stream = streamsAnswer();
    renderAsk();
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));
    expect(stream.mock.calls[0][1]).toBe('Who owns billing?');
  });
});
