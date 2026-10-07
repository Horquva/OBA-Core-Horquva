import { describe, it, expect, beforeEach } from 'vitest';
import { DataService } from '../../src/services/dataService.js';
import {
  isCredentialOrAuthError,
  getAssociatedAutomations,
  verifyDepartureExecutions,
  verifyAllActiveDepartures,
  WorkflowExecution,
} from '../../src/handover/postDepartureVerifier.js';
import {
  markAccountDisabled,
  nameSuccessors,
  requestAcceptance,
  acceptHandover,
} from '../../src/handover/successionService.js';

describe('HND-06: Post-Departure 72h Verification Daemon', () => {
  let ds: DataService;

  beforeEach(() => {
    ds = DataService.resetInstance();
  });

  describe('isCredentialOrAuthError', () => {
    it('accurately identifies authentication and credential failures', () => {
      expect(isCredentialOrAuthError('Error: 401 Unauthorized invalid token')).toBe(true);
      expect(isCredentialOrAuthError('OAuth token expired or revoked')).toBe(true);
      expect(isCredentialOrAuthError('Invalid credentials provided for connection')).toBe(true);
      expect(isCredentialOrAuthError('Failed to authenticate with personal API key')).toBe(true);
      expect(isCredentialOrAuthError('Access denied: forbidden 403')).toBe(true);
    });

    it('returns false for generic runtime or syntax errors', () => {
      expect(isCredentialOrAuthError('SyntaxError: Unexpected identifier in Code node')).toBe(false);
      expect(isCredentialOrAuthError('HTTP 500 Internal Server Error in destination API')).toBe(false);
      expect(isCredentialOrAuthError('Database connection pool timeout')).toBe(false);
      expect(isCredentialOrAuthError(null)).toBe(false);
      expect(isCredentialOrAuthError(undefined)).toBe(false);
    });
  });

  describe('getAssociatedAutomations', () => {
    it('discovers both owned automations and automations using personal credentials', () => {
      const graph = ds.getGraph();
      // Omar owns automation 101 and 102
      const omarAutomations = getAssociatedAutomations(graph, 'person:omar@acme.com');
      expect(omarAutomations.length).toBeGreaterThanOrEqual(2);
      expect(omarAutomations.some((a) => a.id === 'automation:n8n:101')).toBe(true);

      // David Miller has runs_on_credentials_of for automation 105
      const davidAutomations = getAssociatedAutomations(graph, 'person:david@acme.com');
      expect(davidAutomations.some((a) => a.id === 'automation:n8n:105')).toBe(true);
    });
  });

  describe('verifyDepartureExecutions', () => {
    it('detects credential failure post-departure and emits High-Severity alert', async () => {
      const dep = ds.createDeparture({
        personId: 'person:omar@acme.com',
        leaveDate: '2026-10-31T00:00:00.000Z',
        note: 'Planned transition',
      });

      // Advance to stage 4 (account_disabled)
      markAccountDisabled(ds, dep.id);
      expect(dep.stage).toBe('account_disabled');

      const mockExecutions: WorkflowExecution[] = [
        {
          id: 'exec_fail_1',
          workflowId: 'automation:n8n:101',
          status: 'error',
          startedAt: '2026-11-01T10:00:00.000Z',
          stoppedAt: '2026-11-01T10:00:05.000Z',
          errorMessage: '401 Unauthorized: Invalid API key credentials for Stripe node',
        },
      ];

      const initialChanges = ds.getChangeEvents().length;

      const result = await verifyDepartureExecutions(ds, dep.id, {
        now: new Date('2026-11-01T12:00:00.000Z'),
        executionProvider: async (wfId) => mockExecutions.filter((e) => e.workflowId === wfId),
        windowHours: 72,
      });

      expect(result.failuresDetected).toBe(1);
      expect(result.alertsEmitted).toBe(1);
      expect(result.autoVerified).toBe(false);
      expect(result.watchLog.length).toBe(1);
      expect(result.watchLog[0].severity).toBe('alert');
      expect(result.watchLog[0].message).toContain('halted post-departure due to disabled credentials');

      // Verify High-Severity alert added to change feed
      const newChanges = ds.getChangeEvents();
      expect(newChanges.length).toBe(initialChanges + 1);
      const latestChange = newChanges[0];
      expect(latestChange.kind).toBe('credential_risk');
      expect(latestChange.title).toContain('Post-Departure Failure');
    });

    it('logs non-credential runtime errors as info without triggering credential alert', async () => {
      const dep = ds.createDeparture({
        personId: 'person:omar@acme.com',
        leaveDate: '2026-10-31T00:00:00.000Z',
        note: 'Planned transition',
      });

      markAccountDisabled(ds, dep.id);

      const mockExecutions: WorkflowExecution[] = [
        {
          id: 'exec_fail_2',
          workflowId: 'automation:n8n:101',
          status: 'error',
          startedAt: '2026-11-01T10:00:00.000Z',
          stoppedAt: '2026-11-01T10:00:05.000Z',
          errorMessage: 'JSON parse error at line 4',
        },
      ];

      const initialChanges = ds.getChangeEvents().length;

      const result = await verifyDepartureExecutions(ds, dep.id, {
        now: new Date('2026-11-01T12:00:00.000Z'),
        executionProvider: async (wfId) => mockExecutions.filter((e) => e.workflowId === wfId),
      });

      expect(result.failuresDetected).toBe(1);
      expect(result.alertsEmitted).toBe(0);
      expect(ds.getChangeEvents().length).toBe(initialChanges);
      expect(result.watchLog.length).toBe(1);
      expect(result.watchLog[0].severity).toBe('info');
    });

    it('automatically transitions to verified after clean 72h window with accepted handovers', async () => {
      const dep = ds.createDeparture({
        personId: 'person:omar@acme.com',
        leaveDate: '2026-10-31T00:00:00.000Z',
        note: 'Planned transition',
      });

      // Name successor Chen for all handovers and accept them
      const assignments = dep.handovers.map((h) => ({
        assetId: h.assetId,
        successorId: 'person:chen@acme.com',
      }));
      nameSuccessors(ds, dep.id, assignments);
      requestAcceptance(ds, dep.id);

      const chenUser = ds.getUserById('user:chen')!;
      for (const h of dep.handovers) {
        await acceptHandover(ds, h.id, chenUser);
      }

      // Mark account disabled at t=0
      const disabledDate = new Date('2026-11-01T00:00:00.000Z');
      markAccountDisabled(ds, dep.id);
      dep.stageTimestamps.account_disabled = disabledDate.toISOString();

      // Check at t = 74 hours (window complete) with successful executions
      const checkDate = new Date('2026-11-04T02:00:00.000Z');
      const mockSuccessExecutions: WorkflowExecution[] = [
        {
          id: 'exec_ok_1',
          workflowId: 'automation:n8n:101',
          status: 'success',
          startedAt: '2026-11-02T10:00:00.000Z',
        },
      ];

      const result = await verifyDepartureExecutions(ds, dep.id, {
        now: checkDate,
        windowHours: 72,
        executionProvider: async () => mockSuccessExecutions,
      });

      expect(result.windowCompleted).toBe(true);
      expect(result.autoVerified).toBe(true);
      expect(result.stage).toBe('verified');
      expect(dep.stage).toBe('verified');
      expect(result.watchLog.some((w) => w.message.includes('72-hour verification window completed'))).toBe(true);
    });

    it('does NOT auto-verify if open unaccepted handovers remain when 72h elapses', async () => {
      const dep = ds.createDeparture({
        personId: 'person:omar@acme.com',
        leaveDate: '2026-10-31T00:00:00.000Z',
        note: 'Planned transition',
      });

      // Disable account without accepting handovers
      const disabledDate = new Date('2026-11-01T00:00:00.000Z');
      markAccountDisabled(ds, dep.id);
      dep.stageTimestamps.account_disabled = disabledDate.toISOString();

      const checkDate = new Date('2026-11-04T02:00:00.000Z'); // 74h later
      const result = await verifyDepartureExecutions(ds, dep.id, {
        now: checkDate,
        windowHours: 72,
        executionProvider: async () => [],
      });

      expect(result.windowCompleted).toBe(true);
      expect(result.autoVerified).toBe(false);
      expect(dep.stage).toBe('account_disabled');
    });
  });

  describe('verifyAllActiveDepartures', () => {
    it('scans all active account_disabled departures in batch', async () => {
      const dep1 = ds.createDeparture({
        personId: 'person:omar@acme.com',
        leaveDate: '2026-10-31T00:00:00.000Z',
        note: 'Omar',
      });
      const dep2 = ds.createDeparture({
        personId: 'person:maya@acme.com',
        leaveDate: '2026-10-31T00:00:00.000Z',
        note: 'Maya',
      });

      markAccountDisabled(ds, dep1.id);
      // dep2 stays in initiated

      const results = await verifyAllActiveDepartures(ds);
      expect(results.length).toBe(1);
      expect(results[0].departureId).toBe(dep1.id);
    });
  });
});
