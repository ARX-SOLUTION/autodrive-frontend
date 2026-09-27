import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// A '…', "…" or `…` literal whose whole value is an @/ specifier (no ${}).
const LITERAL = /(['"`])(@\/(?:[^'"`\\\s$]|\$(?!\{))*)\1/g;
// A ./ or ../ literal in a module position: `from`, import(…), a bare import, or a vi.mock-style call.
const RELATIVE =
  /(?<=(?:\bfrom|\bimport(?:\s*\()?|\bvi\.(?:mock|doMock|unmock|doUnmock|importActual|importMock)\s*(?:<(?:[^<>]|<[^<>]*>)*>)?\s*\()\s*)(['"`])(\.\.?\/(?:[^'"`\\\s$]|\$(?!\{))*)\1/g;
// TypeScript's lookup order, then the path itself for explicit extensions (./App.tsx, ./en.json).
const CANDIDATES = ['.ts', '.tsx', '.d.ts', '/index.ts', '/index.tsx', ''];

const specifier = (path) => `@/${path.replace(/^src\//, '')}`;

export function specifiersForMove({ from, to, isDirectory }) {
  if (isDirectory) {
    return {
      [specifier(from)]: specifier(to),
      [`${specifier(from)}/`]: `${specifier(to)}/`,
    };
  }
  if (!/\.tsx?$/.test(from)) return {};
  const [before, after] = [from, to].map((path) =>
    specifier(path.replace(/\.tsx?$/, '')),
  );
  const mapping = { [before]: after };
  if (posix.basename(before) === 'index') {
    mapping[posix.dirname(before)] =
      posix.basename(after) === 'index' ? posix.dirname(after) : after;
  }
  return mapping;
}

// Exact key first; a key ending in "/" also matches as a directory prefix.
const lookup = (mapping, value) => {
  if (Object.hasOwn(mapping, value)) return mapping[value];
  const prefix = Object.keys(mapping)
    .filter((key) => key.endsWith('/') && value.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  return prefix && mapping[prefix] + value.slice(prefix.length);
};

export function rewriteSpecifiers(code, mapping) {
  let count = 0;
  const rewritten = code.replace(LITERAL, (literal, quote, value) => {
    const next = lookup(mapping, value);
    if (!next) return literal;
    count += 1;
    return quote + next + quote;
  });
  return { code: rewritten, count };
}

const relocate = (moves, path) => {
  const move = moves.find(
    ({ from }) => path === from || path.startsWith(`${from}/`),
  );
  return move ? move.to + path.slice(move.from.length) : path;
};

const resolveRelative = (file, value, exists) => {
  const base = posix.join(posix.dirname(file), value);
  const suffix = CANDIDATES.find((candidate) => exists(base + candidate));
  return suffix === undefined ? undefined : { target: base + suffix, suffix };
};

// The @/ form of a resolved file, in the shape the relative specifier used.
const aliasFor = (path, suffix) => {
  if (!suffix) return specifier(path);
  const bare = path.replace(/\.(d\.ts|tsx?)$/, '');
  return specifier(
    suffix.startsWith('/index') ? bare.replace(/\/index$/, '') : bare,
  );
};

// `file` and `exists` describe the tree before the move.
export function rewriteRelativeSpecifiers(code, { file, moves, exists }) {
  let count = 0;
  const fileMoved = relocate(moves, file) !== file;
  const rewritten = code.replace(RELATIVE, (literal, quote, value) => {
    const resolved = resolveRelative(file, value, exists);
    if (!resolved) return literal;
    const target = relocate(moves, resolved.target);
    // ponytail: a target outside src/ has no @/ alias; rescan() reports it if it breaks.
    if (!target.startsWith('src/')) return literal;
    if (target === resolved.target && !fileMoved) return literal;
    count += 1;
    return quote + aliasFor(target, resolved.suffix) + quote;
  });
  return { code: rewritten, count };
}

// `file` and `exists` describe the tree after the move: old @/ specifiers and
// relative specifiers that no longer resolve.
export function rescan(code, { file, mapping, exists }) {
  return [
    ...[...code.matchAll(LITERAL)].filter(([, , value]) =>
      lookup(mapping, value),
    ),
    ...[...code.matchAll(RELATIVE)].filter(
      ([, , value]) => !resolveRelative(file, value, exists),
    ),
  ]
    .sort((a, b) => a.index - b.index)
    .map((match) => ({ index: match.index, text: match[0] }));
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const at = (file) => resolve(root, file);

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

// Tracked plus untracked, non-ignored files that still exist on disk.
const gitFiles = (...pathspecs) =>
  execFileSync(
    'git',
    [
      'ls-files',
      '-z',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
    ].concat(pathspecs),
    { cwd: root, encoding: 'utf8' },
  )
    .split('\0')
    .filter((file) => file && existsSync(at(file)));

const isSource = (file) =>
  /^(src|scripts)\/.*\.(ts|tsx|js|mjs)$/.test(file) ||
  file === 'vite.config.ts' ||
  file === 'vitest.config.ts';

const lineAt = (text, index) => text.slice(0, index).split('\n').length;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function main(args) {
  const dryRun = args.includes('--dry-run');
  const paths = args
    .filter((arg) => arg !== '--dry-run')
    .map((arg) => posix.normalize(arg).replace(/\/$/, ''));
  if (paths.length === 0 || paths.length % 2 === 1) {
    fail(
      'Usage: node scripts/move-module.mjs [--dry-run] <from> <to> [<from> <to> …]',
    );
  }

  const moves = [];
  for (let index = 0; index < paths.length; index += 2) {
    const [from, to] = paths.slice(index, index + 2);
    for (const path of [from, to]) {
      if (!path.startsWith('src/')) {
        fail(`${path}: must be a repo-relative path under src/`);
      }
    }
    if (!existsSync(at(from))) fail(`${from}: does not exist`);
    if (existsSync(at(to))) fail(`${to}: already exists`);
    moves.push({ from, to, isDirectory: statSync(at(from)).isDirectory() });
  }

  const mapping = Object.assign({}, ...moves.map(specifiersForMove));
  const files = gitFiles();
  const before = new Set(files);
  const after = new Set(files.map((file) => relocate(moves, file)));
  const movedFiles = files.filter((file) => relocate(moves, file) !== file);
  const tag = dryRun ? '[dry run] ' : '';

  // Every rewrite is planned against the pre-move tree, then applied after the moves.
  const plan = files.filter(isSource).map((file) => {
    const aliased = rewriteSpecifiers(readFileSync(at(file), 'utf8'), mapping);
    const relative = rewriteRelativeSpecifiers(aliased.code, {
      file,
      moves,
      exists: (path) => before.has(path),
    });
    return {
      file: relocate(moves, file),
      code: relative.code,
      count: aliased.count + relative.count,
    };
  });

  for (const { from, to } of moves) {
    console.log(`${tag}move ${from} -> ${to}`);
    if (dryRun) continue;
    mkdirSync(dirname(at(to)), { recursive: true });
    execFileSync('git', ['mv', from, to], { cwd: root, stdio: 'inherit' });
  }

  const rewritten = plan.filter(({ count }) => count > 0);
  for (const { file, code, count } of rewritten) {
    console.log(`${tag}rewrite ${file}: ${count}`);
    if (!dryRun) writeFileSync(at(file), code);
  }
  const total = rewritten.reduce((sum, { count }) => sum + count, 0);
  console.log(`${tag}${total} specifier(s) in ${rewritten.length} file(s)`);

  const problems = plan.flatMap(({ file, code }) => {
    const text = dryRun ? code : readFileSync(at(file), 'utf8');
    return rescan(text, {
      file,
      mapping,
      exists: (path) => after.has(path),
    }).map(
      (problem) => `  ${file}:${lineAt(text, problem.index)}: ${problem.text}`,
    );
  });

  if (movedFiles.length > 0) {
    const names = movedFiles.map((file) => escapeRegExp(file.slice(4)));
    // src/<p>.<ext> (also inside ../src/…) or a bare <p>.<ext> relative to src/.
    const mention = new RegExp(
      `(?:(?<![\\w.$-])src/|(?<![\\w.$/-]))(?:${names.join('|')})(?![\\w$-])`,
      'g',
    );
    const mentions = gitFiles('src', 'scripts', 'docs', '*.md').flatMap(
      (file) => {
        const text = readFileSync(at(file), 'utf8');
        return [...text.matchAll(mention)].map(
          (match) => `  ${file}:${lineAt(text, match.index)}: ${match[0]}`,
        );
      },
    );
    if (mentions.length > 0) {
      console.log(
        `Plain-path mentions to update by hand:\n${mentions.join('\n')}`,
      );
    }
  }

  if (problems.length > 0) {
    fail(
      `Old or unresolved specifiers after the rewrite:\n${problems.join('\n')}`,
    );
  }
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2));
}
