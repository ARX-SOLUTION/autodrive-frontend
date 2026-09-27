import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PageSizeSelect } from '@/components/ui/PageSizeSelect';
import { CaretLeft, CaretRight, DotsThree } from '@phosphor-icons/react';

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  /** Enables the "11–20 of 137" position read-out next to the pager. */
  totalItems?: number;
}

const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
}: Props) => {
  const { t } = useTranslation();
  const showPager = totalPages > 1;
  const showPageSize = pageSize !== undefined && onPageSizeChange !== undefined;
  const showRange =
    totalItems !== undefined &&
    totalItems > 0 &&
    pageSize !== undefined &&
    pageSize > 0;
  if (!showPager && !showPageSize && !showRange) return null;

  const firstItem = showRange
    ? Math.min((currentPage - 1) * pageSize + 1, totalItems)
    : 0;
  const lastItem = showRange ? Math.min(currentPage * pageSize, totalItems) : 0;

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

  const goTo = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  return (
    <nav
      aria-label={t('common.pagination')}
      className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      {showPageSize ? (
        <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
      ) : null}
      {showPager ? (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label={t('common.previous')}
            className="gap-1 bg-secondary border-border"
          >
            <CaretLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.previous')}</span>
          </Button>
          {getPageNumbers().map((page, i) =>
            page === '...' ? (
              <span
                key={`e${i}`}
                className="flex h-9 w-9 items-center justify-center text-muted-foreground"
              >
                <DotsThree aria-hidden className="h-4 w-4" />
                <span className="sr-only">{t('common.more_pages')}</span>
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => goTo(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                className={`min-w-9 tabular-nums ${
                  page === currentPage ? '' : 'bg-secondary border-border'
                }`}
              >
                {page}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label={t('common.next')}
            className="gap-1 bg-secondary border-border"
          >
            <span className="hidden sm:inline">{t('common.next')}</span>
            <CaretRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      {showRange ? (
        <span className="text-sm tabular-nums text-muted-foreground">
          {t('common.showing_range', {
            from: firstItem,
            to: lastItem,
            total: totalItems,
          })}
        </span>
      ) : null}
    </nav>
  );
};

export default PaginationControls;
