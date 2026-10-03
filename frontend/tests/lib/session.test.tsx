import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SessionProvider, useSession } from '@/lib/session';
import {
  canEdit,
  canAttest,
  canInitiateDeparture,
  canManageSettings,
  isViewerOnly,
} from '@/lib/permissions';
import type { Session } from '@/types/view';

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
      const { container } = render(
        <SessionProvider initialSession={adminSession}>
          <ConsumerComponent />
        </SessionProvider>
      );

      expect(screen.getByTestId('user-name')).toHaveTextContent('Admin User');
      expect(screen.getByTestId('user-role')).toHaveTextContent('admin');

      fireEvent.click(screen.getByRole('button', { name: 'Switch to Viewer' }));
      expect(screen.getByTestId('user-role')).toHaveTextContent('viewer');

      expect(await axe(container)).toHaveNoViolations();
    });

    it('throws error when useSession is used without provider', () => {
      expect(() => renderHook(() => useSession())).toThrow(
        'useSession must be used within a SessionProvider'
      );
    });
  });
});
