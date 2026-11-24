import { describe, it, expect, beforeEach } from 'vitest';
import { bootstrapUser, parseArgs, type Role } from '../../db/bootstrapUser.js';
import type { Query } from '../../src/repositories/graphRepository.js';

describe('Task 1.5: bootstrapUser', () => {
  let userRows: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    is_hr_manager: boolean;
    title: string | null;
  }> = [];

  let auditRows: Array<{
    id: string;
    user_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    details: any;
    created_at: string;
  }> = [];

  const mockQuery: Query = (async (sql: string, params?: any[]) => {
    if (sql.includes('SELECT') && sql.includes('user_account')) {
      return { rows: [...userRows], rowCount: userRows.length };
    }
    if (sql.includes('INSERT INTO user_account')) {
      const [id, name, email, role, is_hr_manager, title] = params!;
      const existingIdx = userRows.findIndex((u) => u.id === id || u.email === email);
      const row = { id, name, email, role, is_hr_manager, title };
      if (existingIdx >= 0) {
        userRows[existingIdx] = row;
      } else {
        userRows.push(row);
      }
      return { rows: [row], rowCount: 1 };
    }
    if (sql.includes('INSERT INTO audit_log')) {
      const [id, user_id, action, resource_type, resource_id, details, created_at] = params!;
      auditRows.push({ id, user_id, action, resource_type, resource_id, details, created_at });
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }) as unknown as Query;

  beforeEach(() => {
    userRows = [];
    auditRows = [];
  });

  describe('parseArgs', () => {
    it('parses valid CLI flags', () => {
      const args = parseArgs(['--email', 'alice@acme.com', '--name', 'Alice Smith', '--role', 'admin', '--hr', '--title', 'VP Tech']);
      expect(args).toEqual({
        email: 'alice@acme.com',
        name: 'Alice Smith',
        role: 'admin',
        isHrManager: true,
        title: 'VP Tech',
      });
    });

    it('defaults isHrManager to false', () => {
      const args = parseArgs(['--email', 'bob@acme.com', '--name', 'Bob', '--role', 'viewer']);
      expect(args.isHrManager).toBe(false);
    });
  });

  describe('validation', () => {
    it('throws on missing or invalid email', async () => {
      await expect(bootstrapUser({ email: '', name: 'Alice', role: 'admin' }, mockQuery)).rejects.toThrow('Invalid email');
      await expect(bootstrapUser({ email: 'notanemail', name: 'Alice', role: 'admin' }, mockQuery)).rejects.toThrow('Invalid email');
    });

    it('throws on empty name', async () => {
      await expect(bootstrapUser({ email: 'alice@acme.com', name: '', role: 'admin' }, mockQuery)).rejects.toThrow('Name must not be empty');
    });

    it('throws on invalid role', async () => {
      await expect(bootstrapUser({ email: 'alice@acme.com', name: 'Alice', role: 'superuser' as Role }, mockQuery)).rejects.toThrow('Invalid role');
    });
  });

  describe('execution & idempotency', () => {
    it('creates a new user and appends an audit log entry', async () => {
      const result = await bootstrapUser(
        { email: 'carol@acme.com', name: 'Carol Danvers', role: 'admin', isHrManager: true, title: 'Lead' },
        mockQuery
      );

      expect(result.created).toBe(true);
      expect(result.user.email).toBe('carol@acme.com');
      expect(result.user.name).toBe('Carol Danvers');
      expect(result.user.role).toBe('admin');
      expect(result.user.isHrManager).toBe(true);
      expect(result.user.title).toBe('Lead');

      expect(userRows).toHaveLength(1);
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0].action).toBe('USER_BOOTSTRAPPED');
      expect(auditRows[0].resource_id).toBe(`user:${result.user.id}`);
    });

    it('is idempotent: updating existing user returns created: false without changing ID', async () => {
      const first = await bootstrapUser(
        { email: 'carol@acme.com', name: 'Carol Danvers', role: 'viewer', isHrManager: false },
        mockQuery
      );
      expect(first.created).toBe(true);

      const second = await bootstrapUser(
        { email: 'CAROL@ACME.COM', name: 'Carol Danvers (Promoted)', role: 'admin', isHrManager: true },
        mockQuery
      );
      expect(second.created).toBe(false);
      expect(second.user.id).toBe(first.user.id);
      expect(second.user.role).toBe('admin');
      expect(second.user.isHrManager).toBe(true);
      expect(second.user.name).toBe('Carol Danvers (Promoted)');

      expect(userRows).toHaveLength(1);
      expect(auditRows).toHaveLength(2);
      expect(auditRows[1].action).toBe('USER_BOOTSTRAPPED');
    });
  });
});
