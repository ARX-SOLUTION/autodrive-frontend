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
    <div className="flex items-start justify-between gap-3">
      <p className="min-w-0 break-words text-xs font-medium leading-relaxed text-muted-foreground">
        {title}
      </p>
      {/* ponytail: icon is non-text, so WCAG 1.4.11 wants 3:1, not 4.5:1.
          --primary on its own /10 tint was 2.02:1; --warning-strong keeps the
          brand amber and reaches 5.99:1. */}
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-warning-strong [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </div>
    </div>
    {isLoading ? (
      <Skeleton className="mt-3 h-7 w-24" />
    ) : (
      <p className="mt-3 break-words font-heading text-lg font-bold leading-tight text-foreground tabular-nums sm:text-xl">
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
