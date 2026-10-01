import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Funnel } from '@phosphor-icons/react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount?: number;
  children: ReactNode;
  onClearAll?: () => void;
  trigger?: ReactNode;
  title?: string;
  description?: string;
  applyLabel?: string;
  side?: 'bottom' | 'right';
  className?: string;
}

export const MobileFilterSheet = ({
  open,
  onOpenChange,
  activeCount = 0,
  children,
  onClearAll,
  trigger,
  title,
  description,
  applyLabel,
  side = 'bottom',
  className,
}: MobileFilterSheetProps) => {
  const { t } = useTranslation();

  const sheetTitle = title ?? t('filters.title', { defaultValue: 'Filters' });
  const sheetDescription =
    description ??
    t('filters.description', {
      defaultValue: 'Adjust filters to refine the list',
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <SheetTrigger asChild>{trigger}</SheetTrigger>
      ) : (
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'relative inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-md border-border bg-secondary text-sm md:hidden',
              className,
            )}
            aria-label={t('filters.open_filters', {
              defaultValue: 'Open filters',
            })}
          >
            <Funnel className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{sheetTitle}</span>
            {activeCount > 0 ? (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            ) : null}
          </Button>
        </SheetTrigger>
      )}

      <SheetContent
        side={side}
        closeLabel={t('common.close')}
        className={cn(
          'flex flex-col gap-4 border-border bg-background p-6 [&>button]:flex [&>button]:min-h-11 [&>button]:min-w-11 [&>button]:items-center [&>button]:justify-center',
          side === 'bottom' && 'max-h-[85vh] rounded-t-xl',
          side === 'right' && 'w-full sm:max-w-md',
        )}
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading text-lg font-semibold text-foreground">
            {sheetTitle}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {sheetDescription}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-4">{children}</div>

        <SheetFooter className="flex flex-row items-center justify-end gap-2 pt-2 border-t border-border">
          {onClearAll && activeCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClearAll();
                onOpenChange(false);
              }}
              className="min-h-[44px] flex-1 text-sm font-medium"
            >
              {t('common.clear_all')}
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px] flex-1 text-sm font-medium"
          >
            {applyLabel ?? t('filters.apply', { defaultValue: 'Apply' })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFilterSheet;
