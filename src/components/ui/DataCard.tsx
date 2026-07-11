import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DataCardField {
  label: string;
  value: ReactNode;
}

interface DataCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  fields?: DataCardField[];
  actions?: ReactNode;
  onClick?: (e: React.SyntheticEvent<HTMLDivElement>) => void;
  className?: string;
  accent?: string;
}

/**
 * Mobile-friendly row card. Pair with desktop table:
 *   <div className="hidden md:block">...table...</div>
 *   <div className="md:hidden grid gap-3">{items.map(...)}</div>
 */
export const DataCard = ({
  title,
  subtitle,
  fields,
  actions,
  onClick,
  className,
  accent,
}: DataCardProps) => {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      {...(interactive
        ? {
            role: 'button',
            tabIndex: 0,
            onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter') onClick?.(e);
              if (e.key === ' ') {
                e.preventDefault();
                onClick?.(e);
              }
            },
          }
        : {})}
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition-colors',
        accent && 'pl-5',
        interactive &&
          'cursor-pointer hover:border-primary/40 hover:bg-accent/30',
        className,
      )}
    >
      {accent && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: accent }}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-sm font-semibold text-foreground text-balance">
            {title}
          </div>
          {subtitle && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      {fields && fields.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          {fields.map((f, i) => (
            <div key={i} className="min-w-0">
              <dt className="truncate text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {f.label}
              </dt>
              <dd className="mt-0.5 truncate text-foreground tabular-nums">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
