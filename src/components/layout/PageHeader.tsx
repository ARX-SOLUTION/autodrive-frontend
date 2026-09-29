import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
  className,
}: PageHeaderProps) {
  const showEyebrow = Boolean(eyebrow) && eyebrow !== title;

  return (
    <header
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        className,
      )}
    >
      <div className="min-w-0">
        {showEyebrow ? (
          <div className="mb-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {icon}
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-heading text-2xl font-bold leading-tight tracking-[-0.01em] text-balance">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
