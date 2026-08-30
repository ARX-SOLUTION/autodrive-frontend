import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CompanyOverview } from '@/services/dashboardService';
import { cn } from '@/lib/utils';
import { formatMoney, groupDigits } from '@/lib/money';

const formatDate = (value: string | Date) => format(new Date(value), 'dd.MM');
const formatShortDate = (value: string | Date) =>
  format(new Date(value), 'dd.MM.yyyy');

const AXIS_PROPS = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 10,
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  tickLine: false,
  axisLine: false,
};

const RevenueTrendChart = ({
  data,
}: {
  data: CompanyOverview['revenue_trend'];
}) => {
  const { t } = useTranslation();
  const [visibleMetrics, setVisibleMetrics] = useState({
    amount: true,
    payment_count: true,
  });
  const chartData = data.map((item) => ({
    ...item,
    label: formatDate(item.period_start),
    tooltipLabel: formatShortDate(item.period_start),
  }));
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const paymentCount = data.reduce((sum, item) => sum + item.payment_count, 0);
  const averagePayment = paymentCount ? total / paymentCount : 0;
  const peak = data.reduce<(typeof data)[number] | null>(
    (current, item) =>
      !current || item.amount > current.amount ? item : current,
    null,
  );
  const toggleMetric = (metric: keyof typeof visibleMetrics) => {
    const otherMetric = metric === 'amount' ? 'payment_count' : 'amount';
    setVisibleMetrics((current) =>
      current[metric] && !current[otherMetric]
        ? current
        : { ...current, [metric]: !current[metric] },
    );
  };
  const revenueLabel = t('dashboard.v2.period_revenue', 'Davr tushumi');
  const paymentCountLabel = t('payments.payment_count', "To'lovlar soni");

  return (
    <div
      data-testid="revenue-payment-chart"
      aria-label={t(
        'dashboard.v2.revenue_chart_summary',
        `Revenue trend: ${formatMoney(total)} total, ${paymentCount} payments`,
        { total: formatMoney(total), count: paymentCount },
      )}
    >
      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        <button
          type="button"
          data-testid="chart-metric-revenue"
          aria-pressed={visibleMetrics.amount}
          onClick={() => toggleMetric('amount')}
          className={cn(
            'min-h-16 cursor-pointer border-b-2 bg-card px-3 py-2.5 text-left transition-[background-color,border-color,color,opacity] duration-150 ease-out active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            visibleMetrics.amount
              ? 'border-info bg-info/[8%]'
              : 'border-transparent opacity-65 hover:bg-muted/70 hover:opacity-100',
          )}
        >
          <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span
              className="h-0.5 w-4 rounded-full bg-info"
              aria-hidden="true"
            />
            {revenueLabel}
            <span
              className={cn(
                'ml-auto h-2 w-2 rounded-full transition-[background-color,box-shadow]',
                visibleMetrics.amount
                  ? 'bg-info shadow-[0_0_0_3px_hsl(var(--info)/0.14)]'
                  : 'bg-muted-foreground/25',
              )}
              aria-hidden="true"
            />
          </span>
          <span className="mt-1 block font-heading text-lg font-bold tabular-nums">
            {groupDigits(String(Math.round(total)))}
          </span>
        </button>
        <button
          type="button"
          data-testid="chart-metric-payments"
          aria-pressed={visibleMetrics.payment_count}
          onClick={() => toggleMetric('payment_count')}
          className={cn(
            'min-h-16 cursor-pointer border-b-2 bg-card px-3 py-2.5 text-left transition-[background-color,border-color,color,opacity] duration-150 ease-out active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            visibleMetrics.payment_count
              ? 'border-primary bg-primary/[8%]'
              : 'border-transparent opacity-65 hover:bg-muted/70 hover:opacity-100',
          )}
        >
          <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span
              className="h-2.5 w-2.5 rounded-[2px] bg-primary"
              aria-hidden="true"
            />
            {paymentCountLabel}
            <span
              className={cn(
                'ml-auto h-2 w-2 rounded-full transition-[background-color,box-shadow]',
                visibleMetrics.payment_count
                  ? 'bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]'
                  : 'bg-muted-foreground/25',
              )}
              aria-hidden="true"
            />
          </span>
          <span className="mt-1 block font-heading text-lg font-bold tabular-nums">
            {groupDigits(String(paymentCount))}
          </span>
        </button>
        <div className="min-h-16 bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            {t('dashboard.v2.average_payment', 'O‘rtacha to‘lov')}
          </p>
          <p className="mt-1 font-heading text-lg font-bold tabular-nums">
            {groupDigits(String(Math.round(averagePayment)))}
          </p>
        </div>
        <div className="min-h-16 bg-card px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            {t('dashboard.v2.trend_peak', 'Eng yuqori kun')}
          </p>
          <p className="mt-1 font-heading text-lg font-bold tabular-nums">
            {peak ? formatDate(peak.period_start) : '—'}
          </p>
        </div>
      </div>

      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 0, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="revenue-area-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="hsl(var(--info))"
                  stopOpacity={0.24}
                />
                <stop
                  offset="70%"
                  stopColor="hsl(var(--info))"
                  stopOpacity={0.05}
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--info))"
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
              minTickGap={24}
            />
            {visibleMetrics.amount && (
              <YAxis
                yAxisId="amount"
                {...AXIS_PROPS}
                tickCount={4}
                tickFormatter={(value) =>
                  `${Math.round(Number(value) / 1_000_000)}M`
                }
              />
            )}
            {visibleMetrics.payment_count && (
              <YAxis
                yAxisId="payment_count"
                {...AXIS_PROPS}
                orientation="right"
                width={28}
                tickCount={4}
                allowDecimals={false}
              />
            )}
            <Tooltip
              cursor={{
                stroke: 'hsl(var(--border))',
                strokeDasharray: '3 3',
              }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as
                  (typeof chartData)[number] | undefined;
                if (!active || !point) return null;
                const pointAverage = point.payment_count
                  ? point.amount / point.payment_count
                  : 0;
                return (
                  <div className="min-w-52 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg">
                    <p className="border-b border-border pb-2 text-xs font-semibold">
                      {point.tooltipLabel}
                    </p>
                    <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-xs">
                      <dt className="text-muted-foreground">{revenueLabel}</dt>
                      <dd className="font-semibold tabular-nums">
                        {formatMoney(point.amount)}
                      </dd>
                      <dt className="text-muted-foreground">
                        {paymentCountLabel}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {point.payment_count}
                      </dd>
                      <dt className="text-muted-foreground">
                        {t('dashboard.v2.average_payment', 'O‘rtacha to‘lov')}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {formatMoney(pointAverage)}
                      </dd>
                    </dl>
                  </div>
                );
              }}
            />
            {visibleMetrics.amount && (
              <Area
                yAxisId="amount"
                type="monotone"
                dataKey="amount"
                fill="url(#revenue-area-fill)"
                stroke="none"
                isAnimationActive={false}
              />
            )}
            {visibleMetrics.payment_count && (
              <Bar
                yAxisId="payment_count"
                dataKey="payment_count"
                name={paymentCountLabel}
                fill="hsl(var(--primary))"
                fillOpacity={0.72}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
            )}
            {visibleMetrics.amount && (
              <Line
                yAxisId="amount"
                type="monotone"
                dataKey="amount"
                name={revenueLabel}
                stroke="hsl(var(--info))"
                strokeWidth={2.4}
                dot={
                  chartData.length === 1
                    ? {
                        r: 3,
                        fill: 'hsl(var(--info))',
                        strokeWidth: 0,
                      }
                    : false
                }
                activeDot={{
                  r: 4,
                  fill: 'hsl(var(--info))',
                  stroke: 'hsl(var(--card))',
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 open:bg-muted/35">
        <summary className="cursor-pointer rounded-sm text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
    </div>
  );
};

export default RevenueTrendChart;
