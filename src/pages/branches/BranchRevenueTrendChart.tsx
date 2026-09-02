import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/money';

const AXIS_PROPS = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

export interface BranchRevenueTrendChartProps {
  data?: { month: string; amount: number }[];
}

export const BranchRevenueTrendChart = ({
  data,
}: BranchRevenueTrendChartProps) => {
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
            formatter={(value: number) => [formatMoney(value), '']}
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

export default BranchRevenueTrendChart;
