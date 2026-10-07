// =============================================================================
// Horquva Continuity Platform — PDF Generation Service (RPT-01, RPT-02, RPT-03)
// =============================================================================
// Generates board-ready, high-resolution vector PDFs using PDFKit:
// 1. Handover Pack PDF (RPT-01): Leaver metadata, transferred assets, personal
//    credential automations at risk, runbooks, and HR/Manager sign-off blocks.
// 2. Executive Scan Report PDF (RPT-02): Headline continuity coverage count,
//    top SPOFs, vendor/model concentration, and recommended actions.
//
// Invariant RPT-03: PDFs are built from the exact same authoritative graph data
// as the frontend screens and prominently display evidence grades (stated,
// inferred, confirmed, unknown) and ISO as-of timestamps.
// =============================================================================

import PDFDocument from 'pdfkit';
import type { DataService, DepartureRecord } from '../services/dataService.js';
import { calculateHeadlineMetrics } from '../domain/checks/index.js';
import { spofAssets } from '../views/overviewViews.js';

export interface PdfGenerationOptions {
  now?: Date;
}

/**
 * RPT-01 & RPT-03: Generates a complete Departure Handover Pack PDF buffer.
 */
export async function generateHandoverPackPdf(
  ds: DataService,
  departureId: string,
  options: PdfGenerationOptions = {}
): Promise<Buffer> {
  const dep = ds.getDeparture(departureId);
  if (!dep) {
    throw new Error(`Departure ${departureId} not found.`);
  }

  const now = options.now ?? new Date();
  const graph = ds.getGraph();
  const personNode = graph.getNode(dep.personId);
  const personName = personNode?.entity?.name ?? dep.personId;
  const asOf = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Colors
      const primaryColor = '#0f172a';
      const secondaryColor = '#3b82f6';
      const mutedColor = '#64748b';
      const borderColor = '#e2e8f0';

      // ── Header ─────────────────────────────────────────────────────────────
      doc.fontSize(22).fillColor(primaryColor).text('HORQUVA', 40, 40);
      doc.fontSize(10).fillColor(mutedColor).text('OPERATIONAL CONTINUITY PLATFORM', 40, 68);

      doc.fontSize(16).fillColor(primaryColor).text('Departure Handover Pack', 40, 95);
      doc.fontSize(9).fillColor(mutedColor).text(`As-of timestamp: ${asOf} | Evidence standard: SCD Type 2`, 40, 115);

      doc.moveTo(40, 130).lineTo(555, 130).strokeColor(borderColor).stroke();

      // ── Leaver Metadata ─────────────────────────────────────────────────────
      doc.fontSize(12).fillColor(primaryColor).text('1. Departing Personnel Metadata', 40, 145);

      doc.fontSize(9).fillColor(mutedColor).text('NAME:', 40, 168);
      doc.fontSize(10).fillColor(primaryColor).text(personName, 120, 168);

      doc.fontSize(9).fillColor(mutedColor).text('ENTITY ID:', 40, 186);
      doc.fontSize(9).fillColor(primaryColor).text(dep.personId, 120, 186);

      doc.fontSize(9).fillColor(mutedColor).text('LEAVE DATE:', 40, 204);
      doc.fontSize(10).fillColor(primaryColor).text(dep.leaveDate.slice(0, 10), 120, 204);

      doc.fontSize(9).fillColor(mutedColor).text('STAGE:', 40, 222);
      doc.fontSize(10).fillColor(secondaryColor).text(dep.stage.toUpperCase(), 120, 222);

      doc.moveTo(40, 242).lineTo(555, 242).strokeColor(borderColor).stroke();

      // ── Transferred Assets Table ────────────────────────────────────────────
      let y = 255;
      doc.fontSize(12).fillColor(primaryColor).text('2. Transferred Assets & Successor Coverage', 40, y);
      y += 20;

      // Table Header
      doc.rect(40, y, 515, 20).fill('#f8fafc');
      doc.fontSize(8).fillColor(mutedColor);
      doc.text('ASSET NAME', 45, y + 6);
      doc.text('CRITICALITY', 200, y + 6);
      doc.text('EVIDENCE GRADE', 290, y + 6);
      doc.text('SUCCESSOR', 390, y + 6);
      doc.text('STATUS', 475, y + 6);
      y += 22;

      for (const h of dep.handovers) {
        const node = graph.getNode(h.assetId);
        const name = node?.entity?.name ?? h.assetId;
        const critFact = node?.facts.get('criticality');
        const crit = critFact ? String(critFact.value) : 'unknown';
        const grade = critFact?.grade ?? 'unknown';

        const succNode = h.successorId ? graph.getNode(h.successorId) : null;
        const succName = succNode?.entity?.name ?? (h.successorId ? h.successorId : 'None');

        doc.fontSize(8).fillColor(primaryColor).text(name.slice(0, 30), 45, y);
        doc.fillColor(crit === 'critical' ? '#dc2626' : '#2563eb').text(crit.toUpperCase(), 200, y);
        doc.fillColor(grade === 'confirmed' ? '#059669' : '#d97706').text(grade.toUpperCase(), 290, y);
        doc.fillColor(primaryColor).text(succName.slice(0, 16), 390, y);
        doc.fillColor(h.acceptance === 'accepted' ? '#059669' : '#b45309').text(h.acceptance.toUpperCase(), 475, y);

        y += 18;
        if (y > 720) {
          doc.addPage();
          y = 40;
        }
      }

      // ── Personal Credential Automations ────────────────────────────────────
      y += 15;
      if (y > 680) {
        doc.addPage();
        y = 40;
      }

      doc.fontSize(12).fillColor(primaryColor).text('3. Personal Credential Automations at Risk (HND-07)', 40, y);
      y += 18;

      const personalEdges = graph
        .getAllEdges()
        .filter((e) => e.type === 'runs_on_credentials_of' && e.toId === dep.personId);

      if (personalEdges.length === 0) {
        doc.fontSize(9).fillColor(mutedColor).text('No automations are bound to personal credentials of this employee.', 45, y);
        y += 20;
      } else {
        for (const pe of personalEdges) {
          const autoNode = graph.getNode(pe.fromId);
          const autoName = autoNode?.entity?.name ?? pe.fromId;
          const runsFact = autoNode?.facts.get('run_volume_weekly');
          const runs = typeof runsFact?.value === 'number' ? `${runsFact.value} runs/week` : 'volume unknown';

          doc.fontSize(9).fillColor('#dc2626').text(`- ${autoName}`, 45, y);
          doc.fontSize(8).fillColor(mutedColor).text(`(${runs}) — Must migrate to service account prior to account disable.`, 180, y);
          y += 16;
        }
      }

      // ── Runbooks & Documentation ───────────────────────────────────────────
      y += 15;
      if (y > 680) {
        doc.addPage();
        y = 40;
      }

      doc.fontSize(12).fillColor(primaryColor).text('4. Runbooks & Operational Documentation', 40, y);
      y += 18;

      let docFound = false;
      for (const h of dep.handovers) {
        const node = graph.getNode(h.assetId);
        const name = node?.entity?.name ?? h.assetId;
        const docFact = node?.facts.get('documented');
        if (docFact && docFact.value) {
          docFound = true;
          const url: string | undefined = (node?.entity?.externalRefs as any)?.runbookUrl;
          doc.fontSize(9).fillColor(primaryColor).text(`- ${name}:`, 45, y);
          if (url) doc.fontSize(9).fillColor(secondaryColor).text(url, 200, y);
          else doc.fontSize(9).fillColor(mutedColor).text(`Documented (${docFact.grade}); no runbook link on record.`, 200, y);
          y += 16;
        }
      }
      if (!docFound) {
        doc.fontSize(9).fillColor(mutedColor).text('No transferred asset is recorded as documented.', 45, y);
        y += 20;
      }

      // ── Sign-off Block ─────────────────────────────────────────────────────
      y += 25;
      if (y > 650) {
        doc.addPage();
        y = 50;
      }

      doc.rect(40, y, 515, 95).strokeColor(borderColor).stroke();
      doc.fontSize(10).fillColor(primaryColor).text('5. Operational Continuity Verification & Sign-off', 50, y + 10);

      doc.fontSize(8).fillColor(mutedColor).text('DEPARTMENT MANAGER SIGN-OFF:', 50, y + 35);
      doc.moveTo(190, y + 45).lineTo(340, y + 45).strokeColor(mutedColor).stroke();
      doc.text('DATE:', 355, y + 35);
      doc.moveTo(385, y + 45).lineTo(530, y + 45).strokeColor(mutedColor).stroke();

      doc.fontSize(8).fillColor(mutedColor).text('PEOPLE OPERATIONS (HR) SIGN-OFF:', 50, y + 65);
      doc.moveTo(190, y + 75).lineTo(340, y + 75).strokeColor(mutedColor).stroke();
      doc.text('DATE:', 355, y + 65);
      doc.moveTo(385, y + 75).lineTo(530, y + 75).strokeColor(mutedColor).stroke();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * RPT-02 & RPT-03: Generates a board-ready Executive Scan Report PDF buffer.
 */
export async function generateExecutiveScanPdf(
  ds: DataService,
  options: PdfGenerationOptions = {}
): Promise<Buffer> {
  const now = options.now ?? new Date();
  const graph = ds.getGraph();
  const headline = calculateHeadlineMetrics(graph);
  const topSpofs = spofAssets(ds, 5);
  const org = ds.getOrganization();
  const asOf = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const primaryColor = '#0f172a';
      const secondaryColor = '#3b82f6';
      const mutedColor = '#64748b';
      const borderColor = '#e2e8f0';

      // ── Header ─────────────────────────────────────────────────────────────
      doc.fontSize(22).fillColor(primaryColor).text(org.companyName.toUpperCase(), 40, 40);
      doc.fontSize(10).fillColor(mutedColor).text('EXECUTIVE OPERATIONAL CONTINUITY BRIEFING', 40, 68);

      doc.fontSize(16).fillColor(primaryColor).text('System-Wide Continuity Scan Report', 40, 95);
      doc.fontSize(9).fillColor(mutedColor).text(`As-of timestamp: ${asOf} | Privacy Guarantee: SEC-07 Active`, 40, 115);

      doc.moveTo(40, 130).lineTo(555, 130).strokeColor(borderColor).stroke();

      // ── Section 1: Headline Continuity Posture ─────────────────────────────
      doc.fontSize(12).fillColor(primaryColor).text('1. Headline Continuity Posture', 40, 145);

      // Metric Boxes
      const boxes: Array<[number, string, string, string]> = [
        [headline.fullyCoveredCriticalAssets, 'COVERED CRITICAL ASSETS', '#f0fdf4', '#16a34a'],
        [headline.exposedCriticalAssets, 'EXPOSED CRITICAL ASSETS', '#fef2f2', '#dc2626'],
        [headline.unknownCriticalAssets, 'UNKNOWN CRITICAL ASSETS', '#f8fafc', '#64748b'],
        [headline.totalCriticalAssets, 'TOTAL CRITICAL ASSETS', '#f8fafc', '#0f172a'],
      ];
      boxes.forEach(([value, label, bg, fg], i) => {
        const x = 40 + i * 130;
        doc.rect(x, 168, 125, 50).fill(bg);
        // Unknown is never "No": dashed outline keeps it visually distinct (DATA-03)
        if (label.startsWith('UNKNOWN')) doc.rect(x, 168, 125, 50).dash(3, { space: 2 }).strokeColor('#94a3b8').stroke().undash();
        doc.fontSize(20).fillColor(fg).text(String(value), x + 5, 175);
        doc.fontSize(8).fillColor(mutedColor).text(label, x + 5, 202);
      });

      doc.fontSize(9).fillColor(mutedColor).text(
        `${headline.fullyCoveredCriticalAssets} of ${headline.totalCriticalAssets} critical assets fully covered | ` +
        `Unconfirmed facts on critical assets: ${headline.unknownCriticalFacts}`,
        40,
        228
      );

      doc.moveTo(40, 245).lineTo(555, 245).strokeColor(borderColor).stroke();

      // ── Section 2: Top Single Points of Failure ────────────────────────────
      let y = 260;
      doc.fontSize(12).fillColor(primaryColor).text('2. Top Single Points of Failure (SPOFs)', 40, y);
      y += 20;

      // Table Header
      doc.rect(40, y, 515, 18).fill('#f8fafc');
      doc.fontSize(8).fillColor(mutedColor);
      doc.text('CRITICAL ASSET', 45, y + 5);
      doc.text('PRIMARY DEPENDENCY', 200, y + 5);
      doc.text('WEEKLY RUNS', 340, y + 5);
      doc.text('FAILURE REASON', 415, y + 5);
      y += 22;

      for (const spof of topSpofs) {
        doc.fontSize(8).fillColor(primaryColor).text(spof.asset.name.slice(0, 28), 45, y);
        doc.text(spof.dependsOn.name.slice(0, 20), 200, y);
        doc.text(spof.runsPerWeek ? String(spof.runsPerWeek) : 'unknown', 340, y);
        doc.fillColor('#dc2626').text(spof.reason.slice(0, 25), 415, y);

        y += 18;
      }

      // ── Section 3: Vendor & Model Concentrations ───────────────────────────
      y += 15;
      doc.fontSize(12).fillColor(primaryColor).text('3. Vendor & Foundation Model Concentrations (SIM-06)', 40, y);
      y += 20;

      // Count model calls
      const modelCounts = new Map<string, number>();
      for (const edge of graph.getAllEdges()) {
        if (edge.type === 'calls_model' && !edge.validTo) {
          const modelNode = graph.getNode(edge.toId);
          const name = modelNode?.entity?.name ?? edge.toId;
          modelCounts.set(name, (modelCounts.get(name) ?? 0) + 1);
        }
      }

      if (modelCounts.size === 0) {
        doc.fontSize(9).fillColor(mutedColor).text('Zero automated dependencies on external AI foundation models recorded.', 45, y);
        y += 18;
      } else {
        for (const [modelName, count] of modelCounts.entries()) {
          doc.fontSize(9).fillColor(primaryColor).text(`- ${modelName}:`, 45, y);
          doc.fontSize(9).fillColor(secondaryColor).text(`${count} production automations depend directly on this model`, 180, y);
          y += 16;
        }
      }

      // ── Section 4: Recommended Continuity Actions ─────────────────────────
      y += 15;
      doc.fontSize(12).fillColor(primaryColor).text('4. Recommended Remediation Actions', 40, y);
      y += 20;

      // Each recommendation is tied to a finding in this report; none is printed without one.
      const personalCredentialAutomations = graph
        .getAllEdges()
        .filter((e) => e.type === 'runs_on_credentials_of' && !e.validTo).length;
      const recommendations: string[] = [];
      if (topSpofs.length > 0) {
        recommendations.push(`Name a backup for the ${topSpofs.length} single point(s) of failure listed above.`);
      }
      if (personalCredentialAutomations > 0) {
        recommendations.push(`Move ${personalCredentialAutomations} automation(s) off personal credentials onto service accounts.`);
      }
      if (headline.unknownCriticalFacts > 0) {
        recommendations.push(`Run a confirmation campaign for the ${headline.unknownCriticalFacts} unconfirmed fact(s) on critical assets.`);
      }
      if (recommendations.length === 0) {
        recommendations.push('No open findings require action as of this report.');
      }
      recommendations.forEach((rec, i) => (recommendations[i] = `${i + 1}. ${rec}`));

      for (const rec of recommendations) {
        doc.fontSize(9).fillColor(primaryColor).text(rec, 45, y);
        y += 16;
      }

      // ── Footer ─────────────────────────────────────────────────────────────
      doc.fontSize(8).fillColor(mutedColor).text(
        'Generated by Horquva Continuity Platform. All rights reserved. SEC-07 Invariant Enforced.',
        40,
        780,
        { align: 'center', width: 515 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
