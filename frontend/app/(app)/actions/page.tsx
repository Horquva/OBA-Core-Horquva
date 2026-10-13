import * as React from 'react';
import { ActionsView } from '@/features/actions/ActionsView';

/** ?id= highlights one action (Overview links); ?status= sets the filter; ?tab=confirmations opens that tab. */
export default async function ActionsPage({ searchParams }: { searchParams: Promise<{ id?: string; status?: string; tab?: string }> }) {
  const { id, status, tab } = await searchParams;
  return (
    <ActionsView
      key={`${id ?? ''}-${status ?? ''}-${tab ?? ''}`}
      highlightId={id ?? null}
      initialStatus={status ?? null}
      defaultTab={tab === 'confirmations' ? 'confirmations' : 'actions'}
    />
  );
}
