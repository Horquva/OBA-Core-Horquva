import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ToolCall {
  id: string;
  name: string;
  label: string;
  status: 'running' | 'done';
  summary: string | null;
  durationMs: number | null;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ToolTrace({ toolTrace }: { toolTrace: ToolCall[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
      >
        How I got this
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div className="mt-1.5 flex flex-col gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-2.5">
          {toolTrace.map((call) => (
            <div
              key={call.id}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className="min-w-0 flex-1">
                <span className="font-medium text-[var(--text-secondary)]">{call.name}</span>
                {call.label !== call.name && (
                  <span className="text-[var(--text-tertiary)]"> · {call.label}</span>
                )}
                <span className="block truncate text-[var(--text-tertiary)]">{call.summary ?? "—"}</span>
              </span>
              <span className="flex-shrink-0 text-[var(--text-tertiary)]">{formatDuration(call.durationMs)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}