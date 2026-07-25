/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard for autodrive-6cq.5.5: every icon-only <Button>/<button>
 * must expose an accessible name (aria-label/aria-labelledby) -- otherwise a
 * screen reader announces a bare "button" and there's nothing for a sighted
 * user to fall back to either.
 *
 * This is a static AST scan over every .tsx source file, not a rendered-
 * component test: a render test only proves the ONE variant/props
 * combination it constructs is fine, and would still pass if a brand new
 * page shipped an unlabeled icon button elsewhere. Scanning the source
 * catches every call site, present and future, without needing a test per
 * page.
 *
 * ponytail: known blind spots (static analysis can't run the app) --
 * - JS-conditional hiding (`{collapsed && <span>label</span>}`) isn't
 *   understood; only the CSS `hidden` utility is (see
 *   classNameLooksConditionallyHidden below), because that's the one
 *   real case this scan caught (AddStudentDialog's step button lost its
 *   only label under the `sm` breakpoint).
 * - An icon assigned to a local alias (`const Icon = cond ? A : B`) isn't
 *   recognised as "just an icon" -- irrelevant here since this check
 *   doesn't need to *identify* icons, only whether a name/text exists.
 * - Only literal `Button`/`button` JSX tags are scanned (not
 *   DropdownMenuTrigger, Link, role="button" divs, etc.) -- every real
 *   violation found in this codebase was one of those two tags.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(TEST_DIR, '..');

interface Violation {
  file: string;
  line: number;
  tagName: string;
}

function collectTsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsxFiles(full, out);
    } else if (
      entry.name.endsWith('.tsx') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.stories.tsx')
    ) {
      out.push(full);
    }
  }
  return out;
}

function attrsOf(opening: ts.JsxOpeningLikeElement) {
  return opening.attributes.properties;
}

function findAttr(
  attrs: readonly ts.JsxAttributeLike[],
  name: string,
): ts.JsxAttribute | undefined {
  return attrs.find(
    (a): a is ts.JsxAttribute =>
      ts.isJsxAttribute(a) && a.name.getText() === name,
  );
}

function hasNonEmptyA11yName(attrs: readonly ts.JsxAttributeLike[]): boolean {
  // A spread ({...props}) may carry aria-label from a caller -- can't
  // verify statically, so assume it's fine rather than false-flag it.
  if (attrs.some((a) => ts.isJsxSpreadAttribute(a))) return true;

  for (const key of ['aria-label', 'aria-labelledby']) {
    const attr = findAttr(attrs, key);
    if (!attr) continue;
    if (!attr.initializer) return false; // bare boolean attr -- invalid
    if (ts.isStringLiteral(attr.initializer)) {
      if (attr.initializer.text.trim() !== '') return true;
      continue;
    }
    if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
      return true; // t('key'), a variable, etc. -- assume non-empty
    }
  }
  return false;
}

// Does an element's own className contain the literal Tailwind `hidden`
// utility (outside of `sr-only`)? If so, don't trust text inside it as an
// accessible name -- `display:none` removes content from the a11y tree
// outright, unlike `sr-only` (visually hidden, still announced).
function classNameLooksConditionallyHidden(
  attrs: readonly ts.JsxAttributeLike[],
): boolean {
  const attr = findAttr(attrs, 'className');
  if (!attr) return false;
  const text = attr.getText();
  return /\bhidden\b/.test(text) && !/\bsr-only\b/.test(text);
}

function hasAnyChildren(children: readonly ts.JsxChild[]): boolean {
  return children.some((c) => {
    if (ts.isJsxText(c)) return c.text.trim().length > 0;
    if (ts.isJsxExpression(c)) return !!c.expression;
    return true;
  });
}

// Recursively: is there text a screen reader would announce anywhere in
// this subtree? Deliberately conservative -- any JsxExpression whose
// expression isn't itself a JSX element is assumed to render text (a call
// like t('key'), a variable, a ternary of strings, etc.), so this only
// flags the genuinely icon-only case rather than every dynamic label.
function hasTextLikeContent(children: readonly ts.JsxChild[]): boolean {
  for (const c of children) {
    if (ts.isJsxText(c)) {
      if (c.text.trim().length > 0) return true;
      continue;
    }
    if (ts.isJsxExpression(c)) {
      const expr = c.expression;
      if (!expr) continue; // {/* comment */} or {}
      if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr)) {
        if (hasTextLikeContent([expr])) return true;
        continue;
      }
      if (ts.isConditionalExpression(expr)) {
        for (const branch of [expr.whenTrue, expr.whenFalse]) {
          if (ts.isJsxElement(branch) || ts.isJsxSelfClosingElement(branch)) {
            if (hasTextLikeContent([branch])) return true;
          } else if (!(
            branch.kind === ts.SyntaxKind.NullKeyword ||
            (ts.isIdentifier(branch) && branch.text === 'undefined')
          )) {
            return true; // string/call/etc in a branch -- assume text
          }
        }
        continue;
      }
      if (ts.isStringLiteral(expr) && expr.text.trim() === '') continue; // {' '}
      return true;
    }
    if (ts.isJsxElement(c)) {
      if (classNameLooksConditionallyHidden(attrsOf(c.openingElement)))
        continue;
      if (hasTextLikeContent(c.children)) return true;
      continue;
    }
    // JsxSelfClosingElement (e.g. an icon) -- no text of its own.
  }
  return false;
}

function scanSource(fileLabel: string, text: string, violations: Violation[]) {
  const sourceFile = ts.createSourceFile(
    fileLabel,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  function check(node: ts.JsxElement | ts.JsxSelfClosingElement) {
    const isSelfClosing = ts.isJsxSelfClosingElement(node);
    const tagName = (
      isSelfClosing ? node.tagName : node.openingElement.tagName
    ).getText();
    if (tagName !== 'Button' && tagName !== 'button') return;

    const opening = isSelfClosing ? node : node.openingElement;
    const attrs = attrsOf(opening);
    if (hasNonEmptyA11yName(attrs)) return;
    if (isSelfClosing) return; // no children at all -- different bug class
    if (!hasAnyChildren(node.children)) return; // literally empty
    if (hasTextLikeContent(node.children)) return;

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    violations.push({ file: fileLabel, line: line + 1, tagName });
  }

  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxElement(node)) check(node);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function scanRepo(): Violation[] {
  const violations: Violation[] = [];
  for (const file of collectTsxFiles(SRC_DIR)) {
    scanSource(
      path.relative(SRC_DIR, file),
      fs.readFileSync(file, 'utf8'),
      violations,
    );
  }
  return violations;
}

describe('icon-only Button/button accessible-name guard (autodrive-6cq.5.5)', () => {
  it('flags a fabricated icon-only button with no aria-label', () => {
    const violations: Violation[] = [];
    scanSource(
      'fixture.tsx',
      `
        const Bad = () => (
          <Button size="icon" onClick={noop}>
            <Trash />
          </Button>
        );
      `,
      violations,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ tagName: 'Button' });
  });

  it('does not flag an icon-only button that has aria-label, text content, or sr-only text', () => {
    const violations: Violation[] = [];
    scanSource(
      'fixture.tsx',
      `
        const Good = () => (
          <>
            <Button size="icon" aria-label="Delete">
              <Trash />
            </Button>
            <button onClick={noop}>
              <PencilSimple /> {t('common.edit')}
            </button>
            <Button size="icon">
              <SidebarSimple />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          </>
        );
      `,
      violations,
    );
    expect(violations).toHaveLength(0);
  });

  it('flags an icon-only button whose only label is behind a `hidden` breakpoint class', () => {
    const violations: Violation[] = [];
    scanSource(
      'fixture.tsx',
      `
        const Bad = () => (
          <button onClick={noop}>
            <Trash />
            <span className="hidden sm:block">{t('common.delete')}</span>
          </button>
        );
      `,
      violations,
    );
    expect(violations).toHaveLength(1);
  });

  it('has every icon-only Button/button in src/ carrying an accessible name', () => {
    const violations = scanRepo();
    if (violations.length > 0) {
      const list = violations
        .map((v) => `  ${v.file}:${v.line}  <${v.tagName}>`)
        .join('\n');
      throw new Error(
        `${violations.length} icon-only Button/button element(s) have no ` +
          `aria-label/aria-labelledby (and no other accessible text). Add ` +
          `an aria-label sourced from i18n (see src/pages/students/StudentsTable.tsx ` +
          `for the established pattern):\n${list}`,
      );
    }
    expect(violations).toEqual([]);
  });
});
