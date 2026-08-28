'use client';

/*
 * Account settings — currently just "change your own password".
 *
 * This page exists because the password change moved behind the login wall.
 * The old /forgot-password page posted { email, newPassword } to an
 * unauthenticated endpoint, so anyone who knew a registered address could take
 * that account over. The replacement never names an account: the server changes
 * whichever user the bearer token identifies.
 *
 * Not part of /admin. That page is operational health — endpoint pings, data
 * freshness — and is about the deployment. This is about the person signed in.
 */

import React, { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const MIN_PASSWORD_LENGTH = 8;

export default function AccountPage() {
  const { user, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Confirmation is checked here and nowhere else on purpose — the server has
    // no business knowing the field exists. It only guards against typos.
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setDone(true);
      // The server revoked the token that authorised this change, so the
      // session in this tab is already dead. Clear it and send them to sign in
      // again rather than letting the next request fail with a confusing 401.
      setTimeout(() => logout(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]';

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--text-primary)]">
          <KeyRound className="h-5 w-5" />
          Account
        </h1>
        {user?.email && (
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Signed in as {user.email}
            {/* Display only (D-05) — role no longer gates anything server-side. */}
            {user.role ? ` · ${user.role}` : ''}
          </p>
        )}
      </header>

      <section className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
        <h2 className="mb-1 text-sm font-medium text-[var(--text-primary)]">Change password</h2>
        <p className="mb-4 text-xs text-[var(--text-tertiary)]">
          You will be signed out and asked to sign in again with the new password.
        </p>

        {done ? (
          <p className="flex items-center gap-2 text-sm text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            Password updated. Signing you out…
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label htmlFor="current" className="mb-1 block text-xs text-[var(--text-tertiary)]">
                Current password
              </label>
              <input
                id="current"
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="next" className="mb-1 block text-xs text-[var(--text-tertiary)]">
                New password
              </label>
              <input
                id="next"
                className={inputClass}
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-xs text-[var(--text-tertiary)]">
                Confirm new password
              </label>
              <input
                id="confirm"
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </section>

      <p className="mt-4 text-xs text-[var(--text-tertiary)]">
        Forgot your password and can&apos;t sign in? Ask an administrator to reset it. Self-service
        recovery needs email delivery, which this deployment does not have configured yet.
      </p>
    </div>
  );
}
