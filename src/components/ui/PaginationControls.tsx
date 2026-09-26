import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PageSizeSelect } from '@/components/ui/PageSizeSelect';
import { formatListPageRange } from '@/lib/listQuery';
import { cn } from '@/lib/utils';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  /** Total rows across every page. Enables the `1–10 / 500` range. */
  totalItems?: number;
  previousLabel?: string;
  nextLabel?: string;
  ariaLabel?: string;
  /** Disables pager buttons while a page request is in flight. */
  disabled?: boolean;
  className?: string;
}

const pageButtonClass = 'h-9 min-w-9 shrink-0 px-2';
const stepButtonClass =
  'h-9 shrink-0 gap-1 border-border bg-secondary px-2 sm:px-3';

const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  previousLabel,
  nextLabel,
  ariaLabel,
  disabled = false,
  className,
}: Props) => {
  const { t } = useTranslation();
  const showPager = totalPages > 1;
  const showPageSize = pageSize !== undefined && onPageSizeChange !== undefined;
  const range =
    totalItems !== undefined && pageSize !== undefined
      ? formatListPageRange(currentPage, pageSize, totalItems)
      : null;
  const showMeta = range !== null || showPageSize;
  if (!showPager && !showMeta) return null;

  const previousText = previousLabel ?? t('common.previous');
  const nextText = nextLabel ?? t('common.next');

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'flex min-w-0 gap-3 pt-4',
        showMeta
          ? 'flex-col sm:flex-row sm:items-center sm:justify-between'
          : 'items-center justify-end',
        className,
      )}
    >
      {showMeta ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {range ? (
            <p className="text-sm tabular-nums text-muted-foreground">
              {range}
            </p>
          ) : null}
          {showPageSize ? (
            <PageSizeSelect
              value={pageSize}
              onChange={onPageSizeChange}
              disabled={disabled}
            />
          ) : null}
        </div>
      ) : null}
      {showPager ? (
        <div className="flex max-w-full items-center justify-end gap-1 overflow-x-auto">
          <Button
            variant="outline"
            size="sm"
            aria-label={previousText}
            onClick={() => onPageChange(currentPage - 1)}
            disabled={disabled || currentPage <= 1}
            className={stepButtonClass}
          >
            <CaretLeft aria-hidden />
            <span className="hidden sm:inline">{previousText}</span>
          </Button>
          {getPageNumbers().map((page, i) =>
            page === '...' ? (
              <span
                key={`ellipsis-${i}`}
                aria-hidden
                className="px-1 text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                aria-current={page === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(page)}
                disabled={disabled}
                className={
                  page === currentPage
                    ? pageButtonClass
                    : cn(pageButtonClass, 'border-border bg-secondary')
                }
              >
                {page}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="sm"
            aria-label={nextText}
            onClick={() => onPageChange(currentPage + 1)}
            disabled={disabled || currentPage >= totalPages}
            className={stepButtonClass}
          >
            <span className="hidden sm:inline">{nextText}</span>
            <CaretRight aria-hidden />
          </Button>
        </div>
      ) : null}
    </nav>
  );
};

export default PaginationControls;
