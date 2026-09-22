import AgentPanel from '@/components/agent/AgentPanel';

const AGENT_ENABLED = process.env.NEXT_PUBLIC_AGENT_ENABLED === 'true';

// Holds no conversation state of its own -- that lives in AgentProvider,
// mounted once in AppShell so it survives navigation away from here (D-77).
// This route only supplies the fullscreen container.
export default function HomePage() {
  if (!AGENT_ENABLED) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            OBA Agent
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            The agent is not enabled for this environment yet.
          </p>
        </div>
      </main>
    );
  }

  return <AgentPanel slot="route" />;
}
