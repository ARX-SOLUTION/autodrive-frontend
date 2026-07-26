/* eslint-disable react-refresh/only-export-components */
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Sparkline } from '@/components/ui/Sparkline';
import { ArrowDownRight, ArrowUpRight } from '@phosphor-icons/react';

// autodrive-vh0.6: pulled out of DashboardPage.tsx so LegacyMainDashboard
// (still in DashboardPage.tsx) and dashboard/TeacherDashboard.tsx can share
// these without duplication. DashboardPage.tsx imports TeacherDashboard, so
// TeacherDashboard importing these back FROM DashboardPage.tsx would be a
// circular import -- this shared module is the tie-break (same constraint
// CompanyRevenueDashboard.tsx notes for its own local-copy helpers, just
// solved here by extraction instead of duplication since KpiCard/SectionCard
// are too large to safely duplicate-and-drift).

export const formatNumber = (n: number) =>
  new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));

export const greetingKey = () => {
  const h = new Date().getHours();
  if (h < 12) return 'dashboard.greeting_morning';
  if (h < 18) return 'dashboard.greeting_afternoon';
  return 'dashboard.greeting_evening';
};

// ---------- Shared chart styles ----------

export const CHART_STYLE = {
  contentStyle: {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    color: 'hsl(var(--popover-foreground))',
    fontSize: 12,
  },
  labelStyle: { color: 'hsl(var(--popover-foreground))' },
  itemStyle: { color: 'hsl(var(--popover-foreground))' },
  cursor: { fill: 'hsl(var(--muted))' },
};

export const AXIS_PROPS = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 11,
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  tickLine: false,
  axisLine: false,
};

// ---------- KPI card ----------

export interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  tone: 'primary' | 'info' | 'warning' | 'success';
  delta?: { pct: number; down: boolean } | null;
  metaLeft?: React.ReactNode;
  metaRight?: React.ReactNode;
  spark?: number[];
  animationDelayMs?: number;
  lead?: boolean;
}

export const KpiCard = ({
  label,
  value,
  unit,
  icon,
  tone,
  delta,
  metaLeft,
  metaRight,
  spark,
  animationDelayMs = 0,
  lead = false,
}: KpiCardProps) => {
  const toneClasses: Record<KpiCardProps['tone'], string> = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/15 text-warning',
    success: 'bg-success/10 text-success',
  };
  return (
    <Card
      className={cn('relative overflow-hidden p-5', 'card-enter')}
      style={{ transitionDelay: `${animationDelayMs}ms` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <div
          className={cn(
            'grid h-8 w-8 place-items-center rounded-md',
            toneClasses[tone],
          )}
          aria-hidden
        >
          {icon}
        </div>
      </div>
      <p
        className={cn(
          'num font-bold leading-tight text-foreground font-mono',
          lead ? 'text-4xl' : 'text-[28px]',
        )}
      >
        {value}
        {unit && (
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        {metaLeft ?? (
          <span className="text-xs text-muted-foreground">&nbsp;</span>
        )}
        {delta ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              delta.down
                ? 'bg-destructive/10 text-destructive'
                : 'bg-success/10 text-success',
            )}
          >
            {delta.down ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <ArrowUpRight className="h-3 w-3" />
            )}
            {delta.down ? '' : '+'}
            {delta.pct}%
          </span>
        ) : metaRight ? (
          <span className="text-xs text-muted-foreground">{metaRight}</span>
        ) : null}
      </div>
      {spark && spark.length > 1 && <Sparkline data={spark} tone={tone} />}
    </Card>
  );
};

// ---------- Section card helper ----------

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  staggerDelayMs?: number;
  children: React.ReactNode;
}

export const SectionCard = ({
  title,
  subtitle,
  action,
  className,
  staggerDelayMs = 0,
  children,
}: SectionCardProps) => (
  <Card
    className={cn('p-5 card-enter', className)}
    style={{ transitionDelay: `${staggerDelayMs}ms` }}
  >
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
    {children}
  </Card>
);
