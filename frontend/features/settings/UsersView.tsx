'use client';

import * as React from 'react';
import type { UserView, Role } from '@/types/view';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchUsers, updateUser, inviteUser, removeUser } from '@/lib/api/settings';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { useOptionalSession } from '@/lib/session';
import { SectionHeader, Notice } from './SectionHeader';
import { toApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';

export interface UsersViewProps {
  initialUsers?: UserView[];
}

export function UsersView({ initialUsers }: UsersViewProps) {
  const usersResource = useResource<UserView[]>(
    'settings-users',
    fetchUsers,
  );

  const users =
    usersResource.status === 'ready'
      ? usersResource.data
      : initialUsers || [];

  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [notice, setNoticeState] = React.useState<{ ok: boolean; text: string } | null>(null);
  // Failures start with "Could not"; everything else is a success line.
  const setNotice = (text: string | null) => setNoticeState(text ? { ok: !text.startsWith('Could not'), text } : null);
  const session = useOptionalSession()?.session ?? null;

  const handleUpdateRole = async (user: UserView, newRole: Role) => {
    setSavingId(user.id);
    setNotice(null);
    try {
      await updateUser(user.id, { role: newRole });
      setNotice(`Updated role for ${user.name} to ${newRole}.`);
      usersResource.reload();
    } catch (err) {
      setNotice(`Could not update the role for ${user.name}: ${toApiError(err).message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleHr = async (user: UserView) => {
    setSavingId(user.id);
    setNotice(null);
    try {
      await updateUser(user.id, { isHrManager: !user.isHrManager });
      setNotice(`Updated HR permissions for ${user.name}.`);
      usersResource.reload();
    } catch (err) {
      setNotice(`Could not update HR permissions for ${user.name}: ${toApiError(err).message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleRemove = async (user: UserView) => {
    if (!window.confirm(`Remove access for ${user.name} (${user.email})? They are signed out on their next click.`)) return;
    setSavingId(user.id);
    setNotice(null);
    try {
      await removeUser(user.id);
      setNotice(`Removed access for ${user.name}.`);
      usersResource.reload();
    } catch (err) {
      setNotice(`Could not remove ${user.name}: ${toApiError(err).message}`);
    } finally {
      setSavingId(null);
    }
  };

  const ROLE_HELP: Record<Role, string> = { admin: 'Everything, including settings', reviewer: 'Can fix and assign', viewer: 'Read only' };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Users & Permissions"
        description="Access is invite-only: people sign in with your company SSO, but only those listed here get in."
      />

      <InviteUserForm
        onInvited={(u) => {
          setNotice(`${u.name} can now sign in as ${u.role}.`);
          usersResource.reload();
        }}
      />

      {notice && <Notice ok={notice.ok}>{notice.text}</Notice>}

      <Panel>
        {usersResource.status === 'loading' && !initialUsers ? (
          <div className="space-y-2 p-5" aria-label="Loading users">
            <span className="skeleton block h-12 w-full" />
            <span className="skeleton block h-12 w-full" />
          </div>
        ) : usersResource.status === 'error' && !initialUsers ? (
          <div className="p-5">
            <ErrorState onRetry={usersResource.reload} message="We couldn't load users." />
          </div>
        ) : users.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="type-heading text-ink">No users yet</p>
            <p className="type-meta mt-1 text-ink-3">Invite people above; they can then sign in with your company SSO.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="type-meta border-b border-rule text-ink-3">
                  <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Person</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Role</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">HR manager</th>
                  <th scope="col" className="w-24 py-2.5 pl-3 pr-5">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {users.map((u) => {
                  const isSaving = savingId === u.id;
                  const isYou = !!session?.email && session.email.toLowerCase() === u.email.toLowerCase();
                  return (
                    <tr key={u.id} className={cn('transition-colors hover:bg-surface-sunken/40', isSaving && 'opacity-60')}>
                      <td className="py-3 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size={32} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink">
                              {u.name}
                              {isYou && <span className="ml-2 rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-ink-3">You</span>}
                            </p>
                            <p className="type-meta truncate text-ink-3">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <label htmlFor={`role-select-${u.id}`} className="sr-only">
                          Role:
                        </label>
                        <select
                          id={`role-select-${u.id}`}
                          value={u.role}
                          disabled={isSaving}
                          onChange={(e) => handleUpdateRole(u, e.target.value as Role)}
                          className="type-meta h-8 cursor-pointer rounded-control border border-rule bg-surface px-2 text-ink focus:border-ink-3 focus:outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <p className="mt-1 text-[11px] text-ink-3">{ROLE_HELP[u.role]}</p>
                      </td>
                      <td className="px-3 py-3">
                        <label className="inline-flex cursor-pointer select-none items-center gap-2">
                          <input
                            type="checkbox"
                            checked={u.isHrManager}
                            disabled={isSaving}
                            onChange={() => handleToggleHr(u)}
                            className="h-4 w-4 cursor-pointer accent-[var(--amber)]"
                            aria-label="HR Permissions"
                          />
                          <span className="type-meta text-ink-2" aria-hidden="true">{u.isHrManager ? 'Can record departures' : 'No'}</span>
                        </label>
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleRemove(u)} disabled={isSaving} aria-label={`Remove access for ${u.name}`}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

const fieldClass = 'type-meta h-9 w-full rounded-control border border-rule bg-surface px-3 text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none';

function InviteUserForm({ onInvited }: { onInvited: (u: UserView) => void }) {
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<Role>('viewer');
  const [isHrManager, setIsHrManager] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await inviteUser({ email: email.trim(), name: name.trim(), role, isHrManager });
      setEmail('');
      setName('');
      setRole('viewer');
      setIsHrManager(false);
      onInvited(user);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="px-5 py-4">
      <p className="type-meta mb-3 font-medium text-ink">Invite someone</p>
      <form onSubmit={submit} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1.4fr_1fr_auto_auto_auto]" aria-label="Invite a user">
        <div className="space-y-1">
          <label htmlFor="invite-email" className="type-meta block text-ink-3">Work email</label>
          <input id="invite-email" type="email" required className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@your-org.edu" />
        </div>
        <div className="space-y-1">
          <label htmlFor="invite-name" className="type-meta block text-ink-3">Name</label>
          <input id="invite-name" required className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="invite-role" className="type-meta block text-ink-3">Role</label>
          <select id="invite-role" className={fieldClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="viewer">Viewer</option>
            <option value="reviewer">Reviewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <label className="type-meta flex h-9 items-center gap-2 text-ink-2">
          <input type="checkbox" checked={isHrManager} onChange={(e) => setIsHrManager(e.target.checked)} className="h-4 w-4 accent-[var(--amber)]" />
          HR permissions
        </label>
        <Button type="submit" variant="primary" size="sm" disabled={busy || !email.trim() || !name.trim()} isLoading={busy}>
          Invite
        </Button>
      </form>
      {error && <p role="alert" className="type-meta mt-2 text-st-fail">{error}</p>}
    </Panel>
  );
}
