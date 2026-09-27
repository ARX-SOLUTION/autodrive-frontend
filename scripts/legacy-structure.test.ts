import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const listed: string[] = JSON.parse(
  readFileSync(join(root, 'scripts/legacy-files.json'), 'utf8'),
);
// A directory disappears from disk once its last file is moved out.
const present = ['src/pages', 'src/services', 'src/types']
  .filter((dir) => existsSync(join(root, dir)))
  .flatMap((dir) =>
    readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) =>
        relative(root, join(entry.parentPath, entry.name)).split(sep).join('/'),
      ),
  );

describe('legacy directory freeze', () => {
  it('allows no new files under src/pages, src/services or src/types', () => {
    const added = present.filter((file) => !listed.includes(file));
    expect(
      added,
      `New files under src/pages, src/services or src/types are not allowed — put domain code in src/features/<feature>/ (docs/architecture/overview.md#file-structure):\n${added.join('\n')}`,
    ).toEqual([]);
  });

  it('lists only files that are still in a legacy directory', () => {
    const missing = listed.filter((file) => !present.includes(file));
    expect(
      missing,
      `Moved out of a legacy directory — remove from scripts/legacy-files.json:\n${missing.join('\n')}`,
    ).toEqual([]);
  });
});
