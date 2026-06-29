import type { Meta, StoryObj } from '@storybook/react';

/**
 * Visual reference for `@autodrive/design-tokens`.
 * Each swatch reads its color directly from the CSS variable so the
 * preview always matches the shipped tokens.
 */

const SEMANTIC_COLORS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'muted',
  'muted-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
  'border',
  'input',
  'ring',
] as const;

const RADII = [
  { name: 'sm', value: 'calc(var(--radius) - 4px)' },
  { name: 'md', value: 'calc(var(--radius) - 2px)' },
  { name: 'lg', value: 'var(--radius)' },
  { name: 'xl', value: 'calc(var(--radius) + 4px)' },
];

const FONT_SIZES = [
  { name: 'xs', cls: 'text-xs' },
  { name: 'sm', cls: 'text-sm' },
  { name: 'base', cls: 'text-base' },
  { name: 'lg', cls: 'text-lg' },
  { name: 'xl', cls: 'text-xl' },
  { name: '2xl', cls: 'text-2xl' },
  { name: '3xl', cls: 'text-3xl' },
];

function Swatch({ token }: { token: string }) {
  const isFg = token.endsWith('foreground');
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-2">
      <div
        className="h-10 w-10 shrink-0 rounded-md border border-border"
        style={{ background: `hsl(var(--${token}))` }}
      />
      <div className="min-w-0">
        <div className="font-mono text-xs">--{token}</div>
        <div className="text-xs text-muted-foreground">
          {isFg ? 'on-surface' : 'surface'}
        </div>
      </div>
    </div>
  );
}

function TokensPanel() {
  return (
    <div
      className="space-y-8 p-6 text-foreground"
      style={{ background: 'hsl(var(--background))' }}
    >
      <section>
        <h2 className="mb-3 text-xl font-semibold">Color tokens</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Sourced from <code>@autodrive/design-tokens/tokens.css</code>. Toggle
          the toolbar theme to inspect dark-mode values.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {SEMANTIC_COLORS.map((c) => (
            <Swatch key={c} token={c} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Radii</h2>
        <div className="flex flex-wrap gap-4">
          {RADII.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className="h-16 w-16 border border-border bg-primary/20"
                style={{ borderRadius: r.value }}
              />
              <div className="font-mono text-xs">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Font sizes</h2>
        <div className="space-y-2">
          {FONT_SIZES.map((f) => (
            <div key={f.name} className="flex items-baseline gap-4">
              <span className="w-10 font-mono text-xs text-muted-foreground">
                {f.name}
              </span>
              <span className={f.cls}>The quick brown fox jumps</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof TokensPanel> = {
  title: 'Foundations/Tokens',
  component: TokensPanel,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TokensPanel>;

export const Reference: Story = {};
