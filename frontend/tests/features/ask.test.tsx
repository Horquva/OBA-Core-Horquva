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
    title: 'Omar Haddad departure blast radius',
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
      'I examined verified system records. Currently, [Stripe Billing Pipeline](oba://asset/w-billing?grade=confirmed) has no qualified secondary backup.',
    sources: [
      {
        label: 'Stripe Billing Pipeline backup',
        detail: 'backup: none (Confirmed by Manual check)',
      },
    ],
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
    vi.spyOn(assistantApi, 'askOnce').mockResolvedValue({
      id: 'resp-fallback',
      role: 'assistant',
      content: 'I analyzed our records via fallback.',
      sources: [],
      createdAt: new Date().toISOString(),
    });
  });

  it('renders initial empty state with starter inquiries and conversation history', async () => {
    render(<AskView initialConversations={sampleConversations} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Ask Horquva' })).toBeInTheDocument();
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText('Billing automations review')).toBeInTheDocument();
    expect(screen.getByText('Omar Haddad departure blast radius')).toBeInTheDocument();
    expect(screen.getByText('How can I help with continuity today?')).toBeInTheDocument();
    expect(screen.getByText(/"Which critical automations have no secondary backup\?"/)).toBeInTheDocument();
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

  it('renders entity chips and verified sources accordion for assistant messages', async () => {
    render(
      <AskView
        initialConversations={sampleConversations}
        initialMessages={sampleMessages}
      />
    );

    // Entity chip parsed from markdown
    expect(screen.getByText('Stripe Billing Pipeline')).toBeInTheDocument();
    expect(screen.getByText('(automation)')).toBeInTheDocument();

    // Sources accordion
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('(1 verified facts cited)')).toBeInTheDocument();

    // Expand sources
    const sourcesBtn = screen.getByRole('button', { name: /Sources/ });
    fireEvent.click(sourcesBtn);

    expect(screen.getByText(/backup: none \(Confirmed by Manual check\)/)).toBeInTheDocument();
  });

  it('opens asset drawer when clicking on an entity chip', async () => {
    render(
      <AskView
        initialConversations={sampleConversations}
        initialMessages={sampleMessages}
      />
    );

    const chip = screen.getByRole('button', { name: /Inspect Stripe Billing Pipeline/i });
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
