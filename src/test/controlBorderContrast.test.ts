/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// WCAG 2.2 SC 1.4.11: the unfocused border that marks an editable control
// needs 3:1 against the surface it sits on. PaymentModal renders on --card.
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');

const themeBlock = (selector: ':root' | '.dark') => {
  const start = css.search(new RegExp(`^\\${selector} \\{`, 'm'));
  return css.slice(start, css.indexOf('\n}', start));
};

const token = (block: string, name: string) => {
  const match = block.match(new RegExp(`--${name}: (\\d+) (\\d+)% (\\d+)%;`));
  if (!match) throw new Error(`--${name} missing`);
  return match.slice(1).map(Number) as [number, number, number];
};

const luminance = ([h, s, l]: [number, number, number]) => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4);
};

const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

describe('control border contrast', () => {
  it.each([':root', '.dark'] as const)(
    'keeps --control-border at 3:1 or more on --card in %s',
    (selector) => {
      const block = themeBlock(selector);
      const ratio = contrast(
        luminance(token(block, 'control-border')),
        luminance(token(block, 'card')),
      );
      expect(ratio).toBeGreaterThanOrEqual(3);
    },
  );

  it('uses the control border on every PaymentModal field', () => {
    const modal = fs.readFileSync(
      path.join(root, 'src/features/payments/api/PaymentModal.tsx'),
      'utf8',
    );
    expect(modal).not.toMatch(/bg-secondary border-border/);
    expect(modal).not.toMatch(/border border-input/);
    expect(modal.match(/border-control-border/g)).toHaveLength(5);
  });
});
