// =============================================================================
// Horquva Continuity Platform — PDF Generation Service (RPT-01, RPT-02, RPT-03)
// =============================================================================
// Generates board-ready, high-resolution vector PDFs using PDFKit:
// 1. Handover Pack PDF (RPT-01): Leaver metadata, transferred assets, personal
//    credential automations at risk, runbooks, and HR/Manager sign-off blocks.
// 2. Executive continuity report (RPT-02): the Overview's figures (headline,
//    trend, causes, departures, single points of failure) plus next steps.
//
// Invariant RPT-03: PDFs are built from the exact same authoritative graph data
// as the frontend screens and prominently display evidence grades (stated,
// inferred, confirmed, unknown) and ISO as-of timestamps.
// =============================================================================

import PDFDocument from 'pdfkit';
import type { DataService, DepartureRecord } from '../services/dataService.js';
import { calculateHeadlineMetrics, evaluateAllChecks } from '../domain/checks/index.js';
import { coverageTrend, exposureByCause, spofAssets } from '../views/overviewViews.js';
import { departureSummary } from '../views/departureViews.js';

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

// ── Executive continuity report (RPT-02) ───────────────────────────────────────

/** Brand palette (light theme tokens from the web app), so the PDF reads as the same product. */
const BRAND = {
  ink: '#15120F',
  ink2: '#4A433C',
  ink3: '#6E655C',
  rule: '#DAD2C4',
  canvas: '#F3EFE7',
  bronze: '#A9825A',
  bronzeInk: '#7F603B',
  pass: '#2F6B2A',
  fail: '#B3261E',
  unknown: '#6B6560',
};

const PAGE = { width: 595.28, height: 841.89, margin: 48 };
const CONTENT_W = PAGE.width - PAGE.margin * 2;
const BOTTOM = PAGE.height - PAGE.margin - 28; // leave room for the footer

function longDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(d);
}
function ymdDate(ymd: string): string {
  return longDate(new Date(`${ymd.slice(0, 10)}T00:00:00Z`));
}

/**
 * RPT-02 & RPT-03: the executive continuity report. Same figures as the Overview
 * (headline, week-on-week change, causes, departures, single points of failure),
 * all counted from records; nothing is scored, estimated or written by AI.
 */
export async function generateExecutiveScanPdf(ds: DataService, options: PdfGenerationOptions = {}): Promise<Buffer> {
  const now = options.now ?? new Date();
  const graph = ds.getGraph();
  const headline = calculateHeadlineMetrics(graph);
  const trend = await coverageTrend(headline, now);
  const causes = exposureByCause(evaluateAllChecks(graph));
  const topSpofs = spofAssets(ds, 5);
  const departures = ds
    .getDepartures()
    .map((d) => departureSummary(d, ds))
    .filter((d) => d.group !== 'departed')
    .sort((a, b) => a.leaveDate.localeCompare(b.leaveDate));
  const org = ds.getOrganization();
  const asOf = `${longDate(now)}, ${now.toISOString().slice(11, 16)} UTC`;

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: PAGE.margin,
        size: 'A4',
        bufferPages: true,
        info: { Title: `${org.companyName} — Continuity report`, Author: 'Horquva OBA' },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const L = PAGE.margin;
      let y = PAGE.margin;

      const ensure = (h: number) => {
        if (y + h > BOTTOM) {
          doc.addPage();
          y = PAGE.margin;
        }
      };
      const section = (title: string, subtitle?: string) => {
        ensure(64);
        y += 8;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND.ink).text(title, L, y);
        y += 16;
        if (subtitle) {
          doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.ink3).text(subtitle, L, y, { width: CONTENT_W });
          y += doc.heightOfString(subtitle, { width: CONTENT_W }) + 2;
        }
        doc.moveTo(L, y + 4).lineTo(L + CONTENT_W, y + 4).lineWidth(0.5).strokeColor(BRAND.rule).stroke();
        y += 14;
      };

      // ── Header ─────────────────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(18).fillColor(BRAND.ink).text(org.companyName, L, y);
      doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink3).text(`As of ${asOf}`, L, y + 5, { width: CONTENT_W, align: 'right' });
      y += 24;
      doc.font('Helvetica').fontSize(10).fillColor(BRAND.bronzeInk).text('Continuity report', L, y);
      y += 22;
      doc.moveTo(L, y).lineTo(L + CONTENT_W, y).lineWidth(0.75).strokeColor(BRAND.rule).stroke();
      y += 22;

      // ── Headline ───────────────────────────────────────────────────────────
      const total = headline.totalCriticalAssets;
      doc.font('Helvetica-Bold').fontSize(30).fillColor(BRAND.ink).text(`${headline.fullyCoveredCriticalAssets} of ${total}`, L, y);
      y += 34;
      doc.font('Helvetica').fontSize(12).fillColor(BRAND.ink2).text('critical assets fully covered', L, y);
      y += 18;
      if (trend) {
        const d = trend.covered;
        const text = d === 0 ? 'No change' : `${d > 0 ? '+' : '−'}${Math.abs(d)} covered`;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(d > 0 ? BRAND.pass : d < 0 ? BRAND.fail : BRAND.ink3).text(text, L, y, { continued: true });
        doc.font('Helvetica').fillColor(BRAND.ink3).text(` since ${ymdDate(trend.comparedTo)}`);
      } else {
        doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink3).text('Week-on-week change appears after 7 days of history.', L, y);
      }
      y += 22;

      // Coverage bar with a 2pt gap between segments, then its legend.
      const segs: Array<[number, string, string]> = [
        [headline.fullyCoveredCriticalAssets, BRAND.pass, 'covered'],
        [headline.exposedCriticalAssets, BRAND.fail, 'exposed'],
        [headline.unknownCriticalAssets, BRAND.unknown, 'unknown'],
      ];
      doc.roundedRect(L, y, CONTENT_W, 7, 3.5).fill(BRAND.canvas);
      let x = L;
      const drawn = segs.filter(([n]) => n > 0);
      drawn.forEach(([n, color], i) => {
        const w = total > 0 ? (n / total) * CONTENT_W - (i < drawn.length - 1 ? 2 : 0) : 0;
        if (w > 0) doc.roundedRect(x, y, w, 7, 3.5).fill(color);
        x += w + 2;
      });
      y += 15;
      x = L;
      for (const [n, color, label] of segs) {
        doc.rect(x, y + 1.5, 6, 6).fill(color);
        const t = `${n} ${label}`;
        doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.ink2).text(t, x + 10, y);
        x += 10 + doc.widthOfString(t) + 18;
      }
      y += 26;

      // Stat boxes. Unknown keeps a dashed outline: unknown is never "no" (DATA-03).
      const boxes: Array<[string, number, boolean]> = [
        ['Covered', headline.fullyCoveredCriticalAssets, false],
        ['Exposed', headline.exposedCriticalAssets, false],
        ['Unknown', headline.unknownCriticalAssets, true],
        ['Unconfirmed facts', headline.unknownCriticalFacts, false],
      ];
      const gap = 10;
      const bw = (CONTENT_W - gap * 3) / 4;
      boxes.forEach(([label, value, dashed], i) => {
        const bx = L + i * (bw + gap);
        doc.roundedRect(bx, y, bw, 52, 6).fill(BRAND.canvas);
        if (dashed) doc.roundedRect(bx, y, bw, 52, 6).dash(3, { space: 2 }).lineWidth(0.75).strokeColor(BRAND.unknown).stroke().undash();
        doc.font('Helvetica').fontSize(8).fillColor(BRAND.ink3).text(label, bx + 10, y + 10);
        doc.font('Helvetica-Bold').fontSize(18).fillColor(BRAND.ink).text(String(value), bx + 10, y + 24);
      });
      y += 72;

      // ── Where the exposure comes from ─────────────────────────────────────
      section('Where the exposure comes from', 'Critical assets failing each check. One asset can fail more than one, so rows do not add up.');
      const labelW = 150;
      const valueW = 60;
      const barW = CONTENT_W - labelW - valueW - 16;
      for (const c of causes) {
        ensure(20);
        doc.font('Helvetica').fontSize(9).fillColor(c.assets > 0 ? BRAND.ink : BRAND.ink3).text(c.label, L, y);
        doc.roundedRect(L + labelW, y + 2, barW, 7, 2).fill(BRAND.canvas);
        if (c.assets > 0 && total > 0) doc.roundedRect(L + labelW, y + 2, (c.assets / total) * barW, 7, 2).fill(BRAND.bronze);
        doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink2).text(`${c.assets} of ${total}`, L + CONTENT_W - valueW, y, { width: valueW, align: 'right' });
        y += 19;
      }
      y += 10;

      // ── Upcoming departures ───────────────────────────────────────────────
      section('Upcoming departures', 'People leaving, soonest first, with how many of their critical assets are handed over.');
      if (departures.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink3).text('No departures are recorded.', L, y);
        y += 20;
      }
      for (const d of departures) {
        ensure(40);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BRAND.ink).text(d.person.name, L, y);
        doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink2).text(`Leaves ${ymdDate(d.leaveDate)}`, L, y, { width: CONTENT_W, align: 'right' });
        y += 13;
        const meta = `${d.role || d.team || 'Team member'} · ${d.assetsHandedOver} of ${d.assetsTotal} handed over`;
        doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.ink3).text(meta, L, y);
        y += 12;
        if (d.hasAlert) {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BRAND.fail).text('Critical assets without an accepted successor', L, y);
          y += 12;
        }
        y += 8;
      }
      y += 4;

      // ── Single points of failure ──────────────────────────────────────────
      section('Single points of failure', 'Critical assets that stop if one person or one credential goes away.');
      const colAsset = 160;
      const colRuns = 70;
      const colWhy = CONTENT_W - colAsset - colRuns - 20;
      if (topSpofs.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink3).text('Every critical asset has a backup on record.', L, y);
        y += 20;
      } else {
        ensure(24);
        doc.font('Helvetica').fontSize(8).fillColor(BRAND.ink3);
        doc.text('Asset', L, y);
        doc.text('Why it is exposed', L + colAsset + 10, y);
        doc.text('Runs per week', L + CONTENT_W - colRuns, y, { width: colRuns, align: 'right' });
        y += 14;
        for (const s of topSpofs) {
          doc.font('Helvetica').fontSize(9);
          const h = Math.max(doc.heightOfString(s.asset.name, { width: colAsset }), doc.heightOfString(s.reason, { width: colWhy })) + 12;
          ensure(h);
          doc.moveTo(L, y).lineTo(L + CONTENT_W, y).lineWidth(0.5).strokeColor(BRAND.rule).stroke();
          y += 6;
          doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.ink).text(s.asset.name, L, y, { width: colAsset });
          doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink2).text(s.reason, L + colAsset + 10, y, { width: colWhy });
          // 0 runs is a real count; only a missing value is unknown.
          const runs = s.runsPerWeek === null ? 'Unknown' : s.runsPerWeek.toLocaleString('en-US');
          doc.fillColor(s.runsPerWeek === null ? BRAND.ink3 : BRAND.ink).text(runs, L + CONTENT_W - colRuns, y, { width: colRuns, align: 'right' });
          y += h - 6;
        }
        y += 10;
      }

      // ── AI model concentration (only when recorded) ───────────────────────
      const modelCounts = new Map<string, number>();
      for (const edge of graph.getAllEdges()) {
        if (edge.type === 'calls_model' && !edge.validTo) {
          const name = graph.getNode(edge.toId)?.entity?.name ?? edge.toId;
          modelCounts.set(name, (modelCounts.get(name) ?? 0) + 1);
        }
      }
      if (modelCounts.size > 0) {
        section('AI model dependencies', 'Automations that call each external AI model directly.');
        for (const [name, count] of modelCounts.entries()) {
          ensure(18);
          doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink).text(name, L, y);
          doc.fillColor(BRAND.ink2).text(`${count} ${count === 1 ? 'automation' : 'automations'}`, L, y, { width: CONTENT_W, align: 'right' });
          y += 17;
        }
        y += 8;
      }

      // ── Recommended next steps (each tied to a finding above) ─────────────
      section('Recommended next steps');
      const personalCredentialAutomations = graph.getAllEdges().filter((e) => e.type === 'runs_on_credentials_of' && !e.validTo).length;
      const recs: string[] = [];
      if (topSpofs.length > 0) recs.push(`Name a backup for the ${topSpofs.length} single ${topSpofs.length === 1 ? 'point' : 'points'} of failure listed above.`);
      const alerted = departures.filter((d) => d.hasAlert).length;
      if (alerted > 0) recs.push(`Get a successor accepted for the critical assets of ${alerted} departing ${alerted === 1 ? 'person' : 'people'}.`);
      if (personalCredentialAutomations > 0) {
        recs.push(
          `Move ${personalCredentialAutomations} ${personalCredentialAutomations === 1 ? 'automation' : 'automations'} off personal credentials onto service accounts.`,
        );
      }
      if (headline.unknownCriticalFacts > 0) {
        recs.push(`Ask owners to confirm the ${headline.unknownCriticalFacts} unconfirmed ${headline.unknownCriticalFacts === 1 ? 'fact' : 'facts'} on critical assets.`);
      }
      if (recs.length === 0) recs.push('No open findings need action as of this report.');
      recs.forEach((rec, i) => {
        doc.font('Helvetica').fontSize(9.5);
        const h = doc.heightOfString(rec, { width: CONTENT_W - 22 }) + 8;
        ensure(h);
        doc.font('Helvetica-Bold').fillColor(BRAND.bronzeInk).text(String(i + 1).padStart(2, '0'), L, y);
        doc.font('Helvetica').fillColor(BRAND.ink).text(rec, L + 22, y, { width: CONTENT_W - 22 });
        y += h;
      });

      // ── Footer on every page ──────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        // Text below the bottom margin makes PDFKit start a new page; the footer lives there.
        doc.page.margins.bottom = 0;
        const fy = PAGE.height - PAGE.margin + 6;
        doc.moveTo(L, fy - 8).lineTo(L + CONTENT_W, fy - 8).lineWidth(0.5).strokeColor(BRAND.rule).stroke();
        doc.font('Helvetica').fontSize(7.5).fillColor(BRAND.ink3);
        doc.text('Horquva OBA · Every figure is counted from records; nothing is scored or estimated.', L, fy, { width: CONTENT_W, lineBreak: false });
        doc.text(`Page ${i - range.start + 1} of ${range.count}`, L, fy, { width: CONTENT_W, align: 'right', lineBreak: false });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
