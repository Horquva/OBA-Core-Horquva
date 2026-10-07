'use client';

import * as React from 'react';
import type { UserView, Role } from '@/types/view';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchUsers, updateUser } from '@/lib/api/settings';
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

  return (
    <div className="space-y-6">
      <div className="border-b border-rule/50 pb-4">
        <h2 className="text-base font-semibold text-ink">Users & Permissions</h2>
        <p className="text-xs text-ink-3 mt-0.5">
          Manage system roles, administrative privileges, and HR departure initiation permissions.
        </p>
      </div>

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
          description="Users synced from identity providers will appear here."
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
