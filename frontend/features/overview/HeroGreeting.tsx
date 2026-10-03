'use client';

import * as React from 'react';
import { useSession } from '@/lib/session';
import type { ChangeSummary } from '@/types/view';

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

  // Deterministic summary sentence over counted facts per §8.1
  const getSummarySentence = (summary?: ChangeSummary | null): string => {
    if (summary === undefined) return 'Checking recent changes...';
    if (!summary) return 'No changes since your last visit.';

    const parts: string[] = [];
    if (summary.peopleLeft > 0) {
      parts.push(`${summary.peopleLeft} ${summary.peopleLeft === 1 ? 'person' : 'people'} left`);
    }
    if (summary.backupsLost > 0) {
      parts.push(`${summary.backupsLost} critical ${summary.backupsLost === 1 ? 'asset lost its' : 'assets lost their'} backup`);
    }
    if (summary.newlyExposed > 0) {
      parts.push(`${summary.newlyExposed} ${summary.newlyExposed === 1 ? 'critical asset became exposed' : 'critical assets became exposed'}`);
    }

    if (parts.length === 0) {
      return 'No changes since your last visit.';
    }

    const sinceText = summary.since ? `Since ${summary.since}, ` : 'Since your last visit, ';
    return `${sinceText}${parts.join(' and ')}.`;
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
