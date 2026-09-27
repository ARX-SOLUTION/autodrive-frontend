import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const FEATURE_BOUNDARY_MESSAGE =
  'Import another feature only through its api/ or types.ts (docs/architecture/overview.md#file-structure).';
const restrictedFeatureImport =
  /^@\/features\/([^/]+)\/(pages|components|lib)(?:\/|$)/;

const featureZone = (filename) => {
  const normalized = filename.split('\\').join('/');
  const feature = normalized.match(/\/src\/features\/([^/]+)\//);
  if (feature) return { kind: 'feature', name: feature[1] };
  if (normalized.includes('/src/routes/')) return { kind: 'routes' };
  return { kind: 'other' };
};

const featureBoundaries = {
  meta: {
    type: 'problem',
    docs: {
      description: 'keep feature internals private outside their feature',
    },
    schema: [],
  },
  create(context) {
    const zone = featureZone(context.filename);
    const check = (node) => {
      if (!node || typeof node.value !== 'string') return;
      const match = node.value.match(restrictedFeatureImport);
      if (!match) return;
      const [, target, part] = match;
      if (zone.kind === 'feature' && zone.name === target) return;
      if (zone.kind === 'routes' && part === 'pages') return;
      context.report({ node, message: FEATURE_BOUNDARY_MESSAGE });
    };

    return {
      ImportDeclaration(node) {
        check(node.source);
      },
      ExportNamedDeclaration(node) {
        check(node.source);
      },
      ExportAllDeclaration(node) {
        check(node.source);
      },
      ImportExpression(node) {
        check(node.source);
      },
    };
  },
};

export default tseslint.config(
  { ignores: ['dist', 'storybook-static'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      local: {
        rules: {
          'feature-boundaries': featureBoundaries,
        },
      },
    },
    rules: {
      'local/feature-boundaries': 'error',
    },
  },
  // ponytail: shadcn generated files legitimately co-export variants; disable rule + unused-directive reporting
  {
    files: ['src/components/ui/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
);
