import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { AskView } from '@/features/ask/AskView';
import type { ChatMessage, Conversation } from '@/types/view';
import * as assistantApi from '@/lib/api/assistant';

// Mock Next.js navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

const sampleConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Billing automations review',
    updatedAt: '2026-10-01T12:00:00.000Z',
  },
  {
    id: 'conv-2',
    title: 'What if Omar leaves?',
    updatedAt: '2026-09-28T09:30:00.000Z',
  },
];

const sampleMessages: ChatMessage[] = [
  {
    id: 'm-1',
    role: 'user',
    content: 'Which critical systems have no backup?',
    sources: [],
    createdAt: '2026-10-01T12:00:00.000Z',
  },
  {
    id: 'm-2',
    role: 'assistant',
    content:
      '1 critical or high asset(s) have no backup on record:\n- [Billing Sync to Stripe](oba://automation/automation:n8n:101) (owner [Omar Farooq](oba://person/person:omar@acme.com))',
    sources: [
      { label: 'Billing Sync to Stripe', detail: 'Automation', entity: { id: 'automation:n8n:101', kind: 'automation', name: 'Billing Sync to Stripe' } },
      { label: 'Omar Farooq', detail: 'Person', entity: { id: 'person:omar@acme.com', kind: 'person', name: 'Omar Farooq' } },
    ],
    answeredBy: 'graph',
    createdAt: '2026-10-01T12:00:05.000Z',
  },
];

describe('Screen 8: Ask Horquva (Task 30)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mockSearchParams = new URLSearchParams();
    vi.spyOn(assistantApi, 'fetchConversations').mockResolvedValue(sampleConversations);
    vi.spyOn(assistantApi, 'fetchConversation').mockResolvedValue({
      conversation: sampleConversations[0],
      messages: sampleMessages,
    });
    vi.spyOn(assistantApi, 'sendMessage').mockResolvedValue({
      conversationId: 'conv-new',
      message: {
        id: 'resp-new',
        role: 'assistant',
        content: 'I analyzed our continuity records for that question.',
        sources: [],
        createdAt: new Date().toISOString(),
      },
    });
  });

  it('renders initial empty state with starter inquiries and conversation history', async () => {
    render(<AskView initialConversations={sampleConversations} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Ask Horquva' })).toBeInTheDocument();
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText('Billing automations review')).toBeInTheDocument();
    expect(screen.getByText('What if Omar leaves?')).toBeInTheDocument();
    expect(screen.getByText('How can I help with continuity today?')).toBeInTheDocument();
    expect(screen.getByText(/"Which critical automations have no backup\?"/)).toBeInTheDocument();
    // No invented names in the suggestions.
    expect(screen.queryByText(/Omar Haddad|Stripe Billing Pipeline/)).toBeNull();
  });

  it('submits query from input field and renders user & assistant response', async () => {
    render(<AskView initialConversations={sampleConversations} />);

    const input = screen.getByLabelText('Your query for Horquva');
    fireEvent.change(input, { target: { value: 'Who owns Customer Identity Sync?' } });

    const sendBtn = screen.getByRole('button', { name: 'Send' });
    fireEvent.click(sendBtn);

    expect(screen.getByText('Who owns Customer Identity Sync?')).toBeInTheDocument();

    await waitFor(() => {
      expect(assistantApi.sendMessage).toHaveBeenCalledWith(null, 'Who owns Customer Identity Sync?');
    });

    expect(await screen.findByText('I analyzed our continuity records for that question.')).toBeInTheDocument();
  });

  it('renders entity chips with no implied evidence grade, the mentioned list, and how it was answered', async () => {
    render(<AskView initialConversations={sampleConversations} initialMessages={sampleMessages} />);

    const log = screen.getByRole('log');
    expect(log).toHaveTextContent('1 critical or high asset(s) have no backup on record');
    expect(screen.getAllByRole('button', { name: /Inspect Billing Sync to Stripe/i }).length).toBe(2); // inline + mentioned list
    expect(log.textContent).not.toMatch(/confirmed|verified facts/i);
    expect(screen.getByRole('list', { name: 'Entities mentioned in this answer' })).toBeInTheDocument();
    expect(screen.getByText(/Computed directly from OBA's records/)).toBeInTheDocument();
  });

  it('a failed answer is shown as an error (no hidden second request), and retry does not duplicate the question', async () => {
    (assistantApi.sendMessage as any).mockRejectedValueOnce(new Error('offline'));
    render(<AskView initialConversations={sampleConversations} />);
    fireEvent.change(screen.getByLabelText('Your query for Horquva'), { target: { value: 'How are we doing?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(/Could not get an answer: offline/)).toBeInTheDocument();
    expect(assistantApi.sendMessage).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('I analyzed our continuity records for that question.')).toBeInTheDocument();
    expect(screen.getAllByText('How are we doing?')).toHaveLength(1);
  });

  it('says when past conversations could not be loaded instead of "No past conversations"', async () => {
    (assistantApi.fetchConversations as any).mockRejectedValue(new Error('down'));
    render(<AskView />);
    expect(await screen.findByText(/Could not load past conversations/)).toBeInTheDocument();
    expect(screen.queryByText('No past conversations.')).toBeNull();
  });

  it('opens asset drawer when clicking on an entity chip', async () => {
    render(
      <AskView
        initialConversations={sampleConversations}
        initialMessages={sampleMessages}
      />
    );

    const chip = screen.getAllByRole('button', { name: /Inspect Billing Sync to Stripe/i })[0];
    fireEvent.click(chip);

    // AssetDrawer renders with asset dialog
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('switches conversations when clicking on history rail item', async () => {
    render(<AskView initialConversations={sampleConversations} />);

    const convoBtn = screen.getByText('Billing automations review');
    fireEvent.click(convoBtn);

    await waitFor(() => {
      expect(assistantApi.fetchConversation).toHaveBeenCalledWith('conv-1');
    });

    expect(await screen.findByText('Which critical systems have no backup?')).toBeInTheDocument();
  });

  it('satisfies axe accessibility standards in AskView', async () => {
    const { container } = render(
      <AskView
        initialConversations={sampleConversations}
        initialMessages={sampleMessages}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
