import type { ReactNode } from 'react';
import { CaretDown, CaretUpDown, CaretUp } from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type DataTableAlign = 'left' | 'center' | 'right';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  align?: DataTableAlign;
  sortable?: boolean;
  /** Field name passed to onToggleSort/compared against sortField. Defaults to `key`. */
  sortKey?: string;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  /** Row click handler — also wired to Enter/Space for keyboard access. Omit for non-clickable rows. */
  onRowClick?: (row: T, el: HTMLElement) => void;
  isLoading?: boolean;
  skeletonRowCount?: number;
  isError?: boolean;
  /** Rendered inside a full-width row when isError is true. */
  errorState?: ReactNode;
  /** Rendered inside a full-width row when there are no rows (and not loading/error). Omit to render nothing (caller shows its own empty state elsewhere). */
  emptyState?: ReactNode;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  onToggleSort?: (field: string) => void;
  /** Extra classes for the outer wrapper (e.g. "glass-card overflow-hidden"). */
  className?: string;
  rowHoverClassName?: string;
  /** Extra classes per row (autodrive-cg9: muting a soft-deleted row). */
  rowClassName?: (row: T) => string | undefined;
}

const ALIGN_CLASS: Record<DataTableAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const SORT_BUTTON_ALIGN_CLASS: Record<DataTableAlign, string> = {
  left: '',
  center: 'mx-auto',
  right: 'ml-auto',
};

const SortIcon = ({
  active,
  dir,
}: {
  active: boolean;
  dir: 'asc' | 'desc';
}) => {
  if (!active)
    return <CaretUpDown className="h-3 w-3 text-muted-foreground/50" />;
  return dir === 'asc' ? (
    <CaretUp className="h-3 w-3" />
  ) : (
    <CaretDown className="h-3 w-3" />
  );
};

/**
 * Generic column-config-driven desktop table. Carries the boilerplate that
 * was duplicated across the Students/Groups/Payments/Audit tables: loading
 * skeleton rows, error/empty states, striped rows, and keyboard-accessible
 * row click (role=button + tabIndex + Enter/Space).
 *
 * Sort STATE stays with the caller — this only renders the sort-toggle
 * affordance per column and calls back via onToggleSort.
 */
export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  onRowClick,
  isLoading,
  skeletonRowCount = 5,
  isError,
  errorState,
  emptyState,
  sortField,
  sortDir = 'asc',
  onToggleSort,
  className,
  rowHoverClassName = 'hover:bg-muted/20 transition-colors',
  rowClassName,
}: DataTableProps<T>) {
  const colSpan = columns.length;

  return (
    <div className={cn('hidden md:block', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((col) => {
                const align = col.align ?? 'left';
                const sortKey = col.sortKey ?? col.key;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 font-medium text-muted-foreground',
                      ALIGN_CLASS[align],
                      col.headerClassName,
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => onToggleSort?.(sortKey)}
                        className={cn(
                          'flex items-center gap-1 hover:text-foreground transition-colors',
                          SORT_BUTTON_ALIGN_CLASS[align],
                        )}
                      >
                        {col.header}
                        <SortIcon
                          active={sortField === sortKey}
                          dir={sortDir}
                        />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(skeletonRowCount)].map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={colSpan} className="p-4">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={colSpan} className="p-0">
                  {errorState}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              emptyState && (
                <tr>
                  <td colSpan={colSpan} className="p-0">
                    {emptyState}
                  </td>
                </tr>
              )
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    'table-row-striped border-b border-border/50',
                    onRowClick && cn('cursor-pointer', rowHoverClassName),
                    rowClassName?.(row),
                  )}
                  onClick={
                    onRowClick
                      ? (e) => {
                          if (window.getSelection()?.toString()) return;
                          onRowClick(row, e.currentTarget);
                        }
                      : undefined
                  }
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row, e.currentTarget);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => {
                    const align = col.align ?? 'left';
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3',
                          ALIGN_CLASS[align],
                          col.cellClassName,
                        )}
                      >
                        {col.render(row, idx)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
