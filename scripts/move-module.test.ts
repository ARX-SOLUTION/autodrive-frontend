import { describe, expect, it } from 'vitest';
import {
  rescan,
  rewriteRelativeSpecifiers,
  rewriteSpecifiers,
  specifiersForMove,
} from './move-module.mjs';

// Fictional modules: the codemod rewrites this file too, so real ones would drift.
const service = specifiersForMove({
  from: 'src/services/widgetService.ts',
  to: 'src/features/widgets/api/widgetService.ts',
  isDirectory: false,
});

describe('move-module codemod', () => {
  it('maps a moved file to its new extensionless specifier', () => {
    expect(service).toEqual({
      '@/services/widgetService': '@/features/widgets/api/widgetService',
    });
    expect(
      specifiersForMove({
        from: 'src/pages/WidgetsPage.tsx',
        to: 'src/features/widgets/pages/WidgetsPage.tsx',
        isDirectory: false,
      }),
    ).toEqual({
      '@/pages/WidgetsPage': '@/features/widgets/pages/WidgetsPage',
    });
  });

  it('also maps the directory specifier of an index file', () => {
    expect(
      specifiersForMove({
        from: 'src/lib/widgets/index.ts',
        to: 'src/features/widgets/lib/index.ts',
        isDirectory: false,
      }),
    ).toEqual({
      '@/lib/widgets/index': '@/features/widgets/lib/index',
      '@/lib/widgets': '@/features/widgets/lib',
    });
  });

  it('maps a directory and every specifier below it', () => {
    const mapping = specifiersForMove({
      from: 'src/pages/widgets',
      to: 'src/features/widgets/components',
      isDirectory: true,
    });
    expect(mapping).toEqual({
      '@/pages/widgets': '@/features/widgets/components',
      '@/pages/widgets/': '@/features/widgets/components/',
    });
    expect(
      rewriteSpecifiers(
        [
          "import widgets from '@/pages/widgets';",
          "import WidgetDialog from '@/pages/widgets/WidgetDialog';",
          "import other from '@/pages/widgetsX/Other';",
        ].join('\n'),
        mapping,
      ),
    ).toEqual({
      code: [
        "import widgets from '@/features/widgets/components';",
        "import WidgetDialog from '@/features/widgets/components/WidgetDialog';",
        "import other from '@/pages/widgetsX/Other';",
      ].join('\n'),
      count: 2,
    });
  });

  it('rewrites every literal form that names the moved module', () => {
    const code = [
      "import { useWidgets } from '@/services/widgetService';",
      'export * from "@/services/widgetService";',
      'const load = () => import(`@/services/widgetService`);',
      "vi.mock('@/services/widgetService', () => ({}));",
      "vi.doMock('@/services/widgetService');",
      "vi.unmock('@/services/widgetService');",
      "await vi.importActual('@/services/widgetService');",
      "type Widgets = typeof import('@/services/widgetService');",
    ].join('\n');

    expect(rewriteSpecifiers(code, service)).toEqual({
      code: code.replaceAll(
        '@/services/widgetService',
        '@/features/widgets/api/widgetService',
      ),
      count: 8,
    });
  });

  it('never rewrites a partial match', () => {
    const code = [
      "import x from '@/services/widgetServiceX';",
      "import y from '@/services/widgetService/extra';",
      'const z = `@/services/widgetService${suffix}`;',
      "const note = 'see @/services/widgetService';",
    ].join('\n');

    expect(rewriteSpecifiers(code, service)).toEqual({ code, count: 0 });
  });
});

describe('move-module relative specifiers', () => {
  const before = new Set([
    'src/services/widgetService.ts',
    'src/services/widgetService.test.ts',
    'src/pages/WidgetsPage.tsx',
    'src/pages/widgets/WidgetDialog.tsx',
    'src/pages/dashboard/cards.tsx',
    'src/pages/App.tsx',
    'src/pages/locales/en.json',
    'src/pages/parts/index.ts',
    'src/pages/schema.d.ts',
    'src/lib/format.ts',
  ]);
  const moves = [
    {
      from: 'src/services/widgetService.ts',
      to: 'src/features/widgets/api/widgetService.ts',
    },
    {
      from: 'src/services/widgetService.test.ts',
      to: 'src/features/widgets/api/widgetService.test.ts',
    },
    {
      from: 'src/pages/WidgetsPage.tsx',
      to: 'src/features/widgets/pages/WidgetsPage.tsx',
    },
    { from: 'src/pages/widgets', to: 'src/features/widgets/components' },
  ];
  const plan = (file: string) => ({
    file,
    moves,
    exists: (path: string) => before.has(path),
  });
  // Written inline after `from`, these would look like real imports to the codemod's own re-scan.
  const rel = {
    sibling: './widgetService',
    cards: './dashboard/cards',
    dialog: '../widgets/WidgetDialog',
    format: '../../lib/format',
    app: './App.tsx',
    en: './locales/en.json',
    parts: './parts',
    schema: './schema',
  };

  it('rewrites to @/ when the importer and the target moved together', () => {
    const code = [
      `import { fetchWidgets } from '${rel.sibling}';`,
      `export * from "${rel.sibling}";`,
      `const load = () => import('${rel.sibling}');`,
      `await vi.importActual<typeof import('${rel.sibling}')>('${rel.sibling}');`,
    ].join('\n');

    expect(
      rewriteRelativeSpecifiers(
        code,
        plan('src/services/widgetService.test.ts'),
      ),
    ).toEqual({
      code: code.replaceAll(
        rel.sibling,
        '@/features/widgets/api/widgetService',
      ),
      count: 5,
    });
  });

  it('rewrites to @/ when only the importer moved', () => {
    expect(
      rewriteRelativeSpecifiers(
        `import { cards } from '${rel.cards}';`,
        plan('src/pages/WidgetsPage.tsx'),
      ),
    ).toEqual({
      code: "import { cards } from '@/pages/dashboard/cards';",
      count: 1,
    });
  });

  it('rewrites to @/ when only the target moved', () => {
    expect(
      rewriteRelativeSpecifiers(
        `import WidgetDialog from '${rel.dialog}';`,
        plan('src/pages/dashboard/cards.tsx'),
      ),
    ).toEqual({
      code: "import WidgetDialog from '@/features/widgets/components/WidgetDialog';",
      count: 1,
    });
  });

  it('leaves an unrelated relative import alone', () => {
    const code = `import { format } from '${rel.format}';`;

    expect(
      rewriteRelativeSpecifiers(code, plan('src/pages/dashboard/cards.tsx')),
    ).toEqual({ code, count: 0 });
  });

  it('rewrites a relative vi.mock specifier', () => {
    expect(
      rewriteRelativeSpecifiers(
        `vi.mock('${rel.sibling}', () => ({ fetchWidgets: vi.fn() }));`,
        plan('src/services/widgetService.test.ts'),
      ),
    ).toEqual({
      code: "vi.mock('@/features/widgets/api/widgetService', () => ({ fetchWidgets: vi.fn() }));",
      count: 1,
    });
  });

  it('keeps explicit extensions and the directory form of an index', () => {
    const code = [
      `import App from '${rel.app}';`,
      `import en from '${rel.en}';`,
      `import { parts } from '${rel.parts}';`,
      `import type { Schema } from '${rel.schema}';`,
    ].join('\n');

    expect(
      rewriteRelativeSpecifiers(code, plan('src/pages/WidgetsPage.tsx')).code,
    ).toBe(
      [
        "import App from '@/pages/App.tsx';",
        "import en from '@/pages/locales/en.json';",
        "import { parts } from '@/pages/parts';",
        "import type { Schema } from '@/pages/schema';",
      ].join('\n'),
    );
  });

  it('re-scan catches a relative specifier that no longer resolves', () => {
    const after = new Set([
      'src/features/widgets/api/widgetService.ts',
      'src/features/widgets/components/WidgetDialog.tsx',
      'src/pages/dashboard/cards.tsx',
      'src/lib/format.ts',
    ]);
    const code = [
      `import WidgetDialog from '${rel.dialog}';`,
      `import { format } from '${rel.format}';`,
      "import { useWidgets } from '@/services/widgetService';",
    ].join('\n');

    expect(
      rescan(code, {
        file: 'src/pages/dashboard/cards.tsx',
        mapping: service,
        exists: (path: string) => after.has(path),
      }).map(({ text }) => text),
    ).toEqual([`'${rel.dialog}'`, "'@/services/widgetService'"]);
  });
});
