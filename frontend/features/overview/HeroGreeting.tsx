'use client';

import * as React from 'react';
import { useSession } from '@/lib/session';
import type { ChangeSummary } from '@/types/view';
import { formatDateTime } from '@/lib/format';

export interface HeroGreetingProps {
  changeSummary?: ChangeSummary | null;
  className?: string;
}

export function HeroGreeting({ changeSummary, className }: HeroGreetingProps) {
  const { session } = useSession();
  const firstName = session?.name ? session.name.split(' ')[0] : 'there';

  // Greeting by local time
  const [greeting, setGreeting] = React.useState('Good day');

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Deterministic summary sentence over counted facts per §8.1.
  // undefined = still loading; null = the summary failed to load (never claim "no changes" then).
  const getSummarySentence = (summary?: ChangeSummary | null): string => {
    if (summary === undefined) return 'Checking recent changes...';
    if (!summary) return "We couldn't check recent changes.";

    const sinceValid = !!summary.since && !Number.isNaN(new Date(summary.since).getTime());
    const sinceText = !sinceValid
      ? 'since your last visit'
      : summary.sinceKind === 'first_visit_window'
        ? `in the last ${Math.max(1, Math.round((Date.now() - new Date(summary.since!).getTime()) / 86_400_000))} days`
        : `since your last sign-in (${formatDateTime(summary.since!)})`;

    const parts: string[] = [];
    if (summary.peopleLeft > 0) {
      parts.push(`${summary.peopleLeft} ${summary.peopleLeft === 1 ? 'person' : 'people'} left`);
    }
    if (summary.backupsLost) {
      parts.push(`${summary.backupsLost} critical ${summary.backupsLost === 1 ? 'asset lost its' : 'assets lost their'} backup`);
    }
    if (summary.newlyExposed) {
      parts.push(`${summary.newlyExposed} ${summary.newlyExposed === 1 ? 'critical asset became exposed' : 'critical assets became exposed'}`);
    }
    if (summary.resolved > 0) {
      parts.push(`${summary.resolved} ${summary.resolved === 1 ? 'action was' : 'actions were'} resolved`);
    }

    // Only claim what is counted: untracked kinds (null) are not "no change".
    const untracked = summary.backupsLost === null || summary.newlyExposed === null;
    if (parts.length === 0) {
      return untracked
        ? `No departures or resolved actions ${sinceText}.`
        : `No changes ${sinceText}.`;
    }

    const sentence = `${parts.join(' and ')} ${sinceText}.`;
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  };

  return (
    <div className={className}>
      <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] font-normal tracking-tight text-ink leading-[1.05]">
        {greeting}, <span className="italic">{firstName}</span>.
      </h1>
      <p className="mt-2 text-base text-ink-2 leading-relaxed font-sans">
        {getSummarySentence(changeSummary)}
      </p>
    </div>
  );
}
