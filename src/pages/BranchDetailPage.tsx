import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Phone } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useBranch } from '@/services/branchService';
import { tashkentToday } from '@/lib/tashkentDate';
import { toLocalDateStr } from '@/services/studentService';

const money = (n?: number) =>
  `${Number(n ?? 0)
    .toLocaleString('ru-RU')
    .replace(/,/g, ' ')} so'm`;

// Same gradient AreaChart used by DashboardPage's monthly revenue chart —
// mirrored here (not extracted) since the two consume slightly different
// query shapes and this is the only other caller.
const AXIS_PROPS = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const BranchDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: branch, isLoading, isError } = useBranch(id);
  const today = toLocalDateStr(tashkentToday());

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !branch) {
    return (
      <div className="space-y-6">
        <BackButton
          onClick={() => navigate('/branches')}
          label={t('branches.title')}
        />
        <EmptyState title={t('common.not_found')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton
        onClick={() => navigate('/branches')}
        label={t('branches.title')}
      />

      {/* Header */}
      <div className="glass-card space-y-2 p-5">
        <h1
          className="font-heading text-2xl font-bold text-balance"
          style={{ viewTransitionName: `branch-${branch.id}` }}
        >
          {branch.name}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {branch.location}
          </span>
          {branch.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {branch.phone}
            </span>
          )}
          <span>
            {t('branches.manager')}: {branch.manager_name || t('common.na')}
          </span>
        </div>
      </div>

      {/* Analytics */}
      <dl className="glass-card grid grid-cols-1 gap-x-8 gap-y-3 p-5 text-sm sm:grid-cols-2">
        <Field
          label={t('branches.students')}
          value={String(branch.active_students)}
          to={`/students?branch_id=${branch.id}`}
        />
        <Field
          label={t('branches.detail.revenue')}
          value={money(branch.revenue)}
        />
        <Field label={t('branches.detail.debt')} value={money(branch.debt)} />
        <Field
          label={t('branches.detail.today_payment')}
          value={money(branch.today_payment)}
          to={`/payments?branch_id=${branch.id}&date_from=${today}&date_to=${today}`}
        />
      </dl>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="mb-3 text-sm font-semibold">
            {t('branches.detail.revenue_trend')}
          </h2>
          <RevenueTrendChart data={branch.monthly_revenue} />
        </div>
        <div className="glass-card p-5">
          <h2 className="mb-3 text-sm font-semibold">
            {t('branches.detail.top_debtors')}
          </h2>
          <TopDebtorsList
            debtors={branch.top_debtors}
            viewAllLink={`/students?branch_id=${branch.id}&has_debt=true`}
          />
        </div>
      </div>
    </div>
  );
};

const RevenueTrendChart = ({
  data,
}: {
  data?: { month: string; amount: number }[];
}) => {
  const { t } = useTranslation();
  if (!data || data.length === 0) {
    return <EmptyState title={t('common.no_data')} />;
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id="branch-revenue-fill"
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
          <XAxis dataKey="month" {...AXIS_PROPS} />
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
            formatter={(value: number) => [money(value), '']}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#branch-revenue-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const TopDebtorsList = ({
  debtors,
  viewAllLink,
}: {
  debtors?: { id: string; name: string; debt: number }[];
  viewAllLink: string;
}) => {
  const { t } = useTranslation();
  if (!debtors || debtors.length === 0) {
    return <EmptyState title={t('common.no_data')} />;
  }
  return (
    <div className="space-y-2">
      {debtors.map((debtor) => (
        <Link
          key={debtor.id}
          to={`/students/${debtor.id}`}
          className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate">{debtor.name}</span>
          <span className="shrink-0 font-semibold text-destructive">
            {money(debtor.debt)}
          </span>
        </Link>
      ))}
      <Link
        to={viewAllLink}
        className="block pt-1 text-xs font-semibold text-primary hover:underline"
      >
        {t('branches.detail.view_all_debtors')}
      </Link>
    </div>
  );
};

const BackButton = ({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
  >
    <ArrowLeft className="h-4 w-4" /> {label}
  </button>
);

const Field = ({
  label,
  value,
  to,
}: {
  label: string;
  value: string;
  to?: string;
}) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd>
      {to ? (
        <Link
          to={to}
          className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {value}
        </Link>
      ) : (
        value
      )}
    </dd>
  </div>
);

export default BranchDetailPage;
