// =============================================================================
// Horquva Continuity Platform — Attestation Mailer & Magic Link Delivery
// =============================================================================
// Sends single-use access-review magic links to asset owners via standard SMTP.
// Architecture Decision AD-10: Standard corporate SMTP with zero vendor sub-processors.
// =============================================================================

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface MailerOptions {
  to: string;
  reviewerName: string;
  /** The systems this reviewer is asked about, by name. */
  assetNames: string[];
  magicLinkUrl: string;
  campaignDueDate: Date;
  /** Last day the link works (due date + grace). */
  linkExpiresAt: Date;
  /** Admin-written wording from the campaign wizard (plain text; escaped here). */
  subject?: string;
  introLine?: string | null;
  bodyText?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export class AttestationMailer {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;
  private isDryRun: boolean;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || 'Horquva Continuity <no-reply@horquva.internal>';
    const host = process.env.SMTP_HOST;

    if (host) {
      this.isDryRun = false;
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
      // Dry-run / development mode
      this.isDryRun = true;
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  public async sendAttestationEmail(options: MailerOptions): Promise<{ success: boolean }> {
    const { subject, html, text } = renderAttestationEmail(options);
    try {
      await this.transporter.sendMail({ from: this.fromAddress, to: options.to, subject, html, text });
      if (this.isDryRun) {
        console.log(`[AttestationMailer] DRY-RUN email to ${options.to}. Magic Link: ${options.magicLinkUrl}`);
      }
      return { success: true };
    } catch (err) {
      console.error('[AttestationMailer] Failed to send email:', err);
      return { success: false };
    }
  }
}

export const DEFAULT_SUBJECT = 'Please confirm who owns and backs up your systems';
export const DEFAULT_BODY =
  'You are listed as the owner of the systems below. Please confirm who backs each one up, whether it is documented, and whether there is a fallback. It takes about a minute per system.';

const formatDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/**
 * The exact email a reviewer receives. The campaign wizard previews this same
 * output, so what the admin sees is what gets sent.
 */
export function renderAttestationEmail(options: Omit<MailerOptions, 'to'>): { subject: string; html: string; text: string } {
  const due = formatDay(options.campaignDueDate);
  const expires = formatDay(options.linkExpiresAt);
  const count = options.assetNames.length;
  const systems = count === 1 ? 'this system' : `these ${count} systems`;
  const subject = options.subject || DEFAULT_SUBJECT;
  const body = options.bodyText || DEFAULT_BODY;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px; }
    .header { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
    .asset-card { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin: 20px 0; }
    .asset-card li { margin: 4px 0; font-weight: 600; }
    .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-weight: 600; border-radius: 6px; margin: 20px 0; }
    .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Operational Continuity Confirmation</div>
    <p>Hi ${escapeHtml(options.reviewerName)},</p>
    ${options.introLine ? `<p>${escapeHtml(options.introLine)}</p>` : ''}
    <p>${escapeHtml(body)}</p>

    <div class="asset-card">
      <ul style="margin: 0; padding-left: 18px;">
        ${options.assetNames.map((n) => `<li>${escapeHtml(n)}</li>`).join('\n        ')}
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="${escapeHtml(options.magicLinkUrl)}" class="btn">Confirm ${systems}</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      Please answer by <strong>${due}</strong>. The link is personal to you, needs no password, and works until ${expires}; please don't forward it.
    </p>

    <div class="footer">
      Sent by Horquva Continuity Platform &bull; No external trackers &bull; Internal company notice
    </div>
  </div>
</body>
</html>`.trim();

  const text = [
    `Hi ${options.reviewerName},`,
    '',
    ...(options.introLine ? [options.introLine, ''] : []),
    body,
    '',
    ...options.assetNames.map((n) => `- ${n}`),
    '',
    `Confirm ${systems}: ${options.magicLinkUrl}`,
    '',
    `Please answer by ${due}. The link is personal to you, needs no password, and works until ${expires}; please don't forward it.`,
  ].join('\n');

  return { subject, html, text };
}
