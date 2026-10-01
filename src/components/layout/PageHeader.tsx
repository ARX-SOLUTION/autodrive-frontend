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
        'flex flex-wrap items-start justify-between gap-4 border-b border-hair pb-4',
        className,
      )}
    >
      <div className="min-w-0 flex-[1_1_16rem]">
        {showEyebrow ? (
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {icon}
            {eyebrow}
          </div>
        ) : null}
        <h1 className="break-words font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-balance sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 max-w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end [&>div]:max-w-full [&>div]:flex-wrap [&>button]:h-auto [&>button]:min-h-10 [&>button]:max-w-full [&>button]:whitespace-normal [&>a]:h-auto [&>a]:min-h-10 [&>a]:max-w-full [&>a]:whitespace-normal">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
