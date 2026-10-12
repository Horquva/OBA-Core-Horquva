'use client';

import * as React from 'react';
import type { UserView, Role } from '@/types/view';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchUsers, updateUser, inviteUser, removeUser } from '@/lib/api/settings';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
  const [notice, setNotice] = React.useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="border-b border-rule/50 pb-4">
        <h2 className="text-base font-semibold text-ink">Users & Permissions</h2>
        <p className="text-xs text-ink-3 mt-0.5">
          Access is invite-only: people sign in with your company SSO, but only those listed here get in.
        </p>
      </div>

      <InviteUserForm
        onInvited={(u) => {
          setNotice(`${u.name} can now sign in as ${u.role}.`);
          usersResource.reload();
        }}
      />

      {notice && (
        <div className="rounded-control bg-amber/10 border border-amber/30 p-3 text-xs text-amber-ink font-mono">
          {notice}
        </div>
      )}

      {usersResource.status === 'loading' && !initialUsers ? (
        <div className="space-y-3">
          <Skeleton variant="card" className="h-16" />
          <Skeleton variant="card" className="h-16" />
          <Skeleton variant="card" className="h-16" />
        </div>
      ) : usersResource.status === 'error' && !initialUsers ? (
        <ErrorState
          onRetry={usersResource.reload}
          message="Could not load users list."
        />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Invite people above; they can then sign in with your company SSO."
        />
      ) : (
        <div className="divide-y divide-rule border border-rule rounded-card bg-surface overflow-hidden shadow-card">
          {users.map((u) => {
            const isSaving = savingId === u.id;

            return (
              <div
                key={u.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-sunken/20 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink text-sm">{u.name}</span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-badge text-[10px] font-mono uppercase font-semibold',
                        u.role === 'admin' && 'bg-amber/15 text-amber-ink',
                        u.role === 'viewer' && 'bg-surface-sunken text-ink-2',
                        u.role === 'reviewer' && 'bg-st-pass/15 text-st-pass',
                      )}
                    >
                      {u.role}
                    </span>
                    {u.isHrManager && (
                      <span className="px-2 py-0.5 rounded-badge bg-ev-stated/15 text-ev-stated text-[10px] font-mono uppercase font-semibold">
                        HR Manager
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-3 font-mono">{u.email}</p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  {/* Role Selector */}
                  <div className="flex items-center gap-1.5">
                    <label htmlFor={`role-select-${u.id}`} className="text-ink-3 font-mono text-[11px]">
                      Role:
                    </label>
                    <select
                      id={`role-select-${u.id}`}
                      value={u.role}
                      disabled={isSaving}
                      onChange={(e) => handleUpdateRole(u, e.target.value as Role)}
                      className="rounded-control border border-rule bg-surface p-1.5 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                    >
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                      <option value="reviewer">Reviewer</option>
                    </select>
                  </div>

                  {/* HR Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={u.isHrManager}
                      disabled={isSaving}
                      onChange={() => handleToggleHr(u)}
                      className="rounded text-amber focus:ring-amber"
                    />
                    <span className="text-ink text-xs">HR Permissions</span>
                  </label>

                  <Button size="sm" variant="ghost" onClick={() => handleRemove(u)} disabled={isSaving} aria-label={`Remove access for ${u.name}`}>
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const fieldClass =
  'w-full rounded-control border border-rule bg-surface p-2 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber';

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
    <Card className="p-4 bg-surface border border-rule text-xs">
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_auto_auto_auto] gap-3 items-end" aria-label="Invite a user">
        <div className="space-y-1">
          <label htmlFor="invite-email" className="font-semibold text-ink block">Work email</label>
          <input id="invite-email" type="email" required className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@your-org.edu" />
        </div>
        <div className="space-y-1">
          <label htmlFor="invite-name" className="font-semibold text-ink block">Name</label>
          <input id="invite-name" required className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="invite-role" className="font-semibold text-ink block">Role</label>
          <select id="invite-role" className={fieldClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="viewer">Viewer</option>
            <option value="reviewer">Reviewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-ink">
          <input type="checkbox" checked={isHrManager} onChange={(e) => setIsHrManager(e.target.checked)} />
          HR permissions
        </label>
        <Button type="submit" variant="primary" size="sm" disabled={busy || !email.trim() || !name.trim()} isLoading={busy}>
          Invite
        </Button>
      </form>
      {error && <p role="alert" className="mt-2 text-st-fail">{error}</p>}
    </Card>
  );
}
