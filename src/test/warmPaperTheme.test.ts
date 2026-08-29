/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard for the AutoDrive brand theme.
 *
 * Cascade rule: design-tokens is imported unlayered. An override inside
 * `@layer base` loses to it. This test asserts BOTH the approved literal
 * values AND that the brand block is not nested in `@layer base`.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const INDEX_CSS_PATH = path.resolve(TEST_DIR, '..', 'index.css');

function extractBrandThemeBlock(css: string): string {
  const match = css.match(
    /AutoDrive brand theme.*?BEGIN[\s\S]*?\*\/([\s\S]*?)\/\*\s*AutoDrive brand theme.*?END/,
  );
  if (!match) {
    throw new Error(
      'AutoDrive brand theme override block not found in src/index.css ' +
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
    throw new Error(`Selector "${selector}" not found in brand theme block.`);
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

describe('AutoDrive brand theme override', () => {
  const css = fs.readFileSync(INDEX_CSS_PATH, 'utf8');
  const block = extractBrandThemeBlock(css);
  const root = extractRuleBlock(block, ':root');
  const dark = extractRuleBlock(block, '.dark');

  it('keeps the brand override unlayered (wins over design-tokens)', () => {
    // If the block were wrapped in `@layer base { ... }`, unlayered
    // design-tokens could win and the app would lose its brand palette.
    expect(block).not.toMatch(/@layer\s+base\b/);
    const beginIdx = css.indexOf('AutoDrive brand theme');
    const before = css.slice(Math.max(0, beginIdx - 80), beginIdx);
    expect(before).not.toMatch(/@layer\s+base\s*\{\s*$/);
  });

  it('defines the Road Signal paper, ink, and amber brand colors', () => {
    expect(extractVar(root, 'brand-white')).toBe('45 32% 93%');
    expect(extractVar(root, 'brand-blue')).toBe('192 43% 13%');
    expect(extractVar(root, 'brand-navy')).toBe('192 43% 13%');
    expect(extractVar(root, 'brand-orange')).toBe('39 76% 53%');
    expect(extractVar(root, 'background')).toBe('var(--brand-white)');
    expect(extractVar(root, 'foreground')).toBe('var(--brand-navy)');
    expect(extractVar(root, 'primary')).toBe('var(--brand-orange)');
    expect(extractVar(root, 'primary-foreground')).toBe('var(--brand-navy)');
    expect(extractVar(root, 'ring')).toBe('var(--brand-orange)');
    expect(extractVar(root, 'radius')).toBe('0.875rem');
  });

  it('maps legacy utility color names to semantic brand tokens', () => {
    expect(css).toContain('--color-white: hsl(var(--brand-white));');
    expect(css).toContain('--color-cyan-400: hsl(var(--brand-blue));');
    expect(css).toContain('--color-amber-400: hsl(var(--brand-orange));');
  });

  it('mirrors the light brand color onto the sidebar primary tokens', () => {
    expect(extractVar(root, 'sidebar-primary')).toBe(
      extractVar(root, 'primary'),
    );
    expect(extractVar(root, 'sidebar-primary-foreground')).toBe(
      extractVar(root, 'primary-foreground'),
    );
    expect(extractVar(root, 'sidebar-ring')).toBe(extractVar(root, 'ring'));
  });

  it('provides a complete light and dark semantic surface pairing', () => {
    expect(extractVar(root, 'sidebar-background')).toBe('45 45% 98%');
    expect(extractVar(root, 'card')).toBe('45 45% 99%');
    expect(extractVar(dark, 'background')).toBe('192 45% 11%');
    expect(extractVar(dark, 'foreground')).toBe('var(--brand-white)');
    expect(extractVar(dark, 'primary')).toBe('40 84% 61%');
    expect(extractVar(dark, 'ring')).toBe('var(--brand-orange)');
    expect(extractVar(dark, 'sidebar-background')).toBe('192 42% 13%');
  });

  it('mirrors the dark brand colors onto the sidebar tokens', () => {
    expect(extractVar(dark, 'sidebar-primary')).toBe(
      extractVar(dark, 'primary'),
    );
    expect(extractVar(dark, 'sidebar-primary-foreground')).toBe(
      extractVar(dark, 'primary-foreground'),
    );
    expect(extractVar(dark, 'sidebar-ring')).toBe(extractVar(dark, 'ring'));
  });
});
