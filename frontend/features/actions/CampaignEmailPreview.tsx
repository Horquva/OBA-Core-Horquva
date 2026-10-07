'use client';

import * as React from 'react';
import type { CampaignEmailPreview as Preview, CreateCampaignInput } from '@/types/view';
import { previewCampaignEmail } from '@/lib/api/confirmations';
import { toApiError } from '@/lib/api/client';
import { Skeleton } from '@/components/ui/states';

export interface CampaignEmailPreviewProps {
  input: Pick<CreateCampaignInput, 'dueDate' | 'introLine' | 'email' | 'tasks'>;
}

type State = { status: 'loading' } | { status: 'ready'; data: Preview } | { status: 'error'; message: string };

/**
 * The email one reviewer will receive, rendered by the backend with the same
 * code that sends it. Re-renders (debounced) as the admin edits the wording.
 */
export function CampaignEmailPreview({ input }: CampaignEmailPreviewProps) {
  const [state, setState] = React.useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = React.useState(0);
  const key = JSON.stringify(input);

  React.useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      previewCampaignEmail(JSON.parse(key)).then(
        (data) => !cancelled && setState({ status: 'ready', data }),
        (err) => !cancelled && setState({ status: 'error', message: toApiError(err).message })
      );
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, attempt]);

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Loading email preview" className="space-y-2">
        <Skeleton variant="text" className="w-1/2" />
        <Skeleton variant="card" className="h-64" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="rounded-control border border-st-fail/30 bg-st-fail/10 p-3 text-xs text-ink">
        Could not render the email preview: {state.message}{' '}
        <button
          type="button"
          onClick={() => {
            setState({ status: 'loading' });
            setAttempt((n) => n + 1);
          }}
          className="font-semibold underline cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { data } = state;
  return (
    <section aria-labelledby="email-preview-heading" className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="email-preview-heading" className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
          What {data.to.person.name} receives
        </h3>
        <span className="text-[11px] text-ink-3">
          {data.reviewerCount === 1
            ? 'The only reviewer.'
            : `Each of the ${data.reviewerCount} reviewers gets their own systems and link.`}
        </span>
      </div>
      <div className="rounded-card border border-rule overflow-hidden">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-rule bg-surface-sunken/50 px-3 py-2 text-[11px]">
          <dt className="text-ink-3">To</dt>
          <dd className="text-ink font-mono">{data.to.email}</dd>
          <dt className="text-ink-3">Subject</dt>
          <dd className="text-ink">{data.subject}</dd>
        </dl>
        {/* Sandboxed: no scripts, links can't navigate. */}
        <iframe title={`Email preview for ${data.to.person.name}`} sandbox="" srcDoc={data.html} className="h-[28rem] w-full bg-white" />
      </div>
    </section>
  );
}
