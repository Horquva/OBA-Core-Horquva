'use client';

import * as React from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { useSession } from '@/lib/session';
import { useToast } from '@/components/ui/Toast';
import { downloadFile, toApiError } from '@/lib/api/client';
import type { ChangeSummary } from '@/types/view';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface OverviewHeaderProps {
  /** undefined = still loading; null = the summary failed to load. */
  changeSummary?: ChangeSummary | null;
  className?: string;
}

interface ChangeChip {
  key: string;
  label: string;
  href: string;
  tone: 'fail' | 'pass' | 'attention';
}

const TONE_DOT: Record<ChangeChip['tone'], string> = {
  fail: 'bg-st-fail',
  pass: 'bg-st-pass',
  attention: 'bg-amber',
};

function sinceLabel(summary: ChangeSummary): string {
  const sinceValid = !!summary.since && !Number.isNaN(new Date(summary.since).getTime());
  if (!sinceValid) return 'Since your last visit';
  if (summary.sinceKind === 'first_visit_window') {
    const days = Math.max(1, Math.round((Date.now() - new Date(summary.since!).getTime()) / 86_400_000));
    return `In the last ${days} days`;
  }
  return `Since your last sign-in, ${formatDateTime(summary.since!)}`;
}

/** One chip per counted change; untracked kinds (null) and zero counts produce none. */
function changeChips(summary: ChangeSummary): ChangeChip[] {
  const chips: ChangeChip[] = [];
  if (summary.peopleLeft > 0) {
    chips.push({
      key: 'left',
      label: `${summary.peopleLeft} ${summary.peopleLeft === 1 ? 'person' : 'people'} left`,
      href: '/departures',
      tone: 'attention',
    });
  }
  if (summary.backupsLost) {
    chips.push({ key: 'backups', label: `${summary.backupsLost} lost their backup`, href: '/assets', tone: 'fail' });
  }
  if (summary.newlyExposed) {
    chips.push({ key: 'exposed', label: `${summary.newlyExposed} newly exposed`, href: '/assets', tone: 'fail' });
  }
  if (summary.resolved > 0) {
    chips.push({ key: 'resolved', label: `${summary.resolved} resolved`, href: '/actions', tone: 'pass' });
  }
  return chips;
}

function ChangeLine({ summary }: { summary?: ChangeSummary | null }) {
  if (summary === undefined) {
    return (
      <div className="flex items-center gap-2" aria-label="Checking recent changes">
        <span className="skeleton h-4 w-40" />
        <span className="skeleton h-7 w-28 rounded-full" />
        <span className="skeleton h-7 w-24 rounded-full" />
      </div>
    );
  }
  if (summary === null) {
    return <p className="type-meta text-ink-3">We couldn&apos;t check recent changes.</p>;
  }

  const chips = changeChips(summary);
  const since = sinceLabel(summary);

  if (chips.length === 0) {
    // Only claim what is counted: untracked kinds (null) are not "no change".
    const untracked = summary.backupsLost === null || summary.newlyExposed === null;
    return (
      <p className="type-meta text-ink-3">
        {untracked ? 'No departures or resolved actions' : 'No changes'} {since.charAt(0).toLowerCase() + since.slice(1)}.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="type-meta text-ink-3">{since}</span>
      <ul className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={chip.href}
              className="type-meta inline-flex h-7 items-center gap-2 rounded-full border border-rule bg-surface pl-2.5 pr-3 font-medium text-ink-2 tabular-nums transition-colors hover:border-ink-3 hover:text-ink"
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[chip.tone])} aria-hidden="true" />
              {chip.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OverviewHeader({ changeSummary, className }: OverviewHeaderProps) {
  const { session } = useSession();
  const firstName = session?.name ? session.name.split(' ')[0] : 'there';

  // Greeting and date come from the viewer's clock, so they are set after mount (no hydration mismatch).
  const [greeting, setGreeting] = React.useState('Welcome back');
  const [today, setToday] = React.useState<string | null>(null);

  React.useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
    setToday(new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(now));
  }, []);

  const { toast } = useToast();
  const [downloading, setDownloading] = React.useState(false);
  const downloadReport = async () => {
    setDownloading(true);
    try {
      await downloadFile('/api/reports/executive-scan/pdf', 'continuity-report.pdf');
    } catch (e) {
      toast({ title: "We couldn't create the PDF", description: toApiError(e).message, variant: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <header className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="type-meta h-[1.125rem] text-ink-3">{today}</p>
          <h1 className="type-title mt-3 text-ink">
            {greeting}, {firstName}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={downloadReport}
            disabled={downloading}
            aria-busy={downloading || undefined}
            className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-control border border-rule bg-surface px-3 text-[13px] font-medium text-ink shadow-panel transition-colors hover:border-ink-3 disabled:cursor-wait disabled:opacity-60"
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5 text-ink-3" />
            {downloading ? 'Preparing PDF…' : 'Download PDF'}
          </button>
          <Link
            href="/briefing"
            className="group inline-flex h-8 items-center gap-2 rounded-control border border-rule bg-surface px-3 text-[13px] font-medium text-ink shadow-panel transition-colors hover:border-ink-3"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />
            Read this week&apos;s briefing
            <span aria-hidden="true" className="text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
      <ChangeLine summary={changeSummary} />
    </header>
  );
}
