'use client';

type ToolStatusLineProps = {
  label: string;
};

export function ToolStatusLine({ label }: ToolStatusLineProps) {
  return (
    <div
      className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]"
    >
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
      Running {label}...
    </div>
  );
}

export default ToolStatusLine;