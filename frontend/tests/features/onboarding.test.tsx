import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { ConnectionsOverview, OnboardingStatus, Session, UserView } from '@/types/view';
import { SessionProvider } from '@/lib/session';
import { OnboardingGuideBanner } from '@/components/onboarding/OnboardingGuideBanner';
import { OnboardingWizardModal } from '@/components/onboarding/OnboardingWizardModal';
import { UsersView } from '@/features/settings/UsersView';
import * as onboardingApi from '@/lib/api/onboarding';
import * as settingsApi from '@/lib/api/settings';

const admin: Session = { userId: 'user:admin', name: 'Dana Okafor', email: 'dana@uni.edu', role: 'admin', isHrManager: true, title: null };
const viewer: Session = { ...admin, userId: 'user:v', role: 'viewer', isHrManager: false };

const status = (over: Partial<OnboardingStatus> = {}): OnboardingStatus => ({
  store: 'database',
  dismissedAt: null,
  completed: false,
  steps: { organization: true, directory: false, automations: true, baseline: false },
  ...over,
});

const noConnections: ConnectionsOverview = { store: 'database', connections: [], sources: [] };
const withSession = (ui: React.ReactElement, session: Session = admin) => render(<SessionProvider initialSession={session}>{ui}</SessionProvider>);

beforeEach(() => {
  vi.spyOn(settingsApi, 'fetchOrganization').mockResolvedValue({ companyName: 'Your organization', logoUrl: null, minGroupSize: 5, departmentMappings: [] });
  vi.spyOn(settingsApi, 'fetchConnections').mockResolvedValue(noConnections);
});
afterEach(() => vi.restoreAllMocks());

describe('OnboardingGuideBanner', () => {
  it('shows real progress to admins and can be dismissed', async () => {
    vi.spyOn(onboardingApi, 'fetchOnboardingStatus').mockResolvedValue(status());
    const dismiss = vi.spyOn(onboardingApi, 'dismissOnboarding').mockResolvedValue({ dismissedAt: '2026-10-12T00:00:00Z' });
    const { container } = withSession(<OnboardingGuideBanner />);

    expect(await screen.findByText('Setup guide: 2 of 4 done')).toBeInTheDocument();
    expect(screen.getAllByText('Done:', { exact: false, selector: '.sr-only' })).toHaveLength(2); // organization + automations
    expect((await axe(container))).toHaveNoViolations();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(dismiss).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/Setup guide/)).toBeNull());
  });

  it('keeps the wizard on its step when saving reloads the banner (regression)', async () => {
    const fetchStatus = vi.spyOn(onboardingApi, 'fetchOnboardingStatus').mockResolvedValue(status({ steps: { organization: false, directory: false, automations: false, baseline: false } }));
    vi.spyOn(settingsApi, 'saveOrganization').mockResolvedValue();
    withSession(<OnboardingGuideBanner />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start setup' }));
    fireEvent.change(await screen.findByLabelText('Organization name'), { target: { value: 'Northwind University' } });
    fireEvent.click(screen.getByRole('button', { name: /Next Step/ }));

    // Saving re-fetches the banner's status; the wizard must not restart at step 1.
    await waitFor(() => expect(fetchStatus.mock.calls.length).toBeGreaterThan(1));
    expect(await screen.findByText('Connect your directory', { selector: 'h2' })).toBeInTheDocument();
  });

  it.each([
    ['a viewer', viewer, status()],
    ['a dismissed guide', admin, status({ dismissedAt: '2026-10-01T00:00:00Z' })],
    ['a completed setup', admin, status({ completed: true })],
    ['no database (demo data)', admin, status({ store: 'unavailable' })],
  ])('stays hidden for %s', async (_label, session, s) => {
    const fetch = vi.spyOn(onboardingApi, 'fetchOnboardingStatus').mockResolvedValue(s);
    withSession(<OnboardingGuideBanner />, session);
    if (session.role === 'admin') await waitFor(() => expect(fetch).toHaveBeenCalled());
    else expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/Setup guide/)).toBeNull();
  });
});

describe('OnboardingWizardModal', () => {
  it('walks org → directory (skipped) → n8n → first sync, creating each thing once', async () => {
    const saveOrg = vi.spyOn(settingsApi, 'saveOrganization').mockResolvedValue();
    const create = vi.spyOn(settingsApi, 'createConnection').mockResolvedValue({ id: 'conn_1' });
    const sync = vi.spyOn(settingsApi, 'syncConnection').mockResolvedValue({ syncRunId: 'r1', status: 'queued' });
    const onChanged = vi.fn();
    render(<OnboardingWizardModal onClose={vi.fn()} onChanged={onChanged} />);

    // 1. Organization: the placeholder name is not offered as an answer.
    const next = () => screen.getByRole('button', { name: /Next Step|Save & continue|Skip for now|Finish/ });
    expect(next()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Organization name'), { target: { value: 'Northwind University' } });
    fireEvent.click(next());
    await waitFor(() => expect(saveOrg).toHaveBeenCalledWith(expect.objectContaining({ companyName: 'Northwind University' })));

    // 2. Directory: nothing entered → skip.
    expect(await screen.findByRole('button', { name: 'Skip for now' })).toBeInTheDocument();
    fireEvent.click(next());

    // 3. Automations: n8n credentials.
    fireEvent.change(await screen.findByLabelText('n8n URL'), { target: { value: 'https://n8n.uni.edu' } });
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'k' } });
    const saved: ConnectionsOverview = {
      store: 'database',
      sources: [],
      connections: [{ id: 'conn_1', type: 'n8n', name: 'n8n', status: 'disconnected', lastSyncAt: null, lastError: null, lastRun: null }],
    };
    vi.mocked(settingsApi.fetchConnections).mockResolvedValue(saved);
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ type: 'n8n', name: 'n8n', config: { baseUrl: 'https://n8n.uni.edu', apiKey: 'k' } }));

    // Back and forward again does not save a second connection.
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Already connected')).toBeInTheDocument();
    fireEvent.click(next());

    // 4. First sync: queued, then the list shows the finished run.
    vi.mocked(settingsApi.fetchConnections).mockResolvedValue({
      ...saved,
      sources: [{ source: 'connector:n8n', relationships: 12, facts: 30, latestAt: null }],
      connections: [{ ...saved.connections[0], status: 'connected', lastSyncAt: '2026-10-12T10:00:00Z', lastRun: { status: 'completed', startedAt: '', completedAt: '', stats: { entitiesUpserted: 9, edgesCreated: 12, edgesClosed: 0, factsCreated: 30, factsVersioned: 0 }, error: null } }],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Run first sync' }));
    await waitFor(() => expect(sync).toHaveBeenCalledWith('conn_1'));
    expect(await screen.findByText(/Done\. 12 relationships on record/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish' })).toBeEnabled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalled();
  });
});

describe('UsersView invites', () => {
  const users: UserView[] = [{ id: 'user:admin', name: 'Dana Okafor', email: 'dana@uni.edu', role: 'admin', isHrManager: true }];

  it('invites someone with a role, and removes access after confirmation', async () => {
    vi.spyOn(settingsApi, 'fetchUsers').mockResolvedValue(users);
    const invite = vi.spyOn(settingsApi, 'inviteUser').mockResolvedValue({ id: 'user:2', name: 'Lina Haddad', email: 'lina@uni.edu', role: 'reviewer', isHrManager: false });
    const remove = vi.spyOn(settingsApi, 'removeUser').mockResolvedValue();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<UsersView initialUsers={users} />);

    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'lina@uni.edu' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Lina Haddad' } });
    fireEvent.change(screen.getByLabelText('Role', { selector: '#invite-role' }), { target: { value: 'reviewer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    await waitFor(() => expect(invite).toHaveBeenCalledWith({ email: 'lina@uni.edu', name: 'Lina Haddad', role: 'reviewer', isHrManager: false }));
    expect(await screen.findByText('Lina Haddad can now sign in as reviewer.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove access for Dana Okafor' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('user:admin'));
  });
});
