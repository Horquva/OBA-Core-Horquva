import { useState } from "react";

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
    <div>
      <div onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer" }}>
        How I got this {expanded ? "▴" : "▾"}
      </div>
      {expanded && (
        <div>
          {toolTrace.map((call) => (
            <div key={call.id} className="tool-trace-row">
              <span className="tool-name">{call.name}</span>
              <span className="tool-input">{call.label}</span>
              <span className="tool-summary">{call.summary ?? "—"}</span>
              <span className="tool-duration">{formatDuration(call.durationMs)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}