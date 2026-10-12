// =============================================================================
// Horquva Continuity Platform — Attestation repository (campaign / task / link)
// =============================================================================

import crypto from 'node:crypto';
import { query as defaultQuery } from '../db/client.js';
import { encryptSecret, decryptSecret, type EncryptedPayload } from '../security/encryption.js';
import type { Query } from './graphRepository.js';

export interface CampaignRow {
  id: string;
  name: string;
  dueDate: string;
  createdAt: string;
  createdBy: string;
  introLine: string | null;
  email: { subject: string; bodyText: string } | null;
}

export interface TaskRow {
  id: string;
  campaignId: string;
  reviewerPersonId: string;
  assetId: string;
  status: 'pending' | 'saved';
  answers: unknown;
  savedAt: string | null;
}

export interface LinkRow {
  token: string;
  campaignId: string;
  reviewerPersonId: string;
  remindersSent: number;
  lastRemindedAt: string | null;
  createdAt: string;
}

const iso = (v: unknown): string | null => (v ? (v instanceof Date ? v : new Date(v as string)).toISOString() : null);
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export async function loadAll(q: Query = defaultQuery): Promise<{ campaigns: CampaignRow[]; tasks: TaskRow[]; links: LinkRow[] }> {
  const [c, t, l] = await Promise.all([
    q(`SELECT id, name, due_date, created_at, created_by, intro_line, email FROM campaign`),
    q(`SELECT id, campaign_id, reviewer_person_id, asset_entity_id, status, answers, submitted_at FROM attestation_task ORDER BY created_at, id`),
    q(`SELECT token_hash, token_encrypted, campaign_id, reviewer_person_id, created_at, reminders_sent, last_reminded_at FROM attestation_link`),
  ]);
  return {
    campaigns: (c.rows as any[]).map((r) => ({
      id: r.id, name: r.name, dueDate: iso(r.due_date)!, createdAt: iso(r.created_at)!,
      createdBy: r.created_by ?? 'admin', introLine: r.intro_line ?? null, email: r.email ?? null,
    })),
    tasks: (t.rows as any[]).map((r) => ({
      id: r.id, campaignId: r.campaign_id, reviewerPersonId: r.reviewer_person_id, assetId: r.asset_entity_id,
      status: r.status === 'submitted' ? 'saved' : 'pending', answers: r.answers ?? null, savedAt: iso(r.submitted_at),
    })),
    links: (l.rows as any[]).map((r) => ({
      // AAD binds the ciphertext to its hash, so it can't be moved to another row.
      token: decryptSecret(r.token_encrypted as EncryptedPayload, r.token_hash),
      campaignId: r.campaign_id, reviewerPersonId: r.reviewer_person_id,
      remindersSent: r.reminders_sent, lastRemindedAt: iso(r.last_reminded_at), createdAt: iso(r.created_at)!,
    })),
  };
}

export async function insertCampaign(c: CampaignRow, tasks: TaskRow[], links: LinkRow[], q: Query = defaultQuery): Promise<void> {
  await q(
    `INSERT INTO campaign (id, name, status, due_date, created_at, created_by, intro_line, email)
     VALUES ($1, $2, 'active', $3, $4, $5, $6, $7)`,
    [c.id, c.name, c.dueDate, c.createdAt, c.createdBy, c.introLine, c.email ? JSON.stringify(c.email) : null]
  );
  await q(
    `INSERT INTO attestation_task (id, campaign_id, reviewer_person_id, asset_entity_id, status)
     SELECT id, $2, reviewer_person_id, asset_entity_id, 'pending'
       FROM jsonb_to_recordset($1::jsonb) AS x(id uuid, reviewer_person_id text, asset_entity_id text)`,
    [JSON.stringify(tasks.map((t) => ({ id: t.id, reviewer_person_id: t.reviewerPersonId, asset_entity_id: t.assetId }))), c.id]
  );
  for (const l of links) {
    const h = hashToken(l.token);
    await q(
      `INSERT INTO attestation_link (token_hash, token_encrypted, campaign_id, reviewer_person_id, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [h, JSON.stringify(encryptSecret(l.token, h)), c.id, l.reviewerPersonId, l.createdAt]
    );
  }
}

/** Durable guard against a double submission: only a pending task can be submitted. */
export async function markTaskSubmitted(taskId: string, answers: unknown, at: string, q: Query = defaultQuery): Promise<void> {
  const res = await q(
    `UPDATE attestation_task SET status = 'submitted', answers = $2, submitted_at = $3 WHERE id = $1 AND status = 'pending'`,
    [taskId, JSON.stringify(answers), at]
  );
  if (res.rowCount !== 1) throw new Error(`Attestation task ${taskId} was already submitted (or no longer exists).`);
}

export async function markCampaignCompleted(campaignId: string, q: Query = defaultQuery): Promise<void> {
  await q(`UPDATE campaign SET status = 'completed', completed_at = NOW() WHERE id = $1 AND completed_at IS NULL`, [campaignId]);
}

export async function recordReminder(token: string, at: string, q: Query = defaultQuery): Promise<void> {
  await q(
    `UPDATE attestation_link SET reminders_sent = reminders_sent + 1, last_reminded_at = $2 WHERE token_hash = $1`,
    [hashToken(token), at]
  );
}
