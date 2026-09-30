// =============================================================================
// Horquva Continuity Platform — Attestation & Access-Review Routes
// =============================================================================
// Exposes campaign management and magic-link form endpoints for asset owners.
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/client.js';
import { AttestationEngine } from '../attestation/engine.js';

export const attestationRouter = Router();
const engine = new AttestationEngine();

// 1. List Campaigns
attestationRouter.get('/campaigns', async (_req: Request, res: Response) => {
  try {
    const campaignsRes = await query(`
      SELECT 
        c.id, c.name, c.status, c.due_date, c.created_at,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'submitted' THEN 1 END) as completed_tasks
      FROM campaign c
      LEFT JOIN attestation_task t ON t.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC;
    `);

    res.json({ campaigns: campaignsRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list campaigns.' });
  }
});

// 2. Create Campaign
const CreateCampaignSchema = z.object({
  name: z.string().min(1),
  dueDate: z.string(), // ISO string
  tasks: z.array(
    z.object({
      reviewerPersonId: z.string().min(1),
      assetEntityId: z.string().min(1),
    })
  ).min(1),
});

attestationRouter.post('/campaigns', async (req: Request, res: Response) => {
  const parsed = CreateCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid campaign request payload.' });
    return;
  }

  try {
    const campaignId = await engine.createCampaign(
      parsed.data.name,
      new Date(parsed.data.dueDate),
      parsed.data.tasks
    );
    res.json({ success: true, campaignId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create campaign.' });
  }
});

// 3. Get Task Details by Magic-Link Token (Web Form data)
attestationRouter.get('/review/:token', async (req: Request, res: Response) => {
  const token = String(req.params.token || '');
  if (!token) {
    res.status(400).json({ error: 'Token is required.' });
    return;
  }

  try {
    const data = await engine.getTaskByToken(token);
    if (!data) {
      res.status(404).json({ error: 'Review task not found or token expired.' });
      return;
    }

    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch review task.' });
  }
});

// 4. Submit Attestation Answers
attestationRouter.post('/review/:token', async (req: Request, res: Response) => {
  const token = String(req.params.token || '');
  if (!token) {
    res.status(400).json({ error: 'Token is required.' });
    return;
  }

  try {
    await engine.submitAttestation(token, req.body);
    res.json({ success: true, message: 'Attestation submitted and confirmed.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to submit attestation review.' });
  }
});
