import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PageSizeSelect } from '@/components/ui/PageSizeSelect';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: Props) => {
  const { t } = useTranslation();
  const showPager = totalPages > 1;
  const showPageSize = pageSize !== undefined && onPageSizeChange !== undefined;
  if (!showPager && !showPageSize) return null;

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
    <div
      className={
        showPageSize
          ? 'flex flex-wrap items-center justify-between gap-3 pt-4'
          : 'flex items-center justify-center gap-1 pt-4'
      }
    >
      {showPageSize ? (
        <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
      ) : null}
      {showPager ? (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="gap-1 bg-secondary border-border"
          >
            <CaretLeft className="h-4 w-4" />
            {t('common.previous')}
          </Button>
          {getPageNumbers().map((page, i) =>
            page === '...' ? (
              <span key={`e${i}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page)}
                className={
                  page === currentPage ? '' : 'bg-secondary border-border'
                }
              >
                {page}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="gap-1 bg-secondary border-border"
          >
            {t('common.next')}
            <CaretRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default PaginationControls;
