/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard for autodrive-qsgc.1 / .7.
 *
 * Cascade rule: design-tokens is imported unlayered. An override inside
 * `@layer base` loses to it. This test asserts BOTH the approved literal
 * values AND that the Warm Paper block is not nested in `@layer base`.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const INDEX_CSS_PATH = path.resolve(TEST_DIR, '..', 'index.css');

function extractWarmPaperBlock(css: string): string {
  const match = css.match(
    /Warm Paper tenant theme.*?BEGIN[\s\S]*?\*\/([\s\S]*?)\/\*\s*Warm Paper tenant theme.*?END/,
  );
  if (!match) {
    throw new Error(
      'Warm Paper tenant theme override block not found in src/index.css ' +
        '(expected BEGIN/END marker comments after the design-tokens import).',
    );
  }
  return match[1];
}

function extractRuleBlock(block: string, selector: string): string {
  const escaped = selector.replace('.', '\\.');
  const re = new RegExp(`(?:^|\\s)${escaped}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`);
  const match = block.match(re);
  if (!match) {
    throw new Error(`Selector "${selector}" not found in Warm Paper block.`);
  }
  return match[1];
}

function extractVar(ruleBlock: string, name: string): string {
  const re = new RegExp(`--${name}:\\s*([^;]+);`);
  const match = ruleBlock.match(re);
  if (!match) {
    throw new Error(`--${name} not found in rule block:\n${ruleBlock}`);
  }
  return match[1].trim();
}

describe('Warm Paper tenant theme override (autodrive-qsgc.1)', () => {
  const css = fs.readFileSync(INDEX_CSS_PATH, 'utf8');
  const block = extractWarmPaperBlock(css);
  const root = extractRuleBlock(block, ':root');
  const dark = extractRuleBlock(block, '.dark');

  it('keeps the Warm Paper override unlayered (wins over design-tokens)', () => {
    // If the block were wrapped in `@layer base { ... }`, unlayered
    // design-tokens would win and primary would stay amber in the browser.
    expect(block).not.toMatch(/@layer\s+base\b/);
    const beginIdx = css.indexOf('Warm Paper tenant theme');
    const before = css.slice(Math.max(0, beginIdx - 80), beginIdx);
    expect(before).not.toMatch(/@layer\s+base\s*\{\s*$/);
  });

  it('sets the approved prototype-B light values', () => {
    expect(extractVar(root, 'background')).toBe('36 33% 97%');
    expect(extractVar(root, 'surface')).toBe('36 28% 94%');
    expect(extractVar(root, 'foreground')).toBe('24 12% 14%');
    expect(extractVar(root, 'primary')).toBe('14 58% 44%');
    expect(extractVar(root, 'primary-foreground')).toBe('36 33% 98%');
    expect(extractVar(root, 'ring')).toBe('14 58% 44%');
    expect(extractVar(root, 'warning')).toBe('32 60% 38%');
    expect(extractVar(root, 'radius')).toBe('1.25rem');
  });

  it('keeps light semantic colors distinct from primary', () => {
    const primaryHue = extractVar(root, 'primary').split(' ')[0];
    for (const token of ['destructive', 'success', 'warning', 'info']) {
      expect(extractVar(root, token).split(' ')[0]).not.toBe(primaryHue);
    }
  });

  it('mirrors the light rust brand color onto the sidebar primary tokens', () => {
    expect(extractVar(root, 'sidebar-primary')).toBe(
      extractVar(root, 'primary'),
    );
    expect(extractVar(root, 'sidebar-ring')).toBe(extractVar(root, 'primary'));
  });

  it('completes the Warm Paper sidebar suite (not amber leftovers)', () => {
    expect(extractVar(root, 'sidebar-background')).toBe('36 28% 95%');
    expect(extractVar(root, 'sidebar-accent').split(' ')[0]).toBe('36');
    expect(extractVar(root, 'sidebar-primary')).not.toBe('32 95% 44%');
  });

  it('redeclares Tailwind --color-* tokens after the HSL overrides', () => {
    expect(extractVar(root, 'color-primary')).toBe('hsl(var(--primary))');
    expect(extractVar(root, 'color-sidebar-primary')).toBe(
      'hsl(var(--sidebar-primary))',
    );
    expect(extractVar(root, 'radius-lg')).toBe('var(--radius)');
  });

  it('replaces the amber dark identity with a contrast-checked rust', () => {
    const darkPrimary = extractVar(dark, 'primary');
    const darkPrimaryHue = darkPrimary.split(' ')[0];
    expect(darkPrimaryHue).toBe('14');
    expect(darkPrimary).not.toBe('37 91.3% 55%');
    expect(darkPrimary).not.toBe('35 95% 55%');
  });

  it('mirrors the dark rust brand color onto the sidebar primary tokens', () => {
    const darkPrimary = extractVar(dark, 'primary');
    expect(extractVar(dark, 'sidebar-primary')).toBe(darkPrimary);
    expect(extractVar(dark, 'sidebar-ring')).toBe(darkPrimary);
  });
});
