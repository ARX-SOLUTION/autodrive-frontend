import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const eslint = new ESLint({ cwd: root });
const MESSAGE =
  'Import another feature only through its api/ or types.ts (docs/architecture/overview.md#file-structure).';

const cases = [
  [
    'src/pages/Foo.tsx',
    "import X from '@/features/vehicles/components/VehicleFormDialog';",
    'error',
  ],
  [
    'src/pages/Foo.tsx',
    "import { x } from '@/features/vehicles/api/vehicleService';",
    'no error',
  ],
  [
    'src/pages/Foo.tsx',
    "import type { X } from '@/features/vehicles/types';",
    'no error',
  ],
  [
    'src/routes/foo.tsx',
    "import X from '@/features/vehicles/pages/VehiclesPage';",
    'no error',
  ],
  [
    'src/routes/foo.tsx',
    "import X from '@/features/vehicles/components/X';",
    'error',
  ],
  [
    'src/features/vehicles/pages/A.tsx',
    "import X from '@/features/vehicles/components/X';",
    'no error',
  ],
  [
    'src/features/students/pages/A.tsx',
    "import { x } from '@/features/vehicles/lib/x';",
    'error',
  ],
  [
    'src/pages/Foo.tsx',
    "export * from '@/features/vehicles/components/X';",
    'error',
  ],
  [
    'src/pages/Foo.tsx',
    "export const load = () => import('@/features/vehicles/pages/VehiclesPage');",
    'error',
  ],
] as const;

describe('local/feature-boundaries', () => {
  it.each(cases)('%s: %s → %s', async (importer, code, expected) => {
    const [result] = await eslint.lintText(code, {
      filePath: join(root, importer),
    });

    expect(result.fatalErrorCount).toBe(0);
    expect(
      result.messages
        .filter(({ ruleId }) => ruleId === 'local/feature-boundaries')
        .map(({ message, severity }) => ({ message, severity })),
    ).toEqual(expected === 'error' ? [{ message: MESSAGE, severity: 2 }] : []);
  });
});
