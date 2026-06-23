import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendDown?: boolean;
  className?: string;
}

export const SummaryCard = ({ title, value, icon, trend, trendDown, className }: SummaryCardProps) => (
  <div className={cn('glass-card p-5 animate-slide-in', className)}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1.5 text-2xl font-heading font-bold text-foreground tabular-nums">{value}</p>
        {trend && (
          <p className={cn('mt-1 text-xs', trendDown ? 'text-destructive' : 'text-success')}>
            {trend}
          </p>
        )}
      </div>
      <div className="rounded-lg bg-primary/10 p-2.5 text-primary">{icon}</div>
    </div>
  </div>
);
