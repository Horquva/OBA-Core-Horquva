// =============================================================================
// Horquva Continuity Platform — Weekly Executive Briefing Service (CHG-03, G-11)
// =============================================================================
// Synthesizes a weekly continuity executive digest summarizing:
// 1. Upcoming departures (next 14 days) and handover progress
// 2. Unbacked critical single points of failure (SPOFs)
// 3. Automations bound to personal credentials
// 4. New failure spikes and security events from the change feed
//
// Dual prose generation: uses Google Gemini 2.0 Flash when API key is present,
// with deterministic structured template fallback when offline.
// Dispatches via Nodemailer with zero third-party sub-processors.
// =============================================================================

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type { DataService } from '../dataService.js';
import { calculateHeadlineMetrics } from '../../domain/checks/index.js';

dotenv.config();

const DAY_MS = 86_400_000;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const DEPARTURE_HORIZON_DAYS = 14;

export interface UpcomingDepartureBriefing {
  id: string;
  personName: string;
  leaveDate: string;
  stage: string;
  unacceptedHandovers: number;
}

export interface SpofBriefing {
  assetId: string;
  assetName: string;
  criticality: string;
  ownerName: string;
  reason: string;
}

export interface CredentialExposureBriefing {
  automationId: string;
  automationName: string;
  credentialOwnerName: string;
}

export interface FailureSpikeBriefing {
  id: string;
  title: string;
  impact: string;
  detectedAt: string;
}

export interface BriefingContent {
  asOfDate: string;
  headline: {
    coveredCount: number;
    exposedCount: number;
    /** Critical assets with no known gap but an unconfirmed fact (covered + exposed + unknown = total). */
    unknownCount: number;
    totalCriticalAssets: number;
  };
  upcomingDepartures: UpcomingDepartureBriefing[];
  spofAssets: SpofBriefing[];
  credentialExposures: CredentialExposureBriefing[];
  recentFailures: FailureSpikeBriefing[];
  prose: string;
}

export class WeeklyBriefingService {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;
  /** No SMTP_HOST: mail is rendered to JSON, never delivered. */
  private isDryRun: boolean;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || 'Horquva Continuity <no-reply@horquva.internal>';
    const host = process.env.SMTP_HOST;

    this.isDryRun = !host;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined,
      });
    } else {
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  /**
   * Compiles continuity data for the briefing.
   */
  public static compileBriefingData(ds: DataService, now: Date = new Date()): Omit<BriefingContent, 'prose'> {
    const graph = ds.getGraph();
    const metrics = calculateHeadlineMetrics(graph);
    const headline = {
      coveredCount: metrics.fullyCoveredCriticalAssets,
      exposedCount: metrics.exposedCriticalAssets,
      unknownCount: metrics.unknownCriticalAssets,
      totalCriticalAssets: metrics.totalCriticalAssets,
    };
    const horizonMs = now.getTime() + DEPARTURE_HORIZON_DAYS * DAY_MS;

    // 1. Upcoming departures (next 14 days, non-verified)
    const upcomingDepartures: UpcomingDepartureBriefing[] = ds
      .getDepartures()
      .filter((d) => d.stage !== 'verified' && new Date(d.leaveDate).getTime() <= horizonMs)
      .map((d) => {
        const personNode = graph.getNode(d.personId);
        return {
          id: d.id,
          personName: personNode?.entity?.name ?? d.personId,
          leaveDate: d.leaveDate,
          stage: d.stage,
          unacceptedHandovers: d.handovers.filter((h) => h.acceptance !== 'accepted').length,
        };
      });

    // 2. SPOF critical assets (critical/high, sole owner, 0 backups)
    const spofAssets: SpofBriefing[] = [];
    for (const node of graph.getAllNodes()) {
      const crit = node.facts.get('criticality')?.value;
      if (crit === 'critical' || crit === 'high') {
        const owners = graph.getOwners(node.entity.id);
        const backups = graph.getBackups(node.entity.id);
        if (owners.length === 1 && backups.length === 0) {
          spofAssets.push({
            assetId: node.entity.id,
            assetName: node.entity.name,
            criticality: String(crit),
            ownerName: owners[0].name,
            reason: `Sole owner ${owners[0].name} with no documented backup on record.`,
          });
        }
      }
    }

    // 3. Credential exposures (runs_on_credentials_of)
    const credentialExposures: CredentialExposureBriefing[] = [];
    for (const edge of graph.getAllEdges()) {
      if (edge.type === 'runs_on_credentials_of' && !edge.validTo) {
        const autoNode = graph.getNode(edge.fromId);
        const ownerNode = graph.getNode(edge.toId);
        if (autoNode && ownerNode) {
          credentialExposures.push({
            automationId: autoNode.entity.id,
            automationName: autoNode.entity.name,
            credentialOwnerName: ownerNode.entity.name,
          });
        }
      }
    }

    // 4. Recent failure spikes / unacknowledged change events from last 7 days
    const sevenDaysAgo = now.getTime() - 7 * DAY_MS;
    const recentFailures: FailureSpikeBriefing[] = ds
      .getChangeEvents()
      .filter((c) => {
        const at = new Date(c.detectedAt).getTime();
        return at >= sevenDaysAgo && (c.kind === 'credential_risk' || c.kind === 'failure_spiked');
      })
      .map((c) => ({
        id: c.id,
        title: c.title,
        impact: c.impact,
        detectedAt: c.detectedAt,
      }));

    return {
      asOfDate: now.toISOString().slice(0, 10),
      headline,
      upcomingDepartures,
      spofAssets,
      credentialExposures,
      recentFailures,
    };
  }

  /**
   * Generates executive prose synthesis. Uses Gemini if GEMINI_API_KEY is configured,
   * otherwise deterministic structured markdown fallback.
   */
  public static async generateProse(data: Omit<BriefingContent, 'prose'>): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'mock-key' && apiKey !== 'test-key') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
You are the Horquva Operational Continuity Intelligence Officer.
Write a concise 3-paragraph executive continuity briefing for leadership based on the following verified organizational graph facts.
Do NOT score, rank, or predict individuals (Invariant SEC-07). Focus entirely on systems, processes, and coverage.

Headline:
- Covered Critical Assets: ${data.headline.coveredCount} of ${data.headline.totalCriticalAssets}
- Exposed Critical Assets: ${data.headline.exposedCount}
- Critical Assets With Unconfirmed Facts (unknown, not known-good): ${data.headline.unknownCount}

Upcoming Departures (Next 14 Days):
${data.upcomingDepartures.map((d) => `- ${d.personName} leaving on ${d.leaveDate.slice(0, 10)} (Stage: ${d.stage}, ${d.unacceptedHandovers} unaccepted handovers)`).join('\n') || 'None'}

Key Single Points of Failure:
${data.spofAssets.slice(0, 5).map((s) => `- ${s.assetName} (${s.criticality}): ${s.reason}`).join('\n') || 'None'}

Credential Risks:
${data.credentialExposures.slice(0, 5).map((c) => `- ${c.automationName} runs on personal credentials of ${c.credentialOwnerName}`).join('\n') || 'None'}

Recent Incidents/Failures:
${data.recentFailures.map((f) => `- ${f.title}: ${f.impact}`).join('\n') || 'None'}

Write professional, clear executive prose with actionable recommendations.
`;
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
          contents: prompt,
        });
        const text = response.text?.trim();
        if (text) return text;
      } catch (err: any) {
        console.warn('[WeeklyBriefing] Gemini prose generation failed, falling back to deterministic template:', err.message);
      }
    }

    // Deterministic fallback prose
    const depSummary =
      data.upcomingDepartures.length > 0
        ? `There are ${data.upcomingDepartures.length} scheduled departures in the next 14 days, with ${data.upcomingDepartures.reduce((acc, d) => acc + d.unacceptedHandovers, 0)} handovers awaiting acceptance.`
        : 'There are no departures scheduled within the next 14 days.';

    const spofSummary =
      data.spofAssets.length > 0
        ? `We have identified ${data.spofAssets.length} critical single points of failure with no secondary owner on record.`
        : 'No critical asset is held by a single owner with no backup on record.';

    const credSummary =
      data.credentialExposures.length > 0
        ? `${data.credentialExposures.length} production automations remain bound to individual employee credentials, posing immediate disruption risk upon account deactivation.`
        : "No automation is recorded as running on an individual employee's credentials.";

    return `### Executive Continuity Summary (${data.asOfDate})\n\n` +
      `**Current Posture:** ${data.headline.coveredCount} of ${data.headline.totalCriticalAssets} critical assets are fully covered. ${data.headline.exposedCount} are exposed, and ${data.headline.unknownCount} are unknown until their facts are confirmed.\n\n` +
      `**Operational Exposure:** ${depSummary} ${spofSummary}\n\n` +
      `**Credential & Failure Health:** ${credSummary} During the preceding period, ${data.recentFailures.length} continuity change events were detected across active workflows.`;
  }

  /**
   * Compiles briefing and generates prose.
   */
  public static async compileBriefing(ds: DataService, now: Date = new Date()): Promise<BriefingContent> {
    const raw = this.compileBriefingData(ds, now);
    const prose = await this.generateProse(raw);
    return { ...raw, prose };
  }

  /**
   * Dispatches the briefing to organization admins via Nodemailer.
   */
  public async sendBriefing(
    ds: DataService,
    options: { to?: string[]; now?: Date; dryRun?: boolean } = {}
  ): Promise<{ success: boolean; recipientCount: number; briefing: BriefingContent }> {
    const now = options.now ?? new Date();
    const briefing = await WeeklyBriefingService.compileBriefing(ds, now);

    let recipients = options.to;
    if (!recipients || recipients.length === 0) {
      recipients = ds
        .getUsers()
        .filter((u) => u.role === 'admin')
        .map((u) => u.email);
    }
    if (recipients.length === 0) {
      return { success: false, recipientCount: 0, briefing };
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px; }
    .header { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    .as-of { font-size: 13px; color: #64748b; margin-bottom: 24px; }
    .metric-row { display: flex; gap: 12px; margin: 20px 0; }
    .metric-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; text-align: center; }
    .metric-val { font-size: 22px; font-weight: 700; color: #0f172a; }
    .metric-label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
    .section-title { font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .prose-block { line-height: 1.6; color: #334155; margin: 16px 0; font-size: 14px; }
    .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Weekly Continuity Executive Briefing</div>
    <div class="as-of">As of ${briefing.asOfDate}</div>

    <table width="100%" cellpadding="8" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; margin:16px 0; text-align:center;">
      <tr>
        <td><div style="font-size:22px; font-weight:700; color:#059669;">${briefing.headline.coveredCount}</div><div style="font-size:11px; color:#64748b;">COVERED</div></td>
        <td><div style="font-size:22px; font-weight:700; color:#dc2626;">${briefing.headline.exposedCount}</div><div style="font-size:11px; color:#64748b;">EXPOSED</div></td>
        <td><div style="font-size:22px; font-weight:700; color:#475569;">${briefing.headline.totalCriticalAssets}</div><div style="font-size:11px; color:#64748b;">TOTAL CRITICAL</div></td>
      </tr>
    </table>

    <div class="section-title">Executive Summary</div>
    <div class="prose-block">
      ${escapeHtml(briefing.prose).replace(/\n\n/g, '<br><br>')}
    </div>

    <div class="footer">
      Generated automatically by Horquva Continuity Platform. Protected under strict privacy guarantees (SEC-07).
    </div>
  </div>
</body>
</html>
`;

    if (!options.dryRun) {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: recipients.join(', '),
        subject: `[Horquva Continuity] Weekly Executive Briefing — ${briefing.asOfDate}`,
        text: briefing.prose,
        html,
      });

      ds.addAuditEntry(
        'system:weekly-briefing',
        'SEND_WEEKLY_BRIEFING',
        'notifications:briefing',
        this.isDryRun
          ? `Weekly briefing rendered for ${recipients.length} recipient(s); not delivered (SMTP not configured).`
          : `Dispatched weekly briefing to ${recipients.length} recipient(s).`
      );
    }

    return {
      success: true,
      recipientCount: recipients.length,
      briefing,
    };
  }
}
