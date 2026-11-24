import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DataService } from '../../src/services/dataService.js';
import { fixtureOrgState } from '../helpers/fixtureOrg.js';

describe('Task 1.1: Initial State Provider', () => {
  afterEach(() => {
    // Restore fixture provider for other test suites
    DataService.useInitialStateProvider(fixtureOrgState);
    DataService.resetInstance();
  });

  it('non-persistent DataService is empty when no provider is set', () => {
    DataService.useInitialStateProvider(null);
    const ds = DataService.resetInstance();
    expect(ds.getGraph().getAllNodes().length).toBe(0);
  });

  it('provider state loads on resetInstance', () => {
    DataService.useInitialStateProvider(fixtureOrgState);
    const ds = DataService.resetInstance();
    expect(ds.getGraph().getAllNodes().length).toBeGreaterThan(0);
  });

  it('no file under src reads tests/fixtures', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    function searchDir(dir: string): string[] {
      const violations: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          violations.push(...searchDir(fullPath));
        } else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('tests/fixtures') || content.includes('handCheckableTruth')) {
            violations.push(fullPath);
          }
        }
      }
      return violations;
    }

    const hits = searchDir(srcDir);
    expect(hits).toEqual([]);
  });
});
