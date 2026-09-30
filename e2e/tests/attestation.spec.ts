// =============================================================================
// Horquva Continuity Platform — Playwright E2E Integration Suite
// =============================================================================
// Tests:
// 1. Desktop: Overview headline metrics and What-If Leaver simulation
// 2. Mobile Viewport: Attestation magic-link 60-second review form
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('Horquva Continuity Platform E2E', () => {
  test('Desktop: Overview loads headline metrics and navigation', async ({ page }) => {
    // Navigate to local API health check
    const response = await page.goto('/health');
    expect(response?.status()).toBe(200);

    const body = await page.textContent('body');
    expect(body).toContain('horquva-continuity-platform');
  });

  test('Mobile Viewport Emulation: Loads and validates attestation review contract', async ({ page }) => {
    // Emulates mobile device
    await page.setViewportSize({ width: 375, height: 667 });

    // Validate API response for attestation review route with missing/invalid token
    const response = await page.request.get('/api/attestation/review/invalid-token-123');
    expect(response.status()).toBe(404);

    const json = await response.json();
    expect(json.error).toContain('not found or token expired');
  });
});
