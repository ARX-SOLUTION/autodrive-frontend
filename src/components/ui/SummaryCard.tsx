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
  <div className={cn('glass-card p-4', className)}>
    <div className="flex items-center justify-between gap-2">
      <p className="truncate text-sm text-muted-foreground">{title}</p>
      <div className="shrink-0 text-primary [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </div>
    </div>
    {isLoading ? (
      <Skeleton className="mt-1.5 h-7 w-24" />
    ) : (
      <p className="mt-1.5 whitespace-nowrap font-heading text-xl font-bold text-foreground tabular-nums">
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
);
