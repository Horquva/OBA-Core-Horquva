// =============================================================================
// Horquva Continuity Platform — Attestation & Access-Review Engine
// =============================================================================
// Manages confirmation campaigns, token lifecycle, magic link submissions,
// and SCD Type 2 fact upgrades upon owner attestation.
// =============================================================================

import crypto from 'node:crypto';
import { z } from 'zod';
import { AttestationAnswers, AttestationTask, CriticalityLevel } from '@horquva/types';
import { query, withTransaction } from '../db/client.js';
import { AttestationMailer } from './mailer.js';

export const AttestationAnswersSchema = z.object({
  isOwner: z.boolean(),
  backupPersonId: z.string().nullable().optional(),
  criticality: z.enum(['critical', 'high', 'medium', 'low']),
  criticalityReason: z.string().optional(),
  isDocumented: z.boolean(),
  documentationUrl: z.string().url().optional().or(z.literal('')),
  fallbackExists: z.boolean(),
});

export class AttestationEngine {
  private mailer: AttestationMailer;
  private appBaseUrl: string;

  constructor(appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000') {
    this.mailer = new AttestationMailer();
    this.appBaseUrl = appBaseUrl.replace(/\/+$/, '');
  }

  /**
   * Generates a 64-character unguessable cryptographic token.
   */
  public static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Creates a confirmation campaign and generates attestation tasks for target assets.
   */
  public async createCampaign(
    name: string,
    dueDate: Date,
    tasksToCreate: Array<{ reviewerPersonId: string; assetEntityId: string }>
  ): Promise<string> {
    return await withTransaction(async (client) => {
      const campRes = await client.query(
        `
        INSERT INTO campaign (name, status, due_date, created_at)
        VALUES ($1, 'active', $2, NOW())
        RETURNING id;
        `,
        [name, dueDate]
      );
      const campaignId = campRes.rows[0].id;

      for (const t of tasksToCreate) {
        const token = AttestationEngine.generateSecureToken();
        await client.query(
          `
          INSERT INTO attestation_task (campaign_id, reviewer_person_id, asset_entity_id, status, token, created_at)
          VALUES ($1, $2, $3, 'pending', $4, NOW());
          `,
          [campaignId, t.reviewerPersonId, t.assetEntityId, token]
        );
      }

      return campaignId;
    });
  }

  /**
   * Retrieves an attestation task by token.
   */
  public async getTaskByToken(token: string): Promise<{
    task: AttestationTask;
    assetName: string;
    reviewerName: string;
    reviewerEmail: string;
  } | null> {
    const res = await query(
      `
      SELECT 
        t.id, t.campaign_id, t.reviewer_person_id, t.asset_entity_id, t.status, t.token,
        t.answers, t.escalated_to_manager_id, t.reminders_sent, t.submitted_at, t.created_at,
        a.name as asset_name,
        p.name as reviewer_name,
        p.external_refs->>'email' as reviewer_email
      FROM attestation_task t
      JOIN entity a ON a.id = t.asset_entity_id
      JOIN entity p ON p.id = t.reviewer_person_id
      WHERE t.token = $1;
      `,
      [token]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    return {
      task: {
        id: row.id,
        campaignId: row.campaign_id,
        reviewerPersonId: row.reviewer_person_id,
        assetEntityId: row.asset_entity_id,
        status: row.status,
        token: row.token,
        answers: row.answers || {},
        escalatedToManagerId: row.escalated_to_manager_id,
        remindersSent: row.reminders_sent,
        submittedAt: row.submitted_at ? new Date(row.submitted_at) : null,
        createdAt: new Date(row.created_at),
      },
      assetName: row.asset_name,
      reviewerName: row.reviewer_name,
      reviewerEmail: row.reviewer_email || row.reviewer_person_id.replace('person:', ''),
    };
  }

  /**
   * Submits answers for an attestation task, upgrading SCD2 facts and edges to 'confirmed'.
   */
  public async submitAttestation(token: string, answersInput: unknown): Promise<boolean> {
    const validated = AttestationAnswersSchema.parse(answersInput);

    return await withTransaction(async (client) => {
      // 1. Fetch and lock task
      const taskRes = await client.query(
        `
        SELECT id, reviewer_person_id, asset_entity_id, status
        FROM attestation_task
        WHERE token = $1
        FOR UPDATE;
        `,
        [token]
      );

      if (taskRes.rows.length === 0) {
        throw new Error('Invalid or expired attestation token.');
      }

      const task = taskRes.rows[0];
      if (task.status === 'submitted') {
        throw new Error('This attestation review has already been submitted.');
      }

      const reviewerId = task.reviewer_person_id;
      const assetId = task.asset_entity_id;

      // 2. Upgrade Criticality Fact to 'confirmed'
      await this.upgradeFact(client, assetId, 'criticality', validated.criticality, reviewerId);

      // 3. Upgrade Documented Fact to 'confirmed'
      await this.upgradeFact(
        client,
        assetId,
        'documented',
        validated.isDocumented,
        reviewerId,
        validated.documentationUrl || undefined
      );

      // 4. Upgrade Fallback Fact to 'confirmed'
      await this.upgradeFact(client, assetId, 'fallback_exists', validated.fallbackExists, reviewerId);

      // 5. If backup owner specified, insert or upgrade confirmed backup edge
      if (validated.backupPersonId) {
        // Close any prior backup edges for this asset
        await client.query(
          `UPDATE edge SET valid_to = NOW() WHERE to_id = $1 AND type = 'backs_up' AND valid_to IS NULL;`,
          [assetId]
        );

        await client.query(
          `
          INSERT INTO edge (from_id, to_id, type, grade, source, source_ref, valid_from)
          VALUES ($1, $2, 'backs_up', 'confirmed', 'attestation', $3, NOW());
          `,
          [validated.backupPersonId, assetId, `attestation:${task.id}`]
        );
      }

      // 6. Mark task as submitted
      await client.query(
        `
        UPDATE attestation_task
        SET status = 'submitted',
            answers = $1,
            submitted_at = NOW()
        WHERE id = $2;
        `,
        [JSON.stringify(validated), task.id]
      );

      return true;
    });
  }

  /**
   * Helper to write new SCD2 fact version with grade 'confirmed'.
   */
  private async upgradeFact(
    client: any,
    entityId: string,
    attribute: string,
    value: any,
    attestedBy: string,
    sourceRef?: string
  ): Promise<void> {
    // Expire existing active fact
    await client.query(
      `
      UPDATE fact
      SET valid_to = NOW()
      WHERE entity_id = $1 AND attribute = $2 AND valid_to IS NULL;
      `,
      [entityId, attribute]
    );

    // Insert upgraded confirmed fact
    await client.query(
      `
      INSERT INTO fact (entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from)
      VALUES ($1, $2, $3, 'confirmed', 'attestation', $4, $5, NOW());
      `,
      [entityId, attribute, JSON.stringify(value), sourceRef || null, attestedBy]
    );
  }
}
