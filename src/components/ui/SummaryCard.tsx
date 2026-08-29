import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendDown?: boolean;
  className?: string;
  isLoading?: boolean;
}

export const SummaryCard = ({
  title,
  value,
  icon,
  trend,
  trendDown,
  className,
  isLoading,
}: SummaryCardProps) => (
  <div className={cn('glass-card p-5', className)}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        {isLoading ? (
          <Skeleton className="mt-1.5 h-8 w-24" />
        ) : (
          <p className="mt-1.5 text-2xl font-heading font-bold text-foreground tabular-nums">
            {value}
          </p>
        )}
        {trend && (
          <p
            className={cn(
              'mt-1 text-xs',
              trendDown ? 'text-destructive' : 'text-success',
            )}
          >
            {trend}
          </p>
        )}
      </div>
      <div className="rounded-lg bg-primary/10 p-2.5 text-primary">{icon}</div>
    </div>
  </div>
);
