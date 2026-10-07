import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { DataService } from '../../src/services/dataService.js';
import {
  generateHandoverPackPdf,
  generateExecutiveScanPdf,
} from '../../src/reports/pdfGenerator.js';
import { authedFetch } from '../helpers/session.js';

describe('RPT-01, RPT-02, RPT-03: PDF Generation Service', () => {
  let server: http.Server;
  let baseUrl: string;
  let ds: DataService;
  let depId: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    ds = DataService.resetInstance();
    const dep = ds.createDeparture({
      personId: 'person:omar@acme.com',
      leaveDate: '2026-10-31T00:00:00.000Z',
      note: 'Omar Departure for PDF testing',
    });
    depId = dep.id;
  });

  it('generateHandoverPackPdf produces a valid vector PDF binary (RPT-01)', async () => {
    const pdfBuffer = await generateHandoverPackPdf(ds, depId);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verify PDF magic header
    const header = pdfBuffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('generateHandoverPackPdf throws error when departure does not exist', async () => {
    await expect(generateHandoverPackPdf(ds, 'dep_nonexistent_999')).rejects.toThrow(
      /Departure dep_nonexistent_999 not found/
    );
  });

  it('generateExecutiveScanPdf produces a valid vector PDF binary (RPT-02)', async () => {
    const pdfBuffer = await generateExecutiveScanPdf(ds);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verify PDF magic header
    const header = pdfBuffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('GET /api/departures/:id/handover-pack/pdf streams valid PDF with proper headers', async () => {
    const res = await authedFetch(`${baseUrl}/api/departures/${depId}/handover-pack/pdf`);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('attachment; filename="handover-pack-');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('GET /api/reports/executive-scan/pdf streams valid PDF with proper headers', async () => {
    const res = await authedFetch(`${baseUrl}/api/reports/executive-scan/pdf`);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('attachment; filename="horquva-executive-scan-report.pdf"');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('GET /api/departures/:id/handover-pack/pdf returns 404 for unknown departure', async () => {
    const res = await authedFetch(`${baseUrl}/api/departures/dep_unknown_404/handover-pack/pdf`);
    expect(res.status).toBe(404);
  });
});
