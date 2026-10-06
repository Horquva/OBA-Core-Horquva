import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const FORBIDDEN_PALETTE_CLASSES = [
  // Default Tailwind color stems
  /\b(text|bg|border|ring|fill|stroke)-(slate|zinc|neutral|stone|gray)-(50|100|200|300|400|500|600|700|800|900|950)\b/,
  /\b(text|bg|border|ring|fill|stroke)-(red|orange|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b/,
  /\b(text|bg|border|ring|fill|stroke)-amber-(50|100|200|300|400|500|600|700|800|900|950)\b/,
];

const RAW_HEX_REGEX = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  if (!dir) return fileList;
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'tests') {
        getFilesRecursively(fullPath, fileList);
      }
    } else if (file.endsWith('.tsx') || (file.endsWith('.ts') && !file.endsWith('.d.ts'))) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

describe('Design Token Guard (Task 34)', () => {
  const root = path.resolve(process.cwd());
  const targetDirs = [
    path.join(root, 'components'),
    path.join(root, 'features'),
    path.join(root, 'app'),
  ];

  const appFiles = targetDirs.flatMap((d) => getFilesRecursively(d));

  it('scans all UI, feature, and app route files for token compliance', () => {
    expect(appFiles.length).toBeGreaterThan(20);
  });

  it('asserts zero forbidden Tailwind palette classes in application code', () => {
    const violations: Array<{ file: string; match: string; line: number }> = [];

    for (const file of appFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        for (const pattern of FORBIDDEN_PALETTE_CLASSES) {
          const match = line.match(pattern);
          if (match) {
            violations.push({
              file: path.relative(root, file),
              match: match[0],
              line: idx + 1,
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const msg = violations
        .map((v) => `${v.file}:${v.line} uses forbidden palette class "${v.match}"`)
        .join('\n');
      expect.fail(`Found forbidden Tailwind palette classes:\n${msg}`);
    }

    expect(violations).toHaveLength(0);
  });

  it('asserts zero raw hex colors in className strings', () => {
    const violations: Array<{ file: string; match: string; line: number }> = [];

    for (const file of appFiles) {
      // Exclude globals.css or SVG asset files if any
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        if (line.includes('className=')) {
          const hexMatch = line.match(RAW_HEX_REGEX);
          if (hexMatch) {
            violations.push({
              file: path.relative(root, file),
              match: hexMatch[0],
              line: idx + 1,
            });
          }
        }
      });
    }

    expect(violations).toHaveLength(0);
  });
});
