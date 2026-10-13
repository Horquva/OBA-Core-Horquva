// =============================================================================
// Horquva Continuity Platform — PDF Generation Service (RPT-01, RPT-02, RPT-03)
// =============================================================================
// Generates board-ready, high-resolution vector PDFs using PDFKit:
// 1. Handover pack (RPT-01): who is leaving, each asset's successor and
//    acceptance, automations on their credentials, runbooks, and sign-off.
// 2. Executive continuity report (RPT-02): the Overview's figures (headline,
//    trend, causes, departures, single points of failure) plus next steps.
//
// Invariant RPT-03: PDFs are built from the exact same authoritative graph data
// as the frontend screens and prominently display evidence grades (stated,
// inferred, confirmed, unknown) and ISO as-of timestamps.
// =============================================================================

import PDFDocument from 'pdfkit';
import type { DataService } from '../services/dataService.js';
import { calculateHeadlineMetrics, evaluateAllChecks } from '../domain/checks/index.js';
import { coverageTrend, exposureByCause, spofAssets } from '../views/overviewViews.js';
import { departureSummary } from '../views/departureViews.js';

export interface PdfGenerationOptions {
  now?: Date;
}

/**
 * RPT-01 & RPT-03: the departure handover pack, in the same brand style as the
 * continuity report. Lists every asset with its successor and acceptance, what runs on
 * the leaver's own credentials, runbook status, and a sign-off block.
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
  const summary = departureSummary(dep, ds);
  const org = ds.getOrganization();
  const asOf = `${longDate(now)}, ${now.toISOString().slice(11, 16)} UTC`;
  const stageIndex = STAGE_ORDER.indexOf(dep.stage) + 1;

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: PAGE.margin,
        size: 'A4',
        bufferPages: true,
        info: { Title: `${summary.person.name} — Handover pack`, Author: 'Horquva OBA' },
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
      doc.font('Helvetica').fontSize(10).fillColor(BRAND.bronzeInk).text('Handover pack', L, y);
      y += 22;
      doc.moveTo(L, y).lineTo(L + CONTENT_W, y).lineWidth(0.75).strokeColor(BRAND.rule).stroke();
      y += 22;

      // ── Who is leaving ─────────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(22).fillColor(BRAND.ink).text(summary.person.name, L, y);
      y += 28;
      const roleLine = [summary.role, summary.team].filter(Boolean).join(' · ') || 'Team member';
      doc.font('Helvetica').fontSize(10).fillColor(BRAND.ink2).text(roleLine, L, y);
      y += 22;

      const facts: Array<[string, string]> = [
        ['Leave date', ymdDate(dep.leaveDate)],
        ['Stage', `Step ${stageIndex} of ${STAGE_ORDER.length}: ${STAGE_TEXT[dep.stage]}`],
        ['Handed over', `${summary.assetsHandedOver} of ${summary.assetsTotal} assets`],
      ];
      const gap = 10;
      const bw = (CONTENT_W - gap * 2) / 3;
      facts.forEach(([label, value], i) => {
        const bx = L + i * (bw + gap);
        doc.roundedRect(bx, y, bw, 46, 6).fill(BRAND.canvas);
        doc.font('Helvetica').fontSize(8).fillColor(BRAND.ink3).text(label, bx + 10, y + 9);
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(BRAND.ink).text(value, bx + 10, y + 23, { width: bw - 20, lineBreak: false, ellipsis: true });
      });
      y += 60;
      if (summary.hasAlert) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.fail).text('Critical assets still lack an accepted successor.', L, y);
        y += 16;
      }

      // ── Assets and successors ─────────────────────────────────────────────
      section('Assets and successors', 'Every asset this person owns, who takes it over, and whether they have accepted.');
      const colAsset = 175;
      const colCrit = 70;
      const colStatus = 80;
      const colSucc = CONTENT_W - colAsset - colCrit - colStatus - 30;
      const xCrit = L + colAsset + 10;
      const xSucc = xCrit + colCrit + 10;
      const xStatus = L + CONTENT_W - colStatus;
      if (dep.handovers.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink3).text('This person owns no tracked assets.', L, y);
        y += 20;
      } else {
        ensure(24);
        doc.font('Helvetica').fontSize(8).fillColor(BRAND.ink3);
        doc.text('Asset', L, y);
        doc.text('Criticality', xCrit, y);
        doc.text('Successor', xSucc, y);
        doc.text('Status', xStatus, y, { width: colStatus, align: 'right' });
        y += 14;
        const ACCEPT: Record<string, [string, string]> = {
          accepted: ['Accepted', BRAND.pass],
          requested: ['Awaiting', BRAND.bronzeInk],
          declined: ['Declined', BRAND.fail],
          none: ['Not asked', BRAND.ink3],
        };
        for (const h of dep.handovers) {
          const node = graph.getNode(h.assetId);
          const name = node?.entity?.name ?? h.assetId;
          const crit = node?.facts.get('criticality')?.value;
          const critText = typeof crit === 'string' ? crit.charAt(0).toUpperCase() + crit.slice(1) : 'Unknown';
          const succ = h.successorId ? graph.getNode(h.successorId)?.entity?.name ?? h.successorId : 'Not named';
          const reason = h.acceptance === 'declined' && h.declineReason ? `"${h.declineReason}"` : null;
          doc.font('Helvetica').fontSize(9);
          const rowH =
            Math.max(doc.heightOfString(name, { width: colAsset }), doc.heightOfString(succ, { width: colSucc })) +
            (reason ? doc.heightOfString(reason, { width: CONTENT_W - colAsset - 10 }) + 4 : 0) +
            12;
          ensure(rowH);
          doc.moveTo(L, y).lineTo(L + CONTENT_W, y).lineWidth(0.5).strokeColor(BRAND.rule).stroke();
          y += 6;
          doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.ink).text(name, L, y, { width: colAsset });
          doc.font('Helvetica').fontSize(9).fillColor(crit === 'critical' ? BRAND.fail : BRAND.ink2).text(critText, xCrit, y, { width: colCrit });
          doc.fillColor(h.successorId ? BRAND.ink : BRAND.ink3).text(succ, xSucc, y, { width: colSucc });
          const [label, color] = ACCEPT[h.acceptance] ?? ACCEPT.none;
          doc.font('Helvetica-Bold').fillColor(color).text(label, xStatus, y, { width: colStatus, align: 'right' });
          if (reason) {
            const ry = y + Math.max(doc.heightOfString(name, { width: colAsset }), doc.heightOfString(succ, { width: colSucc })) + 2;
            doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.ink2).text(reason, xCrit, ry, { width: CONTENT_W - colAsset - 10 });
          }
          y += rowH - 6;
        }
        y += 10;
      }

      // ── Automations on their personal credentials ─────────────────────────
      const personalEdges = graph.getAllEdges().filter((e) => e.type === 'runs_on_credentials_of' && e.toId === dep.personId && !e.validTo);
      section('Runs on their own credentials', 'These stop when the account is disabled unless they are moved to a service account first.');
      if (personalEdges.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink3).text('No automation runs on this person’s credentials.', L, y);
        y += 20;
      } else {
        for (const pe of personalEdges) {
          ensure(18);
          const autoNode = graph.getNode(pe.fromId);
          const runsFact = autoNode?.facts.get('run_volume_weekly');
          // 0 runs is a real count; only a missing value is unknown.
          const runs = typeof runsFact?.value === 'number' ? `${runsFact.value.toLocaleString('en-US')} runs/week` : 'Volume unknown';
          doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.ink).text(autoNode?.entity?.name ?? pe.fromId, L, y);
          doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink2).text(runs, L, y, { width: CONTENT_W, align: 'right' });
          y += 17;
        }
        y += 6;
      }

      // ── Runbooks ──────────────────────────────────────────────────────────
      section('Runbooks', 'Documentation on record for each asset being handed over.');
      for (const h of dep.handovers) {
        ensure(18);
        const node = graph.getNode(h.assetId);
        const name = node?.entity?.name ?? h.assetId;
        const docFact = node?.facts.get('documented');
        const url: string | undefined = (node?.entity?.externalRefs as any)?.runbookUrl;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.ink).text(name, L, y, { width: 200 });
        const x2 = L + 210;
        if (docFact?.value === true && url) doc.font('Helvetica').fillColor(BRAND.bronzeInk).text(url, x2, y, { width: CONTENT_W - 210, link: url, underline: true });
        else if (docFact?.value === true) doc.font('Helvetica').fillColor(BRAND.ink2).text(`Documented (${docFact.grade}); no runbook link on record.`, x2, y, { width: CONTENT_W - 210 });
        else if (docFact?.value === false) doc.font('Helvetica').fillColor(BRAND.fail).text('No runbook.', x2, y, { width: CONTENT_W - 210 });
        else doc.font('Helvetica').fillColor(BRAND.ink3).text('Unknown: not recorded.', x2, y, { width: CONTENT_W - 210 });
        y += 17;
      }
      if (dep.handovers.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor(BRAND.ink3).text('Nothing to document.', L, y);
        y += 17;
      }

      // ── Sign-off ──────────────────────────────────────────────────────────
      y += 18;
      ensure(110);
      doc.roundedRect(L, y, CONTENT_W, 96, 6).lineWidth(0.75).strokeColor(BRAND.rule).stroke();
      doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND.ink).text('Sign-off', L + 14, y + 12);
      const line = (label: string, ly: number) => {
        doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.ink3).text(label, L + 14, ly);
        doc.moveTo(L + 150, ly + 10).lineTo(L + 330, ly + 10).lineWidth(0.5).strokeColor(BRAND.ink3).stroke();
        doc.text('Date', L + 345, ly);
        doc.moveTo(L + 372, ly + 10).lineTo(L + CONTENT_W - 14, ly + 10).stroke();
      };
      line('Manager', y + 40);
      line('People operations (HR)', y + 66);

      // ── Footer on every page ──────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0; // the footer sits below the margin; don't let it open a page
        const fy = PAGE.height - PAGE.margin + 6;
        doc.moveTo(L, fy - 8).lineTo(L + CONTENT_W, fy - 8).lineWidth(0.5).strokeColor(BRAND.rule).stroke();
        doc.font('Helvetica').fontSize(7.5).fillColor(BRAND.ink3);
        doc.text(`Horquva OBA · Handover pack for ${summary.person.name}`, L, fy, { width: CONTENT_W, lineBreak: false });
        doc.text(`Page ${i - range.start + 1} of ${range.count}`, L, fy, { width: CONTENT_W, align: 'right', lineBreak: false });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

const STAGE_ORDER = ['initiated', 'successor_named', 'accepted', 'account_disabled', 'verified'] as const;
const STAGE_TEXT: Record<string, string> = {
  initiated: 'Initiated',
  successor_named: 'Successor named',
  accepted: 'Accepted',
  account_disabled: 'Account disabled',
  verified: 'Post-departure verified',
};

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
