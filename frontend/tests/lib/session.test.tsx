import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SessionProvider, useSession, devRoles } from '@/lib/session';
import { UserMenu } from '@/components/shell/UserMenu';
import {
  canEdit,
  canAttest,
  canInitiateDeparture,
  canManageSettings,
  isViewerOnly,
} from '@/lib/permissions';
import type { Session } from '@/types/view';

function stubDevEmails(emails: { admin?: string; reviewer?: string; viewer?: string }) {
  vi.stubEnv('NEXT_PUBLIC_DEV_ADMIN_EMAIL', emails.admin ?? '');
  vi.stubEnv('NEXT_PUBLIC_DEV_REVIEWER_EMAIL', emails.reviewer ?? '');
  vi.stubEnv('NEXT_PUBLIC_DEV_VIEWER_EMAIL', emails.viewer ?? '');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Session & RBAC (Task 15)', () => {
  const adminSession: Session = {
    userId: 'u-admin',
    name: 'Admin User',
    email: 'admin@acme.corp',
    role: 'admin',
    isHrManager: false,
    title: 'Lead Admin',
  };

  const hrViewerSession: Session = {
    userId: 'u-hr',
    name: 'HR Lead',
    email: 'hr@acme.corp',
    role: 'viewer',
    isHrManager: true,
    title: 'HR Manager',
  };

  const viewerSession: Session = {
    userId: 'u-viewer',
    name: 'Viewer User',
    email: 'viewer@acme.corp',
    role: 'viewer',
    isHrManager: false,
    title: 'Auditor',
  };

  describe('permissions helper', () => {
    it('evaluates admin capabilities', () => {
      expect(canEdit(adminSession)).toBe(true);
      expect(canAttest(adminSession)).toBe(true);
      expect(canInitiateDeparture(adminSession)).toBe(true);
      expect(canManageSettings(adminSession)).toBe(true);
      expect(isViewerOnly(adminSession)).toBe(false);
    });

    it('evaluates viewer and HR manager capabilities', () => {
      expect(isViewerOnly(viewerSession)).toBe(true);
      expect(canEdit(viewerSession)).toBe(false);
      expect(canManageSettings(viewerSession)).toBe(false);

      // HR Manager who is a viewer can initiate departure
      expect(canInitiateDeparture(hrViewerSession)).toBe(true);
      expect(canManageSettings(hrViewerSession)).toBe(false);
    });

    it('safely handles null session', () => {
      expect(canEdit(null)).toBe(false);
      expect(canAttest(null)).toBe(false);
      expect(canInitiateDeparture(null)).toBe(false);
      expect(canManageSettings(null)).toBe(false);
      expect(isViewerOnly(null)).toBe(true);
    });
  });

  describe('SessionProvider and useSession hook', () => {
    function ConsumerComponent() {
      const { session, setDevRole, isDevSession } = useSession();
      return (
        <div>
          <p data-testid="user-name">{session?.name}</p>
          <p data-testid="user-role">{session?.role}</p>
          <p data-testid="is-dev">{isDevSession ? 'dev' : 'prod'}</p>
          <button type="button" onClick={() => setDevRole('viewer')}>
            Switch to Viewer
          </button>
        </div>
      );
    }

    it('provides session and allows dev role switching', async () => {
      stubDevEmails({ admin: 'admin@acme.corp', viewer: 'viewer@acme.corp' });
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify(viewerSession), { status: 200 }));
      const { container } = render(
        <SessionProvider initialSession={adminSession}>
          <ConsumerComponent />
        </SessionProvider>
      );

      expect(screen.getByTestId('user-name')).toHaveTextContent('Admin User');
      expect(screen.getByTestId('user-role')).toHaveTextContent('admin');

      fireEvent.click(screen.getByRole('button', { name: 'Switch to Viewer' }));
      expect(await screen.findByText('Viewer User')).toBeInTheDocument();
      expect(screen.getByTestId('user-role')).toHaveTextContent('viewer');

      expect(await axe(container)).toHaveNoViolations();
    });

    it('in dev, signs in to the backend as the env-configured user for each role', async () => {
      stubDevEmails({ admin: 'alex@acme.com', reviewer: 'chen@acme.com', viewer: 'maya@acme.com' });
      const alex: Session = { userId: 'user:admin', name: 'Alex Rivera', email: 'alex@acme.com', role: 'admin', isHrManager: true, title: null };
      const maya: Session = { userId: 'user:maya', name: 'Maya Lin', email: 'maya@acme.com', role: 'viewer', isHrManager: false, title: null };
      const calls: Array<{ url: string; body: unknown }> = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        calls.push({ url, body });
        if (url.endsWith('/api/auth/session')) return new Response('{"error":"Not signed in."}', { status: 401 });
        if (url.endsWith('/api/auth/dev/sign-in')) {
          return new Response(JSON.stringify(body.email === 'maya@acme.com' ? maya : alex), { status: 200 });
        }
        return new Response('{}', { status: 404 });
      });

      render(
        <SessionProvider isDevSession>
          <ConsumerComponent />
        </SessionProvider>
      );

      // No cookie yet → dev sign-in as the admin seed user.
      expect(await screen.findByText('Alex Rivera')).toBeInTheDocument();
      expect(calls.find((c) => c.url.endsWith('/dev/sign-in'))?.body).toEqual({ email: 'alex@acme.com' });

      // Switching to viewer becomes Maya on the backend too.
      fireEvent.click(screen.getByRole('button', { name: 'Switch to Viewer' }));
      expect(await screen.findByText('Maya Lin')).toBeInTheDocument();
      expect(screen.getByTestId('user-role')).toHaveTextContent('viewer');
    });

    it('role switcher hides roles without an env email', async () => {
      stubDevEmails({ admin: 'admin@acme.corp', reviewer: 'rev@acme.corp' });
      expect(devRoles()).toEqual(['admin', 'reviewer']);
      render(
        <SessionProvider initialSession={adminSession} isDevSession>
          <UserMenu />
        </SessionProvider>
      );
      fireEvent.click(screen.getByRole('button', { name: /User settings for/ }));
      expect(screen.getByRole('button', { name: 'admin' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'reviewer' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'viewer' })).toBeNull();

      stubDevEmails({});
      expect(devRoles()).toEqual([]);
    });

    it('offline backend shows error state, not a fake session', async () => {
      stubDevEmails({ admin: 'admin@acme.corp' });
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
      render(
        <SessionProvider isDevSession>
          <ConsumerComponent />
        </SessionProvider>
      );
      expect(await screen.findByRole('alert')).toHaveTextContent(/Backend not reachable at http/);
      expect(screen.queryByTestId('user-name')).toBeNull();
      expect(screen.queryByText(/backend offline/i)).toBeNull();
    });

    it('dev with no configured user says so instead of signing in', async () => {
      stubDevEmails({});
      const urls: string[] = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        urls.push(String(input));
        return new Response('{"error":"Not signed in."}', { status: 401 });
      });
      render(
        <SessionProvider isDevSession>
          <ConsumerComponent />
        </SessionProvider>
      );
      expect(await screen.findByRole('alert')).toHaveTextContent(/No dev user configured/);
      expect(urls.some((u) => u.includes('/dev/sign-in'))).toBe(false);
    });

    it('in production, never uses dev sign-in', async () => {
      const urls: string[] = [];
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        urls.push(String(input));
        return new Response('{"error":"Not signed in."}', { status: 401 });
      });

      const onSignedOut = vi.fn();
      window.history.pushState({}, '', '/departures?tab=open');
      render(
        <SessionProvider isDevSession={false} onSignedOut={onSignedOut}>
          <ConsumerComponent />
        </SessionProvider>
      );

      // Signed out in production: off to sign-in, coming back to the same page; no screen renders.
      await waitFor(() => expect(onSignedOut).toHaveBeenCalledWith('/departures?tab=open'));
      expect(screen.queryByTestId('user-name')).toBeNull();
      expect(urls.some((u) => u.includes('/dev/sign-in'))).toBe(false);
      window.history.pushState({}, '', '/');
    });

    it('in production, shows screens once the session loads', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () => new Response(JSON.stringify(adminSession), { status: 200 })
      );
      const onSignedOut = vi.fn();
      render(
        <SessionProvider isDevSession={false} onSignedOut={onSignedOut}>
          <ConsumerComponent />
        </SessionProvider>
      );
      expect(await screen.findByText('Admin User')).toBeInTheDocument();
      expect(onSignedOut).not.toHaveBeenCalled();
    });

    it('throws error when useSession is used without provider', () => {
      expect(() => renderHook(() => useSession())).toThrow(
        'useSession must be used within a SessionProvider'
      );
    });
  });
});
