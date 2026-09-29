import { useTranslation } from 'react-i18next';
import { X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActiveFilterChipItem } from '@/hooks/useFilterBarState';

export interface ActiveFilterChipsProps {
  chips: ActiveFilterChipItem[];
  onClearAll?: () => void;
  className?: string;
  clearLabel?: string;
}

export const ActiveFilterChips = ({
  chips,
  onClearAll,
  className,
  clearLabel,
}: ActiveFilterChipsProps) => {
  const { t } = useTranslation();

  if (!chips || chips.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-1.5 pt-1', className)}
      data-testid="active-filter-chips"
      role="region"
      aria-label={t('filters.active_filters', {
        defaultValue: 'Active filters',
      })}
    >
      <span className="text-xs font-medium text-muted-foreground mr-1 select-none">
        {t('filters.active_filters', { defaultValue: 'Active filters' })}:
      </span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/80 px-2.5 py-0.5 text-xs text-secondary-foreground transition-colors"
          data-testid={`active-filter-chip-${chip.id}`}
        >
          {chip.label ? (
            <span className="font-medium text-muted-foreground">
              {chip.label}:
            </span>
          ) : null}
          <span className="font-medium text-foreground">{chip.value}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={t('filters.clear_filter', {
              name: chip.label || chip.value,
              defaultValue: `Remove ${chip.label || chip.value} filter`,
            })}
            className="relative ml-0.5 inline-flex items-center justify-center rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring before:absolute before:-inset-2 before:content-[''] md:before:hidden touch-manipulation"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}

      {onClearAll && chips.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="min-h-[44px] md:min-h-0 md:h-6 px-2 text-xs text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="mr-1 h-3 w-3" aria-hidden="true" />
          {clearLabel ?? t('common.clear_all')}
        </Button>
      ) : null}
    </div>
  );
};

export default ActiveFilterChips;
