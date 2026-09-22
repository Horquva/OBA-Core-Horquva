import { redirect } from 'next/navigation';

// AgentPanel now mounts once, globally, from AppShell and opens as its own
// full-screen takeover from any route (no longer a route-specific
// "fullscreen at /" special case -- see AgentPanel.tsx). "/" doesn't need to
// host it any more, so this goes back to being a normal landing redirect.
export default function HomePage() {
  redirect('/dashboard');
}
