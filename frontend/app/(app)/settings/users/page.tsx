import * as React from 'react';

export default function UsersSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-rule/50">
        <h2 className="text-base font-semibold text-ink">Users & Roles</h2>
        <p className="text-xs text-ink-3 mt-0.5">
          Manage user permissions, roles (Admin, Viewer, Reviewer), and HR permissions.
        </p>
      </div>

      <div className="rounded-card border border-rule bg-surface p-6 shadow-xs">
        <p className="text-sm text-ink-2">
          User management and SSO role bindings being mounted in Task 32.
        </p>
      </div>
    </div>
  );
}
