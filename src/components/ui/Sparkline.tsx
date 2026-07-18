import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

// exec-dash 3-dashboard: moved out of DashboardPage.tsx (same API) so
// CompanyRevenueDashboard can reuse it inside a KPI card.

interface SparklineProps {
  data: number[];
  tone: 'primary' | 'info' | 'warning' | 'success';
}
const TONE_HSL: Record<SparklineProps['tone'], string> = {
  primary: 'var(--primary)',
  info: 'var(--info)',
  warning: 'var(--warning)',
  success: 'var(--success)',
};

export const Sparkline = ({ data, tone }: SparklineProps) => {
  const points = useMemo(() => {
    if (!data.length) return [];
    return data.map((v, i) => ({ i, v }));
  }, [data]);
  const gradId = `spark-${tone}`;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 opacity-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={`hsl(${TONE_HSL[tone]})`}
                stopOpacity={0.32}
              />
              <stop
                offset="100%"
                stopColor={`hsl(${TONE_HSL[tone]})`}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={`hsl(${TONE_HSL[tone]})`}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
