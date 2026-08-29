import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from '@/app/navigation';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Warning,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDot,
  CheckCircle,
  CaretRight,
  ClipboardText,
  Clock,
  GraduationCap,
  Hourglass,
  PiggyBank,
  ArrowsClockwise,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersThree,
  Wallet,
} from '@phosphor-icons/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  CourseTypeTabs,
  type CourseTypeTab,
} from '@/components/ui/course-type-tabs';
import { useBranches } from '@/services/branchService';
import { useCompanyOverview } from '@/services/dashboardService';
import type {
  CompanyOverview,
  CompanyOverviewQuery,
} from '@/services/dashboardService';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { CourseType } from '@/types/student';
import { cn } from '@/lib/utils';
import { formatMoney, groupDigits } from '@/lib/money';
import { formatNumber } from '@/pages/dashboard/dashboardCards';

const UZ_TIMEZONE = 'Asia/Tashkent';
const freshnessTimestampFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: UZ_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const formatFreshnessTimestamp = (value: string | Date) => {
  const parts = freshnessTimestampFormatter.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';

  return `${part('day')}.${part('month')}.${part('year')} ${part('hour')}:${part('minute')}`;
};

// uz-UZ Intl month:'short' renders as an unresolved skeleton (e.g. "M07 1")
// in some browsers — build the date-fns dd.MM(.yyyy)(HH:mm) convention
// instead of Intl.DateTimeFormat's month name.
const formatDate = (
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
) => {
  let pattern = 'dd.MM';
  if (options?.year) pattern += '.yyyy';
  if (options?.hour) pattern += ' HH:mm';
  return format(new Date(value), pattern);
};
const formatShortDate = (value: string | Date) =>
  format(new Date(value), 'dd.MM.yyyy');

// ponytail: local copy, not imported from DashboardPage.tsx — that file
// already imports CompanyRevenueDashboard, so importing back would create a
// circular dependency. Spec's offered fallback ("else local copy") applies.
const greetingKey = () => {
  const h = new Date().getHours();
  if (h < 12) return 'dashboard.greeting_morning';
  if (h < 18) return 'dashboard.greeting_afternoon';
  return 'dashboard.greeting_evening';
};

// Uzbek month abbreviation — a static table, NOT Intl month:'short'. The
// dd.MM formatDate() helper above documents 'uz-UZ' + month:'short'
// rendering an unresolved skeleton (e.g. "M07 1") in some browsers; testing
// this build in an actual browser shows bare 'uz' (no region) hits the
// exact same bug ("M07 18"), so there's no Intl locale tag that's safe here.
const UZ_MONTH_ABBR = [
  'YAN',
  'FEV',
  'MAR',
  'APR',
  'MAY',
  'IYUN',
  'IYUL',
  'AVG',
  'SEN',
  'OKT',
  'NOY',
  'DEK',
];
/** {day, month (uz abbr), year} for `value`, in Asia/Tashkent — built off the
 *  already-reliable numeric uzDateFormatter above, not Intl month names. */
const uzDateParts = (value: string | Date) => {
  const [year, month, day] = uzDateFormatter.format(new Date(value)).split('-');
  return { day, month: UZ_MONTH_ABBR[Number(month) - 1], year };
};

const DAY_MS = 86_400_000;
/** Whole days between `iso` and now, or null when there's no date to diff. */
const daysSince = (iso?: string | null): number | null =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS) : null;

type DebtTone = 'danger' | 'warning' | 'success';
/** Recovery-queue priority dot tone — mock thresholds: never-paid or either
 *  amount/age past a bucket line pushes the row up a tone. */
const debtPriorityTone = (
  debt: number,
  overdueDays: number | null,
): DebtTone => {
  if (overdueDays === null || debt >= 2_000_000 || overdueDays >= 14)
    return 'danger';
  if (debt >= 1_000_000 || overdueDays >= 7) return 'warning';
  return 'success';
};
const DEBT_TONE_VAR: Record<DebtTone, string> = {
  danger: 'hsl(var(--chart-danger))',
  warning: 'hsl(var(--chart-warning))',
  success: 'hsl(var(--chart-success))',
};

// en-CA formatter always renders YYYY-MM-DD — cache it once like
// moneyFormatter instead of constructing it on every call.
const uzDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: UZ_TIMEZONE,
});

const todayInUz = () => uzDateFormatter.format(new Date());

const startOfMonthInUz = () => {
  const today = todayInUz();
  return `${today.slice(0, 8)}01`;
};

const getSearchQuery = (
  params: URLSearchParams,
  branchId?: string,
  userBranchId?: string,
): CompanyOverviewQuery => ({
  branchId: branchId || userBranchId,
  courseType: (params.get('course_type') || undefined) as
    CourseType | undefined,
  from: params.get('from') || undefined,
  to: params.get('to') || undefined,
  granularity: params.get('granularity') === 'week' ? 'week' : 'day',
});

export const DashboardCard = ({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <Card
    className={cn(
      // exec-dash 7: flat token surface (Design.md "Cards: 1px solid
      // --border, no shadow") — no glass blur/translucency, no hover lift.
      'border-border bg-card p-5 shadow-none',
      className,
    )}
  >
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold tracking-tight text-balance">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
    {children}
  </Card>
);

export const KpiCard = ({
  label,
  value,
  meta,
  icon: Icon,
  tone,
  delta,
  onClick,
  lead = false,
}: {
  label: string;
  value: string;
  meta: string;
  icon: typeof Wallet;
  tone: 'primary' | 'warning' | 'success' | 'info';
  delta?: number | null;
  onClick?: () => void;
  lead?: boolean;
}) => {
  const toneClasses = {
    primary: 'bg-primary/[14%] text-primary',
    warning: 'bg-warning/[14%] text-warning',
    success: 'bg-success/[14%] text-success',
    info: 'bg-info/[14%] text-info',
  };
  return (
    <Card
      className={cn(
        // exec-dash 7: flat token surface, no glass/shadow — hover reads via
        // a background tint (Design.md's row-hover convention), not lift.
        'relative overflow-hidden border-border bg-card p-5 shadow-none',
        onClick &&
          'cursor-pointer motion-safe:transition-colors hover:bg-muted hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
            toneClasses[tone],
          )}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p
        className={cn(
          'num mt-4 font-bold font-mono',
          lead ? 'text-4xl' : 'text-2xl',
        )}
      >
        {value}
      </p>
      <div className="mt-3 flex min-h-5 items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{meta}</span>
        {delta !== undefined && delta !== null && <DeltaChip delta={delta} />}
      </div>
    </Card>
  );
};

// `ink` = Design.md "on accent surfaces, text/icons use ink" rule — the
// primary/gradient KPI tile keeps this chip in ink tone regardless of delta
// sign, since a red/green chip on the amber gradient reads as a second
// clashing accent. Non-primary callers omit `ink` and keep semantic colors.
const DeltaChip = ({
  delta,
  ink = false,
}: {
  delta: number;
  ink?: boolean;
}) => (
  <span
    data-testid="kpi-delta"
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
      ink
        ? 'bg-primary-foreground/[14%] text-primary-foreground'
        : delta < 0
          ? 'bg-destructive/[14%] text-destructive'
          : 'bg-success/[14%] text-success',
    )}
  >
    {delta < 0 ? (
      <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
    ) : (
      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
    )}
    {delta >= 0 ? '+' : ''}
    {delta}%
  </span>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
    {children}
  </p>
);

const FilterBar = ({
  params,
  canViewAllBranches,
  branches,
  onChange,
  onRefresh,
  isFetching,
}: {
  params: URLSearchParams;
  canViewAllBranches: boolean;
  branches: Array<{ id: string; name: string }>;
  onChange: (key: string, value?: string) => void;
  onRefresh: () => void;
  isFetching: boolean;
}) => {
  const { t } = useTranslation();
  const today = todayInUz();
  const from = params.get('from') || startOfMonthInUz();
  const to = params.get('to') || today;
  const controlClassName =
    'h-10 rounded-[11px] border border-border bg-card px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
      <DateRangePicker
        from={from}
        to={to}
        max={today}
        onChange={(nextFrom, nextTo) => {
          // Always one updateParam('range') so from/to stay in sync
          // (same batching rule as autodrive-6cq.5.70).
          const f = nextFrom ?? startOfMonthInUz();
          const t = nextTo ?? today;
          onChange('range', `${f <= t ? f : t}|${f <= t ? t : f}`);
        }}
        aria-label={t('dashboard.v2.date_range', "Sana oralig'i")}
        className="gap-1.5"
      />
      {canViewAllBranches && (
        <select
          aria-label={t('dashboard.v2.branch', 'Filial')}
          value={params.get('branch_id') || 'all'}
          onChange={(event) =>
            onChange(
              'branch_id',
              event.target.value === 'all' ? undefined : event.target.value,
            )
          }
          className={controlClassName}
        >
          <option value="all">
            {t('common.all_branches', 'Barcha filiallar')}
          </option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      )}
      <CourseTypeTabs
        value={(params.get('course_type') as CourseTypeTab) || 'all'}
        onChange={(value) =>
          onChange('course_type', value === 'all' ? undefined : value)
        }
        className="shrink-0"
        listClassName="h-10"
      />
      <select
        aria-label={t('dashboard.v2.granularity', 'Granulyarlik')}
        value={params.get('granularity') === 'week' ? 'week' : 'day'}
        onChange={(event) => onChange('granularity', event.target.value)}
        className={controlClassName}
      >
        <option value="day">{t('dashboard.v2.daily', 'Kunlik')}</option>
        <option value="week">{t('dashboard.v2.weekly', 'Haftalik')}</option>
      </select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-[11px]"
        onClick={onRefresh}
        disabled={isFetching}
        aria-label={t('dashboard.v2.refresh', 'Yangilash')}
        title={t('dashboard.v2.refresh', 'Yangilash')}
      >
        <ArrowsClockwise
          className={cn('h-4 w-4', isFetching && 'animate-spin')}
        />
      </Button>
    </div>
  );
};

const FreshnessCaption = ({
  generated_at,
  data_through,
}: CompanyOverview['freshness']) => {
  const { t } = useTranslation();
  const generatedAt = new Date(generated_at);
  const dataThrough = data_through ? new Date(data_through) : null;
  const showDataThrough =
    dataThrough !== null && dataThrough.getTime() < generatedAt.getTime();

  return (
    <div
      data-testid="dashboard-freshness-caption"
      className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
    >
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {t('dashboard.v2.updated', 'Yangilandi')} ·{' '}
        {formatFreshnessTimestamp(generatedAt)}
        {showDataThrough && (
          <>
            {' '}
            · {t('dashboard.v2.to', 'Gacha')}{' '}
            {formatFreshnessTimestamp(dataThrough)}
          </>
        )}
      </span>
    </div>
  );
};

const RevenueChart = ({
  data,
  onReset,
}: {
  data: CompanyOverview['revenue_trend'];
  onReset?: () => void;
}) => {
  const { t } = useTranslation();
  const chartData = data.map((item) => ({
    ...item,
    label: formatShortDate(item.period_start),
  }));
  const lastIndex = chartData.length - 1;
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  return (
    <div
      aria-label={t(
        'dashboard.v2.revenue_chart_summary',
        `Revenue trend: ${formatMoney(total)} total`,
        { total: formatMoney(total) },
      )}
    >
      {data.length ? (
        <>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="company-revenue-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.24}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="hsl(var(--hair))"
                  vertical={false}
                  horizontal
                />
                <XAxis
                  dataKey="label"
                  {...AXIS_PROPS}
                  interval="preserveStartEnd"
                />
                <YAxis
                  {...AXIS_PROPS}
                  tickCount={3}
                  tickFormatter={(value) =>
                    `${Math.round(Number(value) / 1_000_000)}M`
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 10,
                  }}
                  formatter={(value: number, _name, item) => [
                    formatMoney(value),
                    `${item.payload.payment_count} ta payment`,
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.6}
                  fill="url(#company-revenue-fill)"
                  isAnimationActive={false}
                  // Dot only on the last point (mock spec) — zero it out for
                  // every earlier point instead of branching return shape.
                  dot={(dotProps: {
                    cx?: number;
                    cy?: number;
                    index?: number;
                  }) => (
                    <circle
                      key={`revenue-dot-${dotProps.index}`}
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      r={dotProps.index === lastIndex ? 5 : 0}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--card))"
                      strokeWidth={dotProps.index === lastIndex ? 2.5 : 0}
                    />
                  )}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold">
              {t('dashboard.v2.view_data', 'Maʼlumotlarni ko‘rish')}
            </summary>
            <table className="mt-2 w-full text-xs">
              <caption className="sr-only">
                {t('dashboard.v2.revenue_table_caption', 'Revenue trend data')}
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="py-2">
                    {t('dashboard.v2.period', 'Davr')}
                  </th>
                  <th scope="col" className="py-2 text-right">
                    {t('dashboard.top_branches_revenue', 'Tushum')}
                  </th>
                  <th scope="col" className="py-2 text-right">
                    {t('payments.payment_count', "To'lovlar soni")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr
                    key={item.period_start}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="py-2">{formatDate(item.period_start)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(item.amount)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {item.payment_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <EmptyData
          message={t(
            'dashboard.v2.no_period_data',
            'Tanlangan davr uchun maʼlumot yo‘q',
          )}
          onReset={onReset}
        />
      )}
    </div>
  );
};

const AXIS_PROPS = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 10,
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  tickLine: false,
  axisLine: false,
};

const EmptyData = ({
  message,
  onReset,
}: {
  message?: string;
  onReset?: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-48 place-items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
      <span>{message ?? t('common.no_data', "Ma'lumot topilmadi")}</span>
      {onReset && (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          {t('common.clear', 'Tozalash')}
        </Button>
      )}
    </div>
  );
};

const LegendRow = ({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) => (
  <div className="flex items-center gap-2">
    <span
      className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
    <span className="flex-1 text-[12.5px] font-semibold">{label}</span>
    <span className="font-mono text-xs tabular-nums text-muted-foreground">
      {value}
    </span>
  </div>
);

// Payment status donut (mock section 5) — inline SVG, not Recharts: fixed
// r54/stroke16 geometry per spec, round-capped segments with a fixed gap.
const DONUT_R = 54;
const DONUT_STROKE = 16;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_R;
const DONUT_GAP = 8; // ponytail: tuned constant clearing the round-cap overlap between segments

const PaymentStatusDonut = ({
  paid,
  partial,
  debt,
  coverageRate,
}: {
  paid: number;
  partial: number;
  debt: number;
  coverageRate: number;
}) => {
  const { t } = useTranslation();
  const total = paid + partial + debt;
  const segments = [
    { value: paid, color: 'hsl(var(--chart-success))' },
    { value: partial, color: 'hsl(var(--chart-warning))' },
    { value: debt, color: 'hsl(var(--chart-danger))' },
  ].filter((segment) => segment.value > 0);
  const size = (DONUT_R + DONUT_STROKE / 2) * 2;
  const center = size / 2;
  let cursor = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={t(
          'dashboard.v2.coverage_bar_label',
          '{{rate}}% to‘liq to‘langan',
          { rate: coverageRate },
        )}
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle
            cx={center}
            cy={center}
            r={DONUT_R}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={DONUT_STROKE}
          />
          {total > 0 &&
            segments.map((segment, index) => {
              const rawLength = (segment.value / total) * DONUT_CIRCUMFERENCE;
              const length = Math.max(
                rawLength - (segments.length > 1 ? DONUT_GAP : 0),
                0,
              );
              const offset = -cursor;
              cursor += rawLength;
              return (
                <circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={DONUT_R}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={DONUT_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${length} ${DONUT_CIRCUMFERENCE - length}`}
                  strokeDashoffset={offset}
                />
              );
            })}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="num text-[26px] font-extrabold leading-none">
            {coverageRate}%
          </p>
          <p className="mt-1 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t('dashboard.v2.coverage_short', 'Qamrov')}
          </p>
        </div>
      </div>
    </div>
  );
};

const CompanyRevenueDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canViewAllBranches = useCan('viewAllBranches');
  const [params, setParams] = useSearchParams();
  const [branchSort, setBranchSort] = useState<
    'revenue' | 'active_students' | 'outstanding_debt' | 'collection_rate'
  >('revenue');
  const { data: branches = [] } = useBranches(canViewAllBranches);
  const query = useMemo(
    () =>
      getSearchQuery(
        params,
        params.get('branch_id') || undefined,
        user?.branch_id,
      ),
    [params, user?.branch_id],
  );
  const { data, isLoading, isFetching, isError, refetch } =
    useCompanyOverview(query);

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (key === 'range') {
      const [from, to] = (value || '').split('|');
      if (from) next.set('from', from);
      else next.delete('from');
      if (to) next.set('to', to);
      else next.delete('to');
    } else if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!data) return <DashboardSkeleton />;

  const { kpis } = data;
  const statusTotal =
    kpis.collection.paid + kpis.collection.partial + kpis.collection.debt;
  const attendanceTotal = Object.values(
    data.operations.attendance_status,
  ).reduce((sum, value) => sum + value, 0);
  const sortedBranches = [...data.branch_performance].sort((a, b) => {
    const values = {
      revenue: [a.collected_revenue, b.collected_revenue],
      active_students: [a.active_students, b.active_students],
      outstanding_debt: [a.outstanding_debt, b.outstanding_debt],
      collection_rate: [a.collection_rate, b.collection_rate],
    }[branchSort];
    return values[1] - values[0];
  });
  const resetFilters = () => {
    const next = new URLSearchParams();
    next.set('from', startOfMonthInUz());
    next.set('to', todayInUz());
    next.set('granularity', 'day');
    setParams(next, { replace: true });
  };
  const dashboardContext = new URLSearchParams();
  if (query.branchId) dashboardContext.set('branch_id', query.branchId);
  if (query.courseType) dashboardContext.set('course_type', query.courseType);
  // /payments and /students read date_from/date_to (see useUrlParams), not
  // from/to — using the wrong keys here silently drops the date filter on
  // drill-down navigation.
  if (query.from) dashboardContext.set('date_from', query.from);
  if (query.to) dashboardContext.set('date_to', query.to);
  if (query.granularity) dashboardContext.set('granularity', query.granularity);
  const withContext = (
    path: string,
    overrides: Record<string, string> = {},
  ) => {
    const next = new URLSearchParams(dashboardContext);
    Object.entries(overrides).forEach(([key, value]) => next.set(key, value));
    return `${path}?${next.toString()}`;
  };
  const comparisonRange =
    kpis.revenue.previous_period_from &&
    (kpis.revenue.previous_period_to_inclusive ||
      kpis.revenue.previous_period_to)
      ? `${formatDate(kpis.revenue.previous_period_from)} — ${formatDate(kpis.revenue.previous_period_to_inclusive || kpis.revenue.previous_period_to!)}`
      : t('dashboard.v2.previous_period', 'Oldingi davr');
  // "01 — 18 IYUL 2026 · KUNLIK" — start day, end day+month(uz)+year, then
  // granularity, all uppercase per the mock's mono caption.
  const trendPeriodTo = kpis.revenue.period_to_inclusive || data.filters.to;
  const trendEnd = uzDateParts(trendPeriodTo);
  const trendRangeCaption = `${format(new Date(data.filters.from), 'dd')} — ${trendEnd.day} ${trendEnd.month} ${trendEnd.year} · ${t(data.filters.granularity === 'week' ? 'dashboard.v2.weekly' : 'dashboard.v2.daily').toUpperCase()}`;
  const currency = t('dashboard.currency_suffix');
  const revenueTrendTotal = data.revenue_trend.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  return (
    <div className="space-y-5 pb-8">
      <header className="space-y-5">
        <div>
          <FreshnessCaption {...data.freshness} />
          <h1 className="mt-2 font-heading text-[40px] font-extrabold leading-[1.1] tracking-[-0.025em] text-balance">
            {t(greetingKey())}
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground text-pretty">
            {t(
              'dashboard.hero_sub',
              '{{count}} ta talaba joriy holatda qarzdor.',
              { count: kpis.debt.students_with_debt },
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {(
            [
              {
                to: '/payments?action=create',
                icon: Wallet,
                // ponytail: full static class strings, not `bg-${tone}` —
                // Tailwind's scanner only picks up literal class text, so an
                // interpolated tone would never generate the utility.
                tileClass: 'bg-primary/[14%] text-primary',
                label: t(
                  'dashboard.v2.quick_action_payment',
                  "To'lov qabul qilish",
                ),
              },
              {
                to: '/students?action=create',
                icon: UserPlus,
                tileClass: 'bg-info/[14%] text-info',
                label: t(
                  'dashboard.v2.quick_action_student',
                  "Talaba qo'shish",
                ),
              },
              {
                to: '/attendance',
                icon: UsersThree,
                tileClass: 'bg-success/[14%] text-success',
                label: t(
                  'dashboard.v2.quick_action_attendance',
                  'Davomat olish',
                ),
              },
            ] as const
          ).map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-[15px] py-[11px] text-[13.5px] font-semibold motion-safe:transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  'grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg',
                  action.tileClass,
                )}
                aria-hidden="true"
              >
                <action.icon className="h-4 w-4" />
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </header>

      <FilterBar
        params={params}
        canViewAllBranches={canViewAllBranches}
        branches={branches}
        onChange={updateParam}
        onRefresh={() => void refetch()}
        isFetching={isFetching}
      />

      <div
        data-testid="dashboard-v2-kpi-strip"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"
        aria-label={t('dashboard.v2.kpi_section_label', 'Revenue control KPIs')}
      >
        <button
          type="button"
          onClick={() =>
            navigate(
              withContext('/payments', {
                date_from: todayInUz(),
                date_to: todayInUz(),
              }),
            )
          }
          className="rounded-xl border border-border bg-card p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="text-[11px] text-muted-foreground">
            {t('dashboard.v2.today_revenue', 'Bugungi tushum')}
          </p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">
            {formatMoney(kpis.revenue.today)}
          </p>
        </button>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">
            {t('dashboard.v2.period_revenue', 'Davr tushumi')}
          </p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">
            {formatMoney(kpis.revenue.period)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">
            {t('dashboard.v2.period_over_period', 'Davr o‘sishi')}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {kpis.revenue.delta_percent != null ? (
              <DeltaChip delta={kpis.revenue.delta_percent} />
            ) : (
              <span className="font-heading text-xl font-bold">—</span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {comparisonRange}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            navigate(withContext('/students', { status: 'active' }))
          }
          className="rounded-xl border border-border bg-card p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="text-[11px] text-muted-foreground">
            {t('dashboard.hero_active_students')}
          </p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">
            {groupDigits(String(Math.round(kpis.students.active)))}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            +{kpis.students.new}{' '}
            {t('dashboard.v2.new_in_period', 'tanlangan davrda')}
          </p>
        </button>
        <button
          type="button"
          onClick={() =>
            navigate(
              withContext('/students', {
                status: 'active',
                has_debt: 'true',
              }),
            )
          }
          className="rounded-xl border border-border bg-card p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="text-[11px] text-muted-foreground">
            {t('dashboard.v2.outstanding_debt', 'Jami qarzdorlik')}
          </p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums text-destructive">
            {formatMoney(kpis.debt.current_outstanding)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('dashboard.v2.debtors', '{{count}} ta qarzdor student', {
              count: kpis.debt.students_with_debt,
            })}
          </p>
        </button>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">
            {t('dashboard.v2.academic_block.attendance_rate', 'Davomat')}
          </p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">
            {kpis.attendance_rate != null ? `${kpis.attendance_rate}%` : '—'}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <Eyebrow>{t('dashboard.v2.revenue_trend', 'Tushum trendi')}</Eyebrow>
          <h2 className="mb-2 font-heading text-2xl font-bold tracking-tight text-foreground">
            {t('dashboard.revenue_trend_sub', {
              total: formatNumber(revenueTrendTotal),
              currency,
            })}
          </h2>
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {trendRangeCaption}
          </p>
          <RevenueChart data={data.revenue_trend} onReset={resetFilters} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard
          title={t('dashboard.v2.recovery', 'Qarzdorlik navbati')}
          description={t(
            'dashboard.v2.recovery_subtitle',
            'Eng katta qarzlar birinchi ko‘rsatiladi.',
          )}
        >
          {data.recovery_queue.length ? (
            <ul>
              {data.recovery_queue.map((student) => {
                const overdueDays = daysSince(student.last_payment_at);
                const tone = debtPriorityTone(student.debt, overdueDays);
                return (
                  <li
                    key={student.student_id}
                    onClick={() => navigate(`/students/${student.student_id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/students/${student.student_id}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={t(
                      'dashboard.v2.view_debtor',
                      "Ko'rish: {{name}}",
                      { name: student.student_name },
                    )}
                    className="flex cursor-pointer items-center justify-between gap-4 border-b border-border py-3 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {student.student_name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {student.branch_name}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: DEBT_TONE_VAR[tone] }}
                        aria-hidden="true"
                      />
                      <span className="font-heading text-base font-bold tabular-nums text-destructive">
                        {formatMoney(student.debt)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyData />
          )}
          {data.recovery_queue.length > 0 && (
            <Link
              to={withContext('/payments')}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {t('dashboard.v2.view_all_debtors', 'Barcha qarzdorlar')}
              <CaretRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          )}
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard
          title={t('dashboard.v2.branch_performance', 'Filial performance')}
          description={t(
            'dashboard.v2.branch_subtitle',
            'Tanlangan davr tushumi va joriy qarzdorlik.',
          )}
          action={
            <Link
              to={withContext('/branches')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t('dashboard.v2.manage_branches', 'Filiallar')}{' '}
              <CaretRight className="ml-1 inline h-3 w-3" aria-hidden="true" />
            </Link>
          }
        >
          {sortedBranches.length ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                <span className="text-muted-foreground">
                  {t('dashboard.v2.sort_by', 'Saralash')}:
                </span>
                {(
                  [
                    ['revenue', t('dashboard.top_branches_revenue', 'Tushum')],
                    [
                      'active_students',
                      t('dashboard.top_branches_students', 'Active'),
                    ],
                    [
                      'outstanding_debt',
                      t('dashboard.cards.total_debt', 'Qarz'),
                    ],
                    ['collection_rate', t('dashboard.v2.coverage', 'Coverage')],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBranchSort(key)}
                    aria-pressed={branchSort === key}
                    className={cn(
                      'rounded-full border px-2.5 py-1 motion-safe:transition-[background-color,color]',
                      branchSort === key
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="space-y-2 sm:hidden">
                {sortedBranches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => navigate(`/branches/${branch.id}`)}
                    className="w-full rounded-lg border border-border/60 bg-background/30 p-3 text-left motion-safe:transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{branch.name}</span>
                      <CaretRight
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>
                        {t('dashboard.top_branches_revenue', 'Tushum')}{' '}
                        <strong className="block text-foreground tabular-nums">
                          {formatMoney(branch.collected_revenue)}
                        </strong>
                      </span>
                      <span>
                        {t('dashboard.cards.total_debt', 'Qarz')}{' '}
                        <strong className="block text-warning tabular-nums">
                          {formatMoney(branch.outstanding_debt)}
                        </strong>
                      </span>
                      <span>
                        {t('dashboard.top_branches_students', 'Active')}{' '}
                        <strong className="block text-foreground tabular-nums">
                          {branch.active_students}
                        </strong>
                      </span>
                      <span>
                        {t('dashboard.v2.coverage', 'Coverage')}{' '}
                        <strong className="block text-foreground tabular-nums">
                          {branch.collection_rate}%
                        </strong>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-2">
                        {t('dashboard.top_branches_branch', 'Filial')}
                      </th>
                      <th className="py-2 text-right">
                        {t('dashboard.top_branches_revenue', 'Tushum')}
                      </th>
                      <th className="py-2 text-right">
                        {t('dashboard.top_branches_students', 'Active')}
                      </th>
                      <th className="py-2 text-right">
                        {t('dashboard.cards.total_debt', 'Qarz')}
                      </th>
                      <th className="py-2 text-right">
                        {t('dashboard.v2.coverage', 'Coverage')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBranches.map((branch) => (
                      <tr
                        key={branch.id}
                        tabIndex={0}
                        role="button"
                        onClick={() => navigate(`/branches/${branch.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/branches/${branch.id}`);
                          }
                        }}
                        className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <td className="py-3 font-medium">{branch.name}</td>
                        <td className="py-3 text-right font-semibold tabular-nums">
                          {formatMoney(branch.collected_revenue)}
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          {branch.active_students}
                        </td>
                        <td className="py-3 text-right tabular-nums text-warning">
                          {formatMoney(branch.outstanding_debt)}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(branch.collection_rate, 100)}%`,
                                  backgroundColor:
                                    branch.collection_rate >= 85
                                      ? 'hsl(var(--chart-success))'
                                      : 'hsl(var(--chart-warning))',
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs tabular-nums">
                              {branch.collection_rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyData />
          )}
        </DashboardCard>
        <DashboardCard
          title={t('dashboard.v2.collection_status', 'To‘lov holati')}
          description={t(
            'dashboard.v2.collection_subtitle',
            'Active studentlar bo‘yicha joriy coverage.',
          )}
        >
          {statusTotal ? (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
              <PaymentStatusDonut
                paid={kpis.collection.paid}
                partial={kpis.collection.partial}
                debt={kpis.collection.debt}
                coverageRate={kpis.collection.coverage_rate}
              />
              <div className="w-full max-w-[220px] space-y-2.5">
                <LegendRow
                  color="hsl(var(--chart-success))"
                  label={t('dashboard.payment_full', "To'liq to'lagan")}
                  value={kpis.collection.paid}
                />
                <LegendRow
                  color="hsl(var(--chart-warning))"
                  label={t('dashboard.payment_partial', 'Qisman')}
                  value={kpis.collection.partial}
                />
                <LegendRow
                  color="hsl(var(--chart-danger))"
                  label={t('dashboard.payment_none', "To'lamagan")}
                  value={kpis.collection.debt}
                />
              </div>
            </div>
          ) : (
            <EmptyData />
          )}
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard
          title={t('dashboard.v2.operations', 'Operational follow-through')}
          description={t(
            'dashboard.v2.operations_subtitle',
            'Revenue qaroridan keyingi bajariladigan ishlar.',
          )}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              to="/schedule"
              className="group flex min-h-16 items-center justify-between rounded-lg border border-border/60 bg-background/30 p-3 motion-safe:transition-colors duration-150 hover:bg-muted/60"
            >
              <span className="flex items-center gap-3">
                <CalendarDot
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-sm font-semibold">
                    {t('nav.schedule', 'Kelasi darslar')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {data.operations.next_lessons.length} ta rejalashtirilgan
                  </span>
                </span>
              </span>
              <CaretRight
                className="h-4 w-4 text-muted-foreground motion-safe:transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link
              to="/attendance"
              className="group flex min-h-16 items-center justify-between rounded-lg border border-border/60 bg-background/30 p-3 motion-safe:transition-colors duration-150 hover:bg-muted/60"
            >
              <span className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-warning" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold">
                    {t('nav.attendance', 'Davomat tekshiruvi')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {data.operations.incomplete_attendance_lessons.length} ta
                    dars kutilmoqda
                  </span>
                </span>
              </span>
              <CaretRight
                className="h-4 w-4 text-muted-foreground motion-safe:transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {Object.entries(data.operations.attendance_status).map(
              ([status, count]) => (
                <span
                  key={status}
                  className="rounded-full border border-border px-2.5 py-1"
                >
                  <span className="font-semibold text-foreground tabular-nums">
                    {count}
                  </span>{' '}
                  {status}
                </span>
              ),
            )}
            {attendanceTotal === 0 && (
              <span>
                {t('dashboard.v2.attendance_no_data', 'Davomat maʼlumoti yo‘q')}
              </span>
            )}
          </div>
        </DashboardCard>
      </section>

      <section
        className="grid grid-cols-1 gap-4"
        aria-label={t(
          'dashboard.v2.financial_block.title',
          'Moliyaviy ko‘rsatkichlar',
        )}
      >
        <DashboardCard
          title={t(
            'dashboard.v2.financial_block.title',
            'Moliyaviy ko‘rsatkichlar',
          )}
          description={t(
            'dashboard.v2.financial_block.subtitle',
            'Qarzdorlik yoshi, ARPU va kurs turi bo‘yicha daromad.',
          )}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={t('dashboard.v2.financial_block.bucket_0_30', '0–30 kun')}
              value={formatMoney(kpis.debt_aging.bucket_0_30)}
              meta={t(
                'dashboard.v2.financial_block.debt_aging_meta',
                'Qarzdorlik yoshi',
              )}
              icon={Clock}
              tone="info"
            />
            <KpiCard
              label={t(
                'dashboard.v2.financial_block.bucket_31_60',
                '31–60 kun',
              )}
              value={formatMoney(kpis.debt_aging.bucket_31_60)}
              meta={t(
                'dashboard.v2.financial_block.debt_aging_meta',
                'Qarzdorlik yoshi',
              )}
              icon={Clock}
              tone="info"
            />
            <KpiCard
              label={t(
                'dashboard.v2.financial_block.bucket_61_90',
                '61–90 kun',
              )}
              value={formatMoney(kpis.debt_aging.bucket_61_90)}
              meta={t(
                'dashboard.v2.financial_block.debt_aging_meta',
                'Qarzdorlik yoshi',
              )}
              icon={Clock}
              tone="info"
            />
            <KpiCard
              label={t(
                'dashboard.v2.financial_block.bucket_90_plus',
                '90+ kun',
              )}
              value={formatMoney(kpis.debt_aging.bucket_90_plus)}
              meta={t(
                'dashboard.v2.financial_block.debt_aging_meta_urgent',
                'Diqqat talab qiladi',
              )}
              icon={Warning}
              tone="warning"
              onClick={() =>
                navigate(
                  withContext('/students', {
                    status: 'active',
                    has_debt: 'true',
                  }),
                )
              }
            />
            <KpiCard
              label={t('dashboard.v2.financial_block.arpu', 'ARPU')}
              value={formatMoney(kpis.arpu)}
              meta={t(
                'dashboard.v2.financial_block.arpu_meta',
                'Faol talabaga o‘rtacha',
              )}
              icon={UsersThree}
              tone="primary"
            />
            <KpiCard
              label={t(
                'dashboard.v2.financial_block.cash_collection',
                'Naqd yig‘ish darajasi',
              )}
              value={`${kpis.cash_collection_rate}%`}
              meta={t(
                'dashboard.v2.financial_block.cash_collection_meta',
                'Faol talabalar bo‘yicha',
              )}
              icon={PiggyBank}
              tone={kpis.cash_collection_rate >= 80 ? 'success' : 'warning'}
            />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(['tezkor', 'avto_maktab'] as const).map((courseType) => {
              const entry = kpis.revenue_by_course_type[courseType];
              return (
                <div
                  key={courseType}
                  className="rounded-lg border border-border/60 bg-background/30 p-3"
                >
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {t(`students.course.${courseType}`, courseType)}
                  </p>
                  <p className="mt-2 text-lg font-bold tabular-nums">
                    {formatMoney(entry.revenue)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.per_lesson !== null
                      ? t(
                          'dashboard.v2.financial_block.per_lesson',
                          '{{value}} / dars',
                          { value: formatMoney(Math.round(entry.per_lesson)) },
                        )
                      : t(
                          'dashboard.v2.financial_block.no_lessons',
                          'Dars yo‘q',
                        )}
                  </p>
                </div>
              );
            })}
          </div>
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <DashboardCard
          title={t('dashboard.v2.academic_block.title', "O'quv jarayoni")}
          description={t(
            'dashboard.v2.academic_block.subtitle',
            'Davomat, sinov natijalari va bitirish statistikasi.',
          )}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={t(
                'dashboard.v2.academic_block.attendance_rate',
                'Davomat',
              )}
              value={
                kpis.attendance_rate != null ? `${kpis.attendance_rate}%` : '—'
              }
              meta={t(
                'dashboard.v2.academic_block.attendance_meta',
                'Tanlangan davr bo‘yicha',
              )}
              icon={CheckCircle}
              tone={
                kpis.attendance_rate == null
                  ? 'info'
                  : kpis.attendance_rate >= 90
                    ? 'success'
                    : kpis.attendance_rate >= 75
                      ? 'warning'
                      : 'info'
              }
            />
            <KpiCard
              label={t(
                'dashboard.v2.academic_block.dropout_rate',
                'Tashlab ketish darajasi',
              )}
              value={`${kpis.dropout_rate ?? 0}%`}
              meta={t(
                'dashboard.v2.academic_block.suspended_meta',
                '+{{count}} e’tibor talab qiladi',
                { count: kpis.students.suspended ?? 0 },
              )}
              icon={UserMinus}
              tone={(kpis.dropout_rate ?? 0) > 15 ? 'warning' : 'info'}
            />
            <KpiCard
              label={t(
                'dashboard.v2.academic_block.exam_pass_rate',
                'Birinchi urinishda topshirish',
              )}
              value={
                kpis.exam_first_attempt_pass_rate != null
                  ? `${kpis.exam_first_attempt_pass_rate}%`
                  : '—'
              }
              meta={t(
                'dashboard.v2.academic_block.exam_pass_meta',
                'Birinchi imtihon urinishi',
              )}
              icon={ClipboardText}
              tone="info"
            />
            <KpiCard
              label={t(
                'dashboard.v2.academic_block.completion_time',
                "O'rtacha bitirish muddati",
              )}
              value={
                kpis.completion_time_median_days != null
                  ? t(
                      'dashboard.v2.academic_block.days_value',
                      '{{count}} kun',
                      {
                        count: kpis.completion_time_median_days,
                      },
                    )
                  : '—'
              }
              meta={t(
                'dashboard.v2.academic_block.completion_meta',
                'Bitirgan talabalar mediana',
              )}
              icon={Hourglass}
              tone="primary"
            />
          </div>
          {kpis.enrollment_funnel && (
            <div className="mt-5 space-y-3 rounded-lg border border-border/60 bg-background/30 p-4">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t(
                  'dashboard.v2.academic_block.funnel_title',
                  'Ro‘yxatdan bitirishgacha',
                )}
              </p>
              {(
                [
                  [
                    'contract',
                    t(
                      'dashboard.v2.academic_block.funnel_contract',
                      'Shartnoma',
                    ),
                    kpis.enrollment_funnel.contract,
                    'bg-primary',
                  ],
                  [
                    'active',
                    t('dashboard.v2.academic_block.funnel_active', 'Faol'),
                    kpis.enrollment_funnel.active,
                    'bg-info',
                  ],
                  [
                    'graduated',
                    t(
                      'dashboard.v2.academic_block.funnel_graduated',
                      'Bitirgan',
                    ),
                    kpis.enrollment_funnel.graduated,
                    'bg-success',
                  ],
                ] as const
              ).map(([key, label, value, barClassName]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold tabular-nums">{value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full', barClassName)}
                      style={{
                        width: `${
                          kpis.enrollment_funnel!.contract
                            ? (value / kpis.enrollment_funnel!.contract) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">
                {t(
                  'dashboard.v2.academic_block.funnel_dropped',
                  'Tashlab ketgan / to‘xtatilgan',
                )}
                :{' '}
                <span className="font-semibold text-foreground tabular-nums">
                  {kpis.enrollment_funnel.dropped_or_suspended}
                </span>
              </p>
            </div>
          )}
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <DashboardCard
          title={t('dashboard.v2.staff_block.title', 'Xodim samaradorligi')}
          description={t(
            'dashboard.v2.staff_block.subtitle',
            'O‘qituvchi yuklamasi, davomat va operator samaradorligi.',
          )}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              label={t(
                'dashboard.v2.staff_block.teacher_load_label',
                'O‘qituvchi yuklamasi',
              )}
              value={
                kpis.teacher_load?.avg_lessons_per_active_teacher != null
                  ? `${kpis.teacher_load.avg_lessons_per_active_teacher} ${t('dashboard.v2.staff_block.teacher_load_unit', 'dars/o‘qituvchi')}`
                  : t('dashboard.v2.staff_block.no_data', 'Maʼlumot yo‘q')
              }
              meta={t(
                'dashboard.v2.staff_block.teacher_load_meta',
                '{{teachers}} faol o‘qituvchi · {{students}} student/o‘qituvchi',
                {
                  teachers: kpis.teacher_load?.active_teacher_count ?? 0,
                  students: kpis.teacher_load?.avg_students_per_teacher ?? 0,
                },
              )}
              icon={GraduationCap}
              tone="primary"
              onClick={() => navigate(withContext('/teachers'))}
            />
            <KpiCard
              label={t(
                'dashboard.v2.staff_block.on_time_attendance_label',
                'Vaqtida davomat belgilash',
              )}
              value={
                kpis.on_time_attendance_marking_rate != null
                  ? `${kpis.on_time_attendance_marking_rate}%`
                  : t('dashboard.v2.staff_block.no_data', 'Maʼlumot yo‘q')
              }
              meta={t(
                'dashboard.v2.staff_block.on_time_attendance_meta',
                'Dars kuni ichida belgilangan davomatlar ulushi',
              )}
              icon={Clock}
              tone={
                (kpis.on_time_attendance_marking_rate ?? 0) >= 80
                  ? 'success'
                  : 'warning'
              }
              onClick={() => navigate(withContext('/attendance'))}
            />
            <KpiCard
              label={t(
                'dashboard.v2.staff_block.operator_follow_through_label',
                'Operator to‘lov davomiyligi',
              )}
              value={
                kpis.avg_operator_payment_follow_through_rate != null
                  ? `${kpis.avg_operator_payment_follow_through_rate}%`
                  : t('dashboard.v2.staff_block.no_data', 'Maʼlumot yo‘q')
              }
              meta={t(
                'dashboard.v2.staff_block.operator_follow_through_meta',
                'Ro‘yxatdan o‘tgan studentlardan to‘lov qilganlar ulushi',
              )}
              icon={UserCheck}
              tone="info"
              onClick={() => navigate(withContext('/operators'))}
            />
          </div>
        </DashboardCard>
      </section>

      <p className="text-right text-xs text-muted-foreground">
        {t('dashboard.v2.updated', 'Yangilandi')} ·{' '}
        {formatFreshnessTimestamp(data.freshness.generated_at)}
      </p>
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="space-y-5">
    <div className="space-y-2">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
    <Skeleton className="h-16 w-full" />
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-80 rounded-[var(--radius)]" />
        <Skeleton className="h-40 w-2/3 rounded-[var(--radius)]" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.6fr]">
        <Skeleton className="h-40 w-2/3 rounded-[var(--radius)]" />
        <Skeleton className="h-80 rounded-[var(--radius)]" />
      </div>
    </div>
  </div>
);

const ErrorState = ({ onRetry }: { onRetry: () => void }) => {
  const { t } = useTranslation();
  return (
    <Card className="border-destructive/30 bg-destructive/5 p-8 text-center">
      <Warning className="mx-auto h-8 w-8 text-destructive" />
      <h1 className="mt-3 text-lg font-semibold">
        {t(
          'dashboard.v2.error_title',
          "Dashboard maʼlumotlarini yuklab bo'lmadi",
        )}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(
          'dashboard.v2.error_subtitle',
          "Ulanishni tekshiring va qayta urinib ko'ring.",
        )}
      </p>
      <Button className="mt-4" onClick={onRetry}>
        {t('common.retry', 'Qayta urinish')}
      </Button>
    </Card>
  );
};

export default CompanyRevenueDashboard;
