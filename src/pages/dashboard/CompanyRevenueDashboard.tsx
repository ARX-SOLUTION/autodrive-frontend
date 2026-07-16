import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  GraduationCap,
  Hourglass,
  LayoutDashboard,
  PiggyBank,
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { formatMoney } from '@/lib/money';

const UZ_TIMEZONE = 'Asia/Tashkent';

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

// en-CA formatter always renders YYYY-MM-DD — cache it once like
// moneyFormatter instead of constructing it on every call.
const uzDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: UZ_TIMEZONE,
});

const todayInUz = () => uzDateFormatter.format(new Date());

const addDays = (dateString: string, amount: number) => {
  const date = new Date(`${dateString}T00:00:00+05:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return uzDateFormatter.format(date);
};

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
    | CourseType
    | undefined,
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
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <Card
    className={cn(
      'border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur-xl',
      'motion-safe:transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md',
      className,
    )}
  >
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-balance">
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
}: {
  label: string;
  value: string;
  meta: string;
  icon: typeof WalletCards;
  tone: 'primary' | 'warning' | 'success' | 'info';
  delta?: number | null;
  onClick?: () => void;
}) => {
  const toneClasses = {
    primary: 'bg-primary/12 text-primary',
    warning: 'bg-warning/12 text-warning',
    success: 'bg-success/12 text-success',
    info: 'bg-info/12 text-info',
  };
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-border/70 bg-card/80 p-5 shadow-sm',
        onClick &&
          'cursor-pointer motion-safe:transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
      <p className="mt-4 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      <div className="mt-3 flex min-h-5 items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{meta}</span>
        {delta !== undefined && delta !== null && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums',
              delta < 0
                ? 'bg-destructive/10 text-destructive'
                : 'bg-success/10 text-success',
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
        )}
      </div>
    </Card>
  );
};

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
  const preset = (value: string) => {
    if (value === 'today') return onChange('range', `${today}|${today}`);
    if (value === '7d')
      return onChange('range', `${addDays(today, -6)}|${today}`);
    if (value === '30d')
      return onChange('range', `${addDays(today, -29)}|${today}`);
    return onChange('range', `${startOfMonthInUz()}|${today}`);
  };
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="flex min-w-[150px] flex-1 flex-col gap-1">
        <label
          htmlFor="dashboard-range"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {t('dashboard.v2.period', 'Davr')}
        </label>
        <select
          id="dashboard-range"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={`${from}|${to}`}
          onChange={(event) => preset(event.target.value)}
        >
          <option value={`${startOfMonthInUz()}|${today}`}>
            {t('dashboard.v2.this_month', 'Bu oy')}
          </option>
          <option value={`${today}|${today}`}>
            {t('dashboard.v2.today', 'Bugun')}
          </option>
          <option value={`${addDays(today, -6)}|${today}`}>7 kun</option>
          <option value={`${addDays(today, -29)}|${today}`}>30 kun</option>
        </select>
      </div>
      <div className="flex min-w-[135px] flex-1 flex-col gap-1">
        <label
          htmlFor="dashboard-from"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {t('dashboard.v2.from', 'Dan')}
        </label>
        <input
          id="dashboard-from"
          type="date"
          value={from}
          max={today}
          onChange={(event) => onChange('from', event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex min-w-[135px] flex-1 flex-col gap-1">
        <label
          htmlFor="dashboard-to"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {t('dashboard.v2.to', 'Gacha')}
        </label>
        <input
          id="dashboard-to"
          type="date"
          value={to}
          max={today}
          onChange={(event) => onChange('to', event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {canViewAllBranches && (
        <div className="flex min-w-[160px] flex-1 flex-col gap-1">
          <label
            htmlFor="dashboard-branch"
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t('dashboard.v2.branch', 'Filial')}
          </label>
          <select
            id="dashboard-branch"
            value={params.get('branch_id') || 'all'}
            onChange={(event) =>
              onChange(
                'branch_id',
                event.target.value === 'all' ? undefined : event.target.value,
              )
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        </div>
      )}
      <div className="flex min-w-[140px] flex-1 flex-col gap-1">
        <label
          htmlFor="dashboard-course"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {t('dashboard.v2.course', 'Kurs')}
        </label>
        <select
          id="dashboard-course"
          value={params.get('course_type') || 'all'}
          onChange={(event) =>
            onChange(
              'course_type',
              event.target.value === 'all' ? undefined : event.target.value,
            )
          }
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">{t('dashboard.all', 'Barchasi')}</option>
          <option value="tezkor">{t('dashboard.chart_fast', 'Tezkor')}</option>
          <option value="avto_maktab">
            {t('dashboard.chart_school', 'Avto maktab')}
          </option>
        </select>
      </div>
      <div className="flex min-w-[120px] flex-1 flex-col gap-1">
        <label
          htmlFor="dashboard-granularity"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {t('dashboard.v2.granularity', 'Granulyarlik')}
        </label>
        <select
          id="dashboard-granularity"
          value={params.get('granularity') === 'week' ? 'week' : 'day'}
          onChange={(event) => onChange('granularity', event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="day">{t('dashboard.v2.daily', 'Kunlik')}</option>
          <option value="week">{t('dashboard.v2.weekly', 'Haftalik')}</option>
        </select>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isFetching}
        aria-label={t('dashboard.v2.refresh', 'Yangilash')}
      >
        <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
      </Button>
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
          <div className="h-64 w-full">
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
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  {...AXIS_PROPS}
                  interval="preserveStartEnd"
                />
                <YAxis
                  {...AXIS_PROPS}
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
                  strokeWidth={2}
                  fill="url(#company-revenue-fill)"
                  isAnimationActive={false}
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
  fontSize: 11,
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

  if (isLoading || !data) return <DashboardSkeleton />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

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

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-primary">
            <LayoutDashboard className="h-4 w-4" />{' '}
            {t('dashboard.v2.title', 'Revenue control')}
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-balance">
            {t('dashboard.greeting_morning', 'Xayrli kun')}
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
            {t(
              'dashboard.v2.subtitle',
              'Tushum, qarzdorlik va filiallar bo‘yicha bugungi boshqaruv ko‘rinishi.',
            )}
          </p>
        </div>
        <Badge
          variant="outline"
          className="gap-1.5 border-success/30 bg-success/10 text-success"
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-success"
            aria-hidden="true"
          />{' '}
          {t('dashboard.live_label', 'Jonli')}
        </Badge>
      </header>

      <FilterBar
        params={params}
        canViewAllBranches={canViewAllBranches}
        branches={branches}
        onChange={updateParam}
        onRefresh={() => void refetch()}
        isFetching={isFetching}
      />

      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label={t('dashboard.v2.kpi_section_label', 'Revenue control KPIs')}
      >
        <KpiCard
          label={t('dashboard.v2.today_revenue', 'Bugungi tushum')}
          value={formatMoney(kpis.revenue.today)}
          meta={t('dashboard.v2.today_meta', 'Asia/Tashkent bo‘yicha')}
          icon={WalletCards}
          tone="primary"
          onClick={() =>
            navigate(
              withContext('/payments', {
                date_from: todayInUz(),
                date_to: todayInUz(),
              }),
            )
          }
        />
        <KpiCard
          label={t('dashboard.v2.period_revenue', 'Tanlangan davr tushumi')}
          value={formatMoney(kpis.revenue.period)}
          meta={`${comparisonRange}: ${formatMoney(kpis.revenue.previous_period)}`}
          icon={CircleDollarSign}
          tone="info"
          delta={kpis.revenue.delta_percent}
          onClick={() => navigate(withContext('/payments'))}
        />
        <KpiCard
          label={t('dashboard.v2.outstanding_debt', 'Jami qarzdorlik')}
          value={formatMoney(kpis.debt.current_outstanding)}
          meta={t('dashboard.v2.debtors', '{{count}} ta qarzdor student', {
            count: kpis.debt.students_with_debt,
          })}
          icon={AlertTriangle}
          tone="warning"
          onClick={() =>
            navigate(
              withContext('/students', { status: 'active', has_debt: 'true' }),
            )
          }
        />
        <KpiCard
          label={t('dashboard.v2.coverage', 'Payment coverage')}
          value={`${kpis.collection.coverage_rate}%`}
          meta={t(
            'dashboard.v2.coverage_meta',
            '{{paid}} to‘liq · {{partial}} qisman',
            { paid: kpis.collection.paid, partial: kpis.collection.partial },
          )}
          icon={CheckCircle2}
          tone="success"
          onClick={() =>
            navigate(withContext('/students', { status: 'active' }))
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <DashboardCard
          title={t('dashboard.v2.revenue_trend', 'Tushum trendi')}
          description={`${formatDate(data.filters.from, { year: 'numeric' })} — ${formatDate(kpis.revenue.period_to_inclusive || data.filters.to, { year: 'numeric' })}`}
        >
          <RevenueChart data={data.revenue_trend} onReset={resetFilters} />
        </DashboardCard>
        <DashboardCard
          title={t('dashboard.v2.recovery', 'Qarzdorlik recovery queue')}
          description={t(
            'dashboard.v2.recovery_subtitle',
            'Eng katta qarzlar birinchi ko‘rsatiladi.',
          )}
          action={
            <Link
              to={withContext('/payments')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t('dashboard.v2.open_payments', 'To‘lovlar')}{' '}
              <ExternalLink
                className="ml-1 inline h-3 w-3"
                aria-hidden="true"
              />
            </Link>
          }
        >
          <div className="space-y-2">
            {data.recovery_queue.length ? (
              data.recovery_queue.map((student) => (
                <button
                  key={student.student_id}
                  type="button"
                  onClick={() => navigate(`/students/${student.student_id}`)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-left motion-safe:transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {student.student_name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {student.branch_name} · {student.course_type}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums text-warning">
                      {formatMoney(student.debt)}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {student.last_payment_at
                        ? formatShortDate(student.last_payment_at)
                        : t('dashboard.v2.last_payment_none', 'Payment yo‘q')}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <EmptyData />
            )}
          </div>
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
              <ChevronRight
                className="ml-1 inline h-3 w-3"
                aria-hidden="true"
              />
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
                    className="w-full rounded-lg border border-border/60 bg-background/30 p-3 text-left motion-safe:transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{branch.name}</span>
                      <ChevronRight
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
                        <td className="py-3 text-right tabular-nums">
                          {branch.collection_rate}%
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
            <div className="space-y-4">
              <div
                className="flex h-3 overflow-hidden rounded-full bg-muted"
                aria-label={t(
                  'dashboard.v2.coverage_bar_label',
                  '{{rate}}% paid in full',
                  { rate: kpis.collection.coverage_rate },
                )}
              >
                <div
                  className="bg-success"
                  style={{
                    width: `${(kpis.collection.paid / statusTotal) * 100}%`,
                  }}
                />
                <div
                  className="bg-warning"
                  style={{
                    width: `${(kpis.collection.partial / statusTotal) * 100}%`,
                  }}
                />
                <div
                  className="bg-destructive"
                  style={{
                    width: `${(kpis.collection.debt / statusTotal) * 100}%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <StatusItem
                  label={t('dashboard.payment_full', 'To‘liq')}
                  value={kpis.collection.paid}
                  tone="success"
                />
                <StatusItem
                  label={t('dashboard.payment_partial', 'Qisman')}
                  value={kpis.collection.partial}
                  tone="warning"
                />
                <StatusItem
                  label={t('dashboard.payment_none', 'Qarz')}
                  value={kpis.collection.debt}
                  tone="danger"
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
              className="group flex min-h-16 items-center justify-between rounded-lg border border-border/60 bg-background/30 p-3 motion-safe:transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-muted/60"
            >
              <span className="flex items-center gap-3">
                <CalendarClock
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
              <ChevronRight
                className="h-4 w-4 text-muted-foreground motion-safe:transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link
              to="/attendance"
              className="group flex min-h-16 items-center justify-between rounded-lg border border-border/60 bg-background/30 p-3 motion-safe:transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-muted/60"
            >
              <span className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-warning" aria-hidden="true" />
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
              <ChevronRight
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
        <DashboardCard
          title={t('dashboard.v2.quick_actions', 'Tezkor amallar')}
          description={t(
            'dashboard.v2.quick_actions_subtitle',
            'Eng ko‘p ishlatiladigan harakatlar.',
          )}
        >
          <div className="grid grid-cols-2 gap-2">
            <QuickAction
              to="/payments?action=create"
              icon={WalletCards}
              label={t('payments.add_payment', 'Payment qo‘shish')}
            />
            <QuickAction
              to="/students?action=create"
              icon={UserPlus}
              label={t('students.add', 'Student qo‘shish')}
            />
            <QuickAction
              to="/schedule?action=create"
              icon={CalendarClock}
              label={t('attendance.add_lesson', 'Dars yaratish')}
            />
            <QuickAction
              to="/attendance"
              icon={Users}
              label={t('nav.attendance', 'Davomat ochish')}
            />
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
            'Oy-oyga o‘sish, qarzdorlik yoshi va kurs turi bo‘yicha daromad.',
          )}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={t(
                'dashboard.v2.financial_block.mom_growth',
                'Oy-oyga o‘sish',
              )}
              value={formatMoney(kpis.revenue.period)}
              meta={comparisonRange}
              icon={TrendingUp}
              tone="primary"
              delta={kpis.revenue.delta_percent}
            />
            <KpiCard
              label={t('dashboard.v2.financial_block.bucket_0_30', '0–30 kun')}
              value={formatMoney(kpis.debt_aging.bucket_0_30)}
              meta={t(
                'dashboard.v2.financial_block.debt_aging_meta',
                'Qarzdorlik yoshi',
              )}
              icon={Clock3}
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
              icon={Clock3}
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
              icon={Clock3}
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
              icon={AlertTriangle}
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
              icon={Users}
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
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
              icon={CheckCircle2}
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
              icon={ClipboardCheck}
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
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
              icon={Clock3}
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
        {formatDate(data.freshness.generated_at, {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  );
};

const StatusItem = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'danger';
}) => {
  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning'
        ? Clock3
        : AlertTriangle;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        <Icon
          className={cn(
            'h-4 w-4',
            tone === 'success'
              ? 'text-success'
              : tone === 'warning'
                ? 'text-warning'
                : 'text-destructive',
          )}
          aria-hidden="true"
        />
        {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
};

const QuickAction = ({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof UserPlus;
  label: string;
}) => (
  <Button
    asChild
    variant="outline"
    className="h-auto min-h-12 justify-start border-border/70 bg-background/30 px-3 py-3 text-left"
  >
    <Link to={to}>
      <Icon className="text-primary" aria-hidden="true" />
      <span className="text-xs font-semibold">{label}</span>
    </Link>
  </Button>
);

const DashboardSkeleton = () => (
  <div className="space-y-5">
    <div className="space-y-2">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
    <Skeleton className="h-16 w-full" />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-32" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_0.85fr]">
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  </div>
);

const ErrorState = ({ onRetry }: { onRetry: () => void }) => {
  const { t } = useTranslation();
  return (
    <Card className="border-destructive/30 bg-destructive/5 p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
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
