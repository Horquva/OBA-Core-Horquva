// =============================================================================
// Horquva Continuity Platform — Reports REST API (RPT-02, RPT-03)
// =============================================================================
// Exports executive continuity and scan reports in PDF format.
// =============================================================================

import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { generateExecutiveScanPdf } from '../reports/pdfGenerator.js';

export const reportsRouter = Router();

// 1. GET /api/reports/executive-scan/pdf (RPT-02, RPT-03)
reportsRouter.get('/executive-scan/pdf', async (_req: Request, res: Response) => {
  try {
    const pdfBuffer = await generateExecutiveScanPdf(DataService.getInstance());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="horquva-executive-scan-report.pdf"');
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate executive scan PDF.' });
  }
});
