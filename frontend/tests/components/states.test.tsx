import { render, screen, fireEvent, act } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { ToastProvider, useToast } from '@/components/ui/Toast';

function ToastProbe() {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast({ title: 'Saved successfully', variant: 'success' })}>
      Trigger Toast
    </button>
  );
}

describe('Data States & Toast', () => {
  it('renders Skeleton with shimmer classes and passes axe', async () => {
    const { container } = render(
      <div>
        <Skeleton variant="text" />
        <Skeleton variant="card" />
        <Skeleton variant="row" />
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders ErrorState with retry callback and last sync time', async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <ErrorState
        message="We couldn't reach OBA."
        lastLoadedAt="2026-10-01T08:42:00Z"
        onRetry={onRetry}
      />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText("We couldn't reach OBA.")).toBeInTheDocument();
    expect(screen.getByText(/Last successful load/)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledOnce();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders EmptyState with action button', async () => {
    const onAction = vi.fn();
    const { container } = render(
      <EmptyState
        title="No connections configured"
        description="Connect your workflow engines and directories to begin monitoring continuity."
        actionLabel="Connect n8n"
        onAction={onAction}
      />
    );
    // Default heading is h2 since the a11y sweep (Task 34); callers nest it with headingLevel.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('No connections configured');
    expect(screen.getByText(/Connect your workflow engines/)).toBeInTheDocument();

    const actionBtn = screen.getByRole('button', { name: 'Connect n8n' });
    fireEvent.click(actionBtn);
    expect(onAction).toHaveBeenCalledOnce();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders and dismisses toast notifications', () => {
    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>
    );
    const btn = screen.getByRole('button', { name: 'Trigger Toast' });
    act(() => {
      fireEvent.click(btn);
    });
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText('Dismiss toast');
    act(() => {
      fireEvent.click(dismissBtn);
    });
    expect(screen.queryByText('Saved successfully')).not.toBeInTheDocument();
  });
});
