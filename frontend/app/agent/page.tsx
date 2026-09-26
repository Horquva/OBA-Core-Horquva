import AgentPanel from '@/components/agent/AgentPanel';
import { AgentProvider } from '@/components/agent/AgentProvider';

const AGENT_ENABLED = process.env.NEXT_PUBLIC_AGENT_ENABLED === 'true';

// A real, dedicated route (reached from the sidebar like any other page),
// not a floating overlay glued on top of whatever page you happened to be
// on. AgentProvider is scoped to just this page -- conversation history now
// lives in Supabase (agent/persistence.js), not client state, so nothing is
// lost by mounting/unmounting this per navigation the way the old
// every-route overlay avoided by staying mounted permanently (D-77, now
// retired along with it).
export default function AgentPage() {
  if (!AGENT_ENABLED) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            OBA Agent
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            The agent is not enabled for this environment yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AgentProvider>
      <AgentPanel />
    </AgentProvider>
  );
}
