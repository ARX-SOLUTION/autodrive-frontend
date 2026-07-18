import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useCan, useIsCrossTenant } from '@/hooks/useCan';
import {
  useDashboardAnalytics,
  useTeacherAnalytics,
} from '@/services/dashboardService';
import { usePaymentSnapshot, usePayments } from '@/services/paymentService';
import { useAuditLogs } from '@/services/auditService';
import { useBranches } from '@/services/branchService';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Warning,
  ArrowDownRight,
  ArrowUpRight,
  SealCheck,
  Car,
  GraduationCap,
  UsersThree,
  Wallet,
  PencilSimple,
  Plus,
  Trash,
  Pulse,
} from '@phosphor-icons/react';
import { CourseType } from '@/types/student';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/ui/Sparkline';
import CompanyRevenueDashboard from '@/pages/dashboard/CompanyRevenueDashboard';

// ---------- Formatting helpers ----------

const formatNumber = (n: number) =>
  new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));

const formatCompact = (n: number) => {
  if (!n) return '0';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
};

const computeDelta = (current: number, previous: number) => {
  if (!previous) return null;
  const pct = ((current - previous) / previous) * 100;
  return { pct: Math.round(pct * 10) / 10, down: pct < 0 };
};

const greetingKey = () => {
  const h = new Date().getHours();
  if (h < 12) return 'dashboard.greeting_morning';
  if (h < 18) return 'dashboard.greeting_afternoon';
  return 'dashboard.greeting_evening';
};

const initialsFor = (name?: string | null) => {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .padEnd(2, '·');
};

const branchHues = [
  35, // amber (primary)
  199, // cyan (info)
  145, // green (success)
  25, // orange
  220, // steel blue
];

// ---------- Shared chart styles ----------

const CHART_STYLE = {
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

const AXIS_PROPS = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 11,
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  tickLine: false,
  axisLine: false,
};

// ---------- KPI card ----------

interface KpiCardProps {
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

const KpiCard = ({
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
      className={cn(
        'relative overflow-hidden p-5',
        'transition-all duration-150 hover:shadow-md hover:-translate-y-0.5',
        'card-enter',
      )}
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
          'font-bold leading-tight tracking-tight text-foreground tabular-nums font-mono',
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

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  staggerDelayMs?: number;
  children: React.ReactNode;
}

const SectionCard = ({
  title,
  subtitle,
  action,
  className,
  staggerDelayMs = 0,
  children,
}: SectionCardProps) => (
  <Card
    className={cn(
      'p-5 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5',
      'card-enter',
      className,
    )}
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

// ---------- Main dashboard ----------

const LegacyMainDashboard = () => {
  const { t, i18n } = useTranslation();
  const isCrossTenant = useIsCrossTenant();
  const user = useAuthStore((s) => s.user);
  const [courseType, setCourseType] = useState<CourseType | undefined>();
  const [branchId, setBranchId] = useState<string | undefined>(
    isCrossTenant ? undefined : user?.branch_id || undefined,
  );

  const { data: analytics, isLoading } = useDashboardAnalytics(
    branchId,
    courseType,
  );
  const { data: snapshot } = usePaymentSnapshot(branchId);
  const { data: recentPayments } = usePayments(branchId, courseType);
  const { data: auditData } = useAuditLogs({ page: 1, limit: 6 });
  const { data: branches } = useBranches();

  const canViewAllBranches = useCan('viewAllBranches');
  const canViewAudit = useCan('viewAudit');

  // ---- Derived values ----
  const revenueSeries = useMemo(
    () =>
      (analytics?.monthly_revenue ?? []).map((m) => ({
        label: m.month,
        value: Number(m.amount) || 0,
      })),
    [analytics?.monthly_revenue],
  );
  const revenueTotal = useMemo(
    () => revenueSeries.reduce((s, d) => s + d.value, 0),
    [revenueSeries],
  );
  const revenueSparkValues = revenueSeries.slice(-12).map((d) => d.value);
  const studentsSpark = useMemo(() => {
    if (!analytics?.monthly_enrollment) return [];
    let acc = analytics.total_students;
    return analytics.monthly_enrollment
      .slice()
      .reverse()
      .map((m) => {
        const v = acc;
        acc -= (m.tezkor || 0) + (m.avto_maktab || 0);
        return v;
      })
      .reverse();
  }, [analytics?.monthly_enrollment, analytics?.total_students]);

  const studentsDelta = analytics
    ? computeDelta(analytics.new_this_month, analytics.new_last_month)
    : null;

  // Course mix (tezkor / avto_maktab)
  const totalCourseMix =
    (analytics?.active_tezkor ?? 0) + (analytics?.active_avto ?? 0);
  const donutData = useMemo(() => {
    const tezkor = analytics?.active_tezkor ?? 0;
    const avto = analytics?.active_avto ?? 0;
    return [
      {
        name: t('dashboard.chart_school'),
        value: avto,
        pct: totalCourseMix
          ? Math.round((avto / totalCourseMix) * 1000) / 10
          : 0,
        fill: 'hsl(var(--primary))',
      },
      {
        name: t('dashboard.chart_fast'),
        value: tezkor,
        pct: totalCourseMix
          ? Math.round((tezkor / totalCourseMix) * 1000) / 10
          : 0,
        fill: 'hsl(var(--warning))',
      },
    ];
  }, [analytics?.active_tezkor, analytics?.active_avto, totalCourseMix, t]);

  // Top branches: sort by revenue desc
  const topBranches = useMemo(
    () =>
      (analytics?.branch_stats ?? [])
        .slice()
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
    [analytics?.branch_stats],
  );

  // Recent payments: limit 5, newest first
  const recentPaymentList = useMemo(
    () =>
      (recentPayments ?? [])
        .slice()
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 5),
    [recentPayments],
  );

  // Pulse log entries
  const activityList = useMemo(
    () => (auditData?.data ?? []).slice(0, 6),
    [auditData?.data],
  );

  // ---- Skeleton ----
  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Skeleton className="h-80 rounded-lg lg:col-span-3" />
          <Skeleton className="h-80 rounded-lg lg:col-span-2" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  const currency = t('dashboard.currency_suffix');

  // KPI 1: Today revenue
  const todayRevenue = snapshot?.today_income ?? 0;
  // Estimate "yesterday" via this_month avg (no daily series exposed)
  const todayDelta =
    snapshot && analytics.this_month_revenue && analytics.last_month_revenue
      ? computeDelta(analytics.this_month_revenue, analytics.last_month_revenue)
      : null;

  // KPI 4: Graduates as fallback (lessons schedule not exposed)
  const graduates = analytics.result_stats.topshirdi;
  const passDenominator =
    analytics.result_stats.topshirdi + analytics.result_stats.yiqildi;
  const passRate =
    passDenominator > 0
      ? Math.round((analytics.result_stats.topshirdi / passDenominator) * 100)
      : 0;

  // Date formatting helpers tied to current locale
  const dateLocale =
    i18n.language === 'ru'
      ? 'ru-RU'
      : i18n.language === 'uz'
        ? 'uz-UZ'
        : 'en-US';

  const formatRelative = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const m = Math.round(diffMs / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.round(h / 24);
    return `${days}d`;
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-balance">
            {t(greetingKey())}
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('dashboard.hero_subtitle')} —{' '}
            {new Date().toLocaleDateString(dateLocale, {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            <span
              className="h-1.5 w-1.5 rounded-full bg-success motion-safe:animate-pulse"
              aria-hidden
            />
            {t('dashboard.live_label')}
          </span>
          <Tabs
            value={courseType || 'all'}
            onValueChange={(v) =>
              setCourseType(v === 'all' ? undefined : (v as CourseType))
            }
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="all">{t('dashboard.all')}</TabsTrigger>
              <TabsTrigger value="tezkor">
                {t('dashboard.chart_fast')}
              </TabsTrigger>
              <TabsTrigger value="avto_maktab">
                {t('dashboard.chart_school')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {canViewAllBranches && (
            <Select
              value={branchId || 'all'}
              onValueChange={(v) => setBranchId(v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-44 bg-card">
                <SelectValue placeholder={t('common.all_branches')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all_branches')}</SelectItem>
                {(branches || []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ===== Hero KPI row ===== */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr]"
        aria-label={t('dashboard.title')}
      >
        <KpiCard
          label={t('dashboard.hero_today_revenue')}
          value={formatNumber(todayRevenue)}
          unit={currency}
          icon={<Wallet className="h-4 w-4" />}
          tone="primary"
          delta={todayDelta}
          metaLeft={
            <span className="text-xs text-muted-foreground">
              {t('dashboard.hero_vs_yesterday')}
            </span>
          }
          spark={revenueSparkValues}
          animationDelayMs={40}
          lead
        />
        <KpiCard
          label={t('dashboard.hero_active_students')}
          value={formatNumber(analytics.total_students)}
          icon={<UsersThree className="h-4 w-4" />}
          tone="info"
          delta={studentsDelta}
          metaLeft={
            <span className="text-xs text-muted-foreground">
              +{analytics.new_this_month} {t('dashboard.hero_new_this_month')}
            </span>
          }
          spark={studentsSpark}
          animationDelayMs={80}
        />
        <KpiCard
          label={t('dashboard.hero_outstanding_debt')}
          value={formatNumber(
            snapshot?.current_total_debt ?? analytics.total_debt,
          )}
          unit={currency}
          icon={<Warning className="h-4 w-4" />}
          tone="warning"
          metaLeft={
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
              <Warning className="h-3 w-3" />
              {t('dashboard.hero_students_with_debt', {
                count:
                  snapshot?.students_with_debt ?? analytics.payment_status.debt,
              })}
            </span>
          }
          metaRight={
            analytics.avg_debt > 0
              ? t('dashboard.hero_avg_each', {
                  value: formatNumber(analytics.avg_debt),
                })
              : undefined
          }
          animationDelayMs={120}
        />
        <KpiCard
          label={t('dashboard.hero_graduates')}
          value={formatNumber(graduates)}
          icon={<SealCheck className="h-4 w-4" />}
          tone="success"
          metaLeft={
            passDenominator > 0 ? (
              <span className="text-xs text-muted-foreground">
                {t('dashboard.hero_pass_rate', { pct: passRate })}
              </span>
            ) : undefined
          }
          animationDelayMs={160}
        />
      </section>

      {/* ===== Revenue trend + course mix ===== */}
      <section className="cv-auto grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          staggerDelayMs={200}
          title={t('dashboard.revenue_trend_title')}
          subtitle={t('dashboard.revenue_trend_sub', {
            total: formatNumber(revenueTotal),
            currency,
          })}
          action={
            <div className="hidden items-center gap-3 sm:flex">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-sm bg-primary"
                  aria-hidden
                />
                {t('dashboard.revenue_this_period')}
              </span>
            </div>
          }
        >
          {revenueSeries.length === 0 ? (
            <div className="grid h-64 place-items-center text-sm text-muted-foreground">
              {t('dashboard.no_data')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={revenueSeries}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis dataKey="label" {...AXIS_PROPS} />
                <YAxis
                  {...AXIS_PROPS}
                  tickFormatter={formatCompact}
                  width={48}
                />
                <Tooltip
                  {...CHART_STYLE}
                  formatter={(v: number) => [
                    `${formatNumber(v)} ${currency}`,
                    t('dashboard.revenue_label'),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.2}
                  fill="url(#revArea)"
                  name={t('dashboard.revenue_label')}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          staggerDelayMs={240}
          title={t('dashboard.course_mix_title')}
          subtitle={t('dashboard.course_mix_sub')}
        >
          {totalCourseMix === 0 ? (
            <div className="grid h-64 place-items-center text-sm text-muted-foreground">
              {t('dashboard.no_data')}
            </div>
          ) : (
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <div className="relative mx-auto aspect-square w-full max-w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      innerRadius="62%"
                      outerRadius="90%"
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {donutData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...CHART_STYLE}
                      formatter={(v: number, _n, props) => [
                        `${formatNumber(v)} (${(props as { payload?: { pct?: number } }).payload?.pct ?? 0}%)`,
                        '',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="text-2xl font-bold tracking-tight tabular-nums">
                      {formatNumber(totalCourseMix)}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {t('dashboard.donut_students')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {donutData.map((d) => (
                  <div
                    key={d.name}
                    className="border-b border-border pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <span
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: d.fill }}
                          aria-hidden
                        />
                        {d.name}
                      </span>
                      <span className="text-sm font-bold tabular-nums">
                        {d.pct}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                      <span>
                        {formatNumber(d.value)} {t('dashboard.donut_students')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </section>

      {/* ===== Three-column: top branches, recent payments, activity ===== */}
      <section className="cv-auto grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top branches */}
        <SectionCard
          staggerDelayMs={280}
          title={t('dashboard.top_branches_title')}
          subtitle={t('dashboard.top_branches_sub')}
        >
          {topBranches.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t('dashboard.top_branches_empty')}
            </div>
          ) : canViewAllBranches ? (
            <ResponsiveContainer
              width="100%"
              height={Math.max(180, topBranches.length * 40)}
            >
              <BarChart
                data={topBranches}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                barSize={16}
              >
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  {...AXIS_PROPS}
                  tickFormatter={formatCompact}
                />
                <YAxis
                  type="category"
                  dataKey="branch"
                  {...AXIS_PROPS}
                  width={90}
                />
                <Tooltip
                  {...CHART_STYLE}
                  formatter={(v: number) => [
                    `${formatNumber(v)} ${currency}`,
                    t('dashboard.top_branches_revenue'),
                  ]}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {topBranches.map((_, i) => (
                    <Cell
                      key={i}
                      fill={`hsl(${branchHues[i % branchHues.length]} 80% 52%)`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ul className="divide-y divide-border">
              {topBranches.map((b, i) => (
                <li
                  key={b.branch}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <span
                      className="grid h-7 w-7 place-items-center rounded-md text-[11px] font-bold text-primary-foreground"
                      style={{
                        background: `linear-gradient(135deg, hsl(${branchHues[i % branchHues.length]} 80% 52%), hsl(${branchHues[(i + 1) % branchHues.length]} 80% 56%))`,
                      }}
                      aria-hidden
                    >
                      {initialsFor(b.branch)}
                    </span>
                    <span className="text-sm font-medium">{b.branch}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatNumber(b.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Recent payments */}
        <SectionCard
          staggerDelayMs={320}
          title={t('dashboard.recent_payments_title')}
          subtitle={t('dashboard.recent_payments_sub')}
        >
          {recentPaymentList.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t('dashboard.recent_payments_empty')}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentPaymentList.map((p, i) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5"
                >
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full text-[11px] font-bold text-primary-foreground"
                    style={{
                      background: `linear-gradient(135deg, hsl(${branchHues[i % branchHues.length]} 80% 52%), hsl(${branchHues[(i + 1) % branchHues.length]} 80% 56%))`,
                    }}
                    aria-hidden
                  >
                    {initialsFor(p.student_name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {p.student_name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.branch_name} ·{' '}
                      {p.course_type === 'tezkor'
                        ? t('dashboard.chart_fast')
                        : t('dashboard.chart_school')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-success tabular-nums">
                      +{formatNumber(p.amount_paid)}
                    </div>
                    <div className="text-[11px] font-medium text-muted-foreground tabular-nums">
                      {formatRelative(p.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Pulse log — viewAudit (owner/dev); backend gates /audit-logs */}
        {canViewAudit && (
          <SectionCard
            staggerDelayMs={360}
            title={t('dashboard.activity_title')}
            subtitle={t('dashboard.activity_sub')}
          >
            {activityList.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {t('dashboard.activity_empty')}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activityList.map((a) => {
                  const tone =
                    a.action === 'CREATE'
                      ? 'success'
                      : a.action === 'UPDATE'
                        ? 'info'
                        : 'destructive';
                  const Icon =
                    a.action === 'CREATE'
                      ? Plus
                      : a.action === 'UPDATE'
                        ? PencilSimple
                        : a.action === 'DELETE'
                          ? Trash
                          : Pulse;
                  const verb =
                    a.action === 'CREATE'
                      ? t('dashboard.activity_action_create')
                      : a.action === 'UPDATE'
                        ? t('dashboard.activity_action_update')
                        : t('dashboard.activity_action_delete');
                  const toneClass: Record<string, string> = {
                    success: 'bg-success/10 text-success',
                    info: 'bg-info/10 text-info',
                    destructive: 'bg-destructive/10 text-destructive',
                  };
                  return (
                    <li
                      key={a.id}
                      className="grid grid-cols-[auto_1fr_auto] items-start gap-3 py-3"
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-8 w-8 place-items-center rounded-md',
                          toneClass[tone],
                        )}
                        aria-hidden
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 text-sm leading-snug">
                        <span className="font-semibold">
                          {a.user_name ?? 'System'}
                        </span>
                        {a.user_role && (
                          <span className="text-muted-foreground">
                            {' '}
                            ({t(`roles.${a.user_role}`, a.user_role)})
                          </span>
                        )}{' '}
                        <span className="text-muted-foreground">{verb}</span>{' '}
                        <span className="font-medium">{a.entity}</span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatRelative(a.created_at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        )}
      </section>

      {/* ===== Owner-only: branch comparison ===== */}
      {canViewAllBranches && analytics.branch_stats.length > 1 && (
        <SectionCard
          staggerDelayMs={400}
          className="cv-auto"
          title={t('dashboard.branch_comparison')}
          subtitle={t('dashboard.top_branches_sub')}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.branch_stats} barSize={22}>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis dataKey="branch" {...AXIS_PROPS} />
              <YAxis
                yAxisId="students"
                orientation="left"
                {...AXIS_PROPS}
                allowDecimals={false}
                width={30}
              />
              <YAxis
                yAxisId="money"
                orientation="right"
                {...AXIS_PROPS}
                tickFormatter={formatCompact}
                width={48}
              />
              <Tooltip
                {...CHART_STYLE}
                formatter={(v: number, name: string) =>
                  name === t('dashboard.students_section')
                    ? [formatNumber(v), name]
                    : [`${formatNumber(v)} ${currency}`, name]
                }
              />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  color: 'hsl(var(--muted-foreground))',
                }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                yAxisId="students"
                dataKey="students"
                fill="hsl(var(--info))"
                radius={[4, 4, 0, 0]}
                name={t('dashboard.students_section')}
              />
              <Bar
                yAxisId="money"
                dataKey="revenue"
                fill="hsl(var(--success))"
                radius={[4, 4, 0, 0]}
                name={t('dashboard.revenue_label')}
              />
              <Bar
                yAxisId="money"
                dataKey="debt"
                fill="hsl(var(--destructive))"
                radius={[4, 4, 0, 0]}
                name={t('dashboard.cards.total_debt')}
              />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}
    </div>
  );
};

// ---------- Teacher dashboard (unchanged but updated to new card pattern) ----------

const RESULT_COLORS = [
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
];

const TeacherDashboard = () => {
  const { t } = useTranslation();
  const { data: analytics, isLoading } = useTeacherAnalytics();

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  const resultData = [
    {
      name: t('dashboard.result_studying'),
      value: analytics.result_stats.oqimoqda,
    },
    {
      name: t('dashboard.result_passed'),
      value: analytics.result_stats.topshirdi,
    },
    {
      name: t('dashboard.result_failed'),
      value: analytics.result_stats.yiqildi,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-balance">
          {t('dashboard.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('dashboard.subtitle')}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr]">
        <KpiCard
          label={t('dashboard.cards.active_groups', 'Active Groups')}
          value={formatNumber(analytics.active_groups)}
          icon={<UsersThree className="h-4 w-4" />}
          tone="info"
          lead
        />
        <KpiCard
          label={t('dashboard.cards.total_students', 'Total Students')}
          value={formatNumber(analytics.total_students)}
          icon={<GraduationCap className="h-4 w-4" />}
          tone="primary"
        />
        <KpiCard
          label={t('dashboard.result_passed')}
          value={formatNumber(analytics.result_stats.topshirdi)}
          icon={<SealCheck className="h-4 w-4" />}
          tone="success"
        />
        <KpiCard
          label={t('dashboard.result_studying')}
          value={formatNumber(analytics.result_stats.oqimoqda)}
          icon={<Car className="h-4 w-4" />}
          tone="warning"
        />
      </section>

      <SectionCard title={t('dashboard.result_title')} className="cv-auto">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={resultData} layout="vertical" barSize={24}>
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="hsl(var(--border))"
              horizontal={false}
            />
            <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
            <YAxis type="category" dataKey="name" {...AXIS_PROPS} width={90} />
            <Tooltip
              {...CHART_STYLE}
              formatter={(v: number) => [formatNumber(v), '']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {resultData.map((_, i) => (
                <Cell key={i} fill={RESULT_COLORS[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  );
};

const DashboardPage = () => {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'teacher') return <TeacherDashboard />;
  if (user?.company_features?.company_dashboard_v2 === false) {
    return <LegacyMainDashboard />;
  }
  return <CompanyRevenueDashboard />;
};

export default DashboardPage;
