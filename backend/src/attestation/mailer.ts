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
  assetName: string;
  magicLinkUrl: string;
  campaignDueDate: Date;
}

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

  public async sendAttestationEmail(options: MailerOptions): Promise<{ success: boolean; previewUrl?: string }> {
    const dueDateFormatted = options.campaignDueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
    .asset-card { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 20px 0; }
    .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-weight: 600; border-radius: 6px; margin: 20px 0; }
    .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Operational Continuity Attestation</div>
    <p>Hi ${options.reviewerName},</p>
    <p>You have been identified as the primary owner of the following automated business process:</p>
    
    <div class="asset-card">
      <strong style="font-size: 16px;">${options.assetName}</strong>
    </div>

    <p>To ensure organizational continuity if you are away, please take 60 seconds to confirm the backup owner, runbook link, and operational fallback procedure.</p>

    <div style="text-align: center;">
      <a href="${options.magicLinkUrl}" class="btn">Confirm Operational Details</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      Please submit by <strong>${dueDateFormatted}</strong>. This single-use link requires no login password.
    </p>

    <div class="footer">
      Powered by Horquva Continuity Platform &bull; Zero external trackers &bull; Internal Company Notice
    </div>
  </div>
</body>
</html>
    `.trim();

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: `[Continuity Review] Action required: Confirm details for ${options.assetName}`,
        html,
      });

      if (this.isDryRun) {
        console.log(`[AttestationMailer] DRY-RUN email sent to ${options.to}. Magic Link: ${options.magicLinkUrl}`);
      }

      return { success: true };
    } catch (err) {
      console.error('[AttestationMailer] Failed to send email:', err);
      return { success: false };
    }
  }
}
