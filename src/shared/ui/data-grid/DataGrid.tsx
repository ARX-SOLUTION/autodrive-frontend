import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import {
  functionalUpdate,
  useTable,
  type ColumnFiltersState,
  type PaginationState,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  dataGridFeatures,
  type DataGridAlign,
  type DataGridColumnDef,
} from './dataGridFeatures';

export interface DataGridPagination extends PaginationState {
  /** Total rows across every server page, not just `data.length`. */
  rowCount: number;
  /** Total known pages for the current query. */
  pageCount: number;
}

export interface DataGridLabels {
  table: string;
  loading: string;
  fetching: string;
  previousPage: string;
  nextPage: string;
}

export interface DataGridMobileRowContext<TData> {
  row: TData;
  rowId: string;
  pageRowIndex: number;
  absoluteRowIndex: number;
}

export interface DataGridVirtualizationOptions {
  /** Fixed scroll viewport for current-page rows. */
  viewportHeight: number;
  /** Fixed row estimate; virtualization never expands beyond supplied rows. */
  estimateRowHeight: number;
  overscan?: number;
}

interface DataGridBaseProps<TData extends RowData> {
  data: ReadonlyArray<TData>;
  // TanStack's heterogeneous column array necessarily erases each cell value.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ReadonlyArray<DataGridColumnDef<TData, any>>;
  getRowId: (row: TData, index: number) => string;
  pagination: DataGridPagination;
  onPaginationChange: (pagination: PaginationState) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: (filters: ColumnFiltersState) => void;
  /** `true` means `data` is already the requested server page. */
  manualPagination: boolean;
  /** `true` means incoming rows are already sorted by the data source. */
  manualSorting: boolean;
  /** `true` means incoming rows are already filtered by the data source. */
  manualFiltering: boolean;
  isInitialLoading: boolean;
  isFetching: boolean;
  labels: DataGridLabels;
  emptyState: ReactNode;
  loadingState?: ReactNode;
  errorState?: ReactNode;
  renderMobileRow?: (context: DataGridMobileRowContext<TData>) => ReactNode;
  virtualizeCurrentPage?: DataGridVirtualizationOptions;
  showPagination?: boolean;
  className?: string;
  tableClassName?: string;
  rowClassName?: (row: TData) => string | undefined;
}

interface DataGridWithRowActivation<TData> {
  onRowActivate: (row: TData, element: HTMLTableRowElement) => void;
  getRowAriaLabel: (row: TData) => string;
}

interface DataGridWithoutRowActivation {
  onRowActivate?: undefined;
  getRowAriaLabel?: never;
}

export type DataGridProps<TData extends RowData> = DataGridBaseProps<TData> &
  (DataGridWithRowActivation<TData> | DataGridWithoutRowActivation);

const ALIGN_CLASS: Record<DataGridAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const getAriaSort = (sorted: false | 'asc' | 'desc') => {
  if (sorted === 'asc') return 'ascending' as const;
  if (sorted === 'desc') return 'descending' as const;
  return 'none' as const;
};

const getSortIndicator = (sorted: false | 'asc' | 'desc') => {
  if (sorted === 'asc') return '↑';
  if (sorted === 'desc') return '↓';
  return '↕';
};

export function DataGrid<TData extends RowData>({
  data,
  columns,
  getRowId,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  manualPagination,
  manualSorting,
  manualFiltering,
  isInitialLoading,
  isFetching,
  labels,
  emptyState,
  loadingState,
  errorState,
  renderMobileRow,
  virtualizeCurrentPage,
  showPagination = true,
  className,
  tableClassName,
  rowClassName,
  onRowActivate,
  getRowAriaLabel,
}: DataGridProps<TData>) {
  const isMobile = useIsMobile();
  const showMobileRows = renderMobileRow !== undefined && isMobile;
  const paginationState: PaginationState = {
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
  };

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data,
    getRowId,
    state: {
      pagination: paginationState,
      sorting,
      columnFilters,
    },
    onPaginationChange: (updater) =>
      onPaginationChange(functionalUpdate(updater, paginationState)),
    onSortingChange: (updater) =>
      onSortingChange(functionalUpdate(updater, sorting)),
    onColumnFiltersChange: (updater) =>
      onColumnFiltersChange(functionalUpdate(updater, columnFilters)),
    manualPagination,
    manualSorting,
    manualFiltering,
    rowCount: pagination.rowCount,
    pageCount: pagination.pageCount,
    autoResetPageIndex: false,
    enableMultiSort: false,
    enableSortingRemoval: false,
    sortDescFirst: false,
    defaultColumn: {
      enableSorting: false,
      enableColumnFilter: false,
    },
  });

  const rows = table.getRowModel().rows;
  const leafColumnCount = table.getAllLeafColumns().length;
  const hasPagination = showPagination && pagination.pageCount > 1;
  const hasErrorState = errorState !== undefined && errorState !== null;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const virtualizationEnabled =
    !showMobileRows &&
    virtualizeCurrentPage !== undefined &&
    !isInitialLoading &&
    !hasErrorState &&
    rows.length > 0;
  // TanStack Virtual intentionally owns mutable measurement callbacks. Keeping
  // it local limits the React Compiler opt-out to this grid component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: virtualizationEnabled ? rows.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => virtualizeCurrentPage?.estimateRowHeight ?? 1,
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan: virtualizeCurrentPage?.overscan ?? 5,
    enabled: virtualizationEnabled,
    initialRect: {
      width: 0,
      height: virtualizeCurrentPage?.viewportHeight ?? 0,
    },
    observeElementRect: (_instance, notifyRect) => {
      notifyRect({
        width: scrollContainerRef.current?.clientWidth ?? 0,
        height: virtualizeCurrentPage?.viewportHeight ?? 0,
      });
    },
    measureElement: (element, entry) => {
      const measuredHeight =
        entry?.borderBoxSize[0]?.blockSize ??
        element.getBoundingClientRect().height;
      return measuredHeight || virtualizeCurrentPage?.estimateRowHeight || 1;
    },
  });

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    row: TData,
  ) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    onRowActivate?.(row, event.currentTarget);
  };

  const renderTableRow = (
    row: (typeof rows)[number],
    virtualItem?: VirtualItem,
  ) => (
    <tr
      key={row.id}
      ref={virtualItem ? rowVirtualizer.measureElement : undefined}
      data-index={virtualItem?.index}
      style={
        virtualItem
          ? {
              display: 'table',
              position: 'absolute',
              tableLayout: 'fixed',
              transform: `translateY(${virtualItem.start}px)`,
              width: '100%',
            }
          : undefined
      }
      className={cn(
        'border-b border-border/50',
        onRowActivate &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        rowClassName?.(row.original),
      )}
      tabIndex={onRowActivate ? 0 : undefined}
      aria-label={getRowAriaLabel?.(row.original)}
      aria-keyshortcuts={onRowActivate ? 'Enter Space' : undefined}
      onClick={
        onRowActivate
          ? (event) => {
              const target = event.target;
              if (
                target instanceof Element &&
                target !== event.currentTarget &&
                target.closest(
                  'a, button, input, select, textarea, [role="button"], [role="link"]',
                )
              ) {
                return;
              }
              if (window.getSelection()?.toString()) return;
              onRowActivate(row.original, event.currentTarget);
            }
          : undefined
      }
      onKeyDown={
        onRowActivate
          ? (event) => handleRowKeyDown(event, row.original)
          : undefined
      }
    >
      {row.getAllCells().map((cell) => {
        const align = cell.column.columnDef.meta?.align ?? 'left';
        return (
          <td
            key={cell.id}
            className={cn(
              'px-4 py-3',
              ALIGN_CLASS[align],
              cell.column.columnDef.meta?.cellClassName,
            )}
          >
            <table.FlexRender cell={cell} />
          </td>
        );
      })}
    </tr>
  );

  return (
    <div
      className={cn('relative', className)}
      aria-busy={isInitialLoading || isFetching}
    >
      {isFetching && !isInitialLoading ? (
        <span className="sr-only" role="status" aria-live="polite">
          {labels.fetching}
        </span>
      ) : null}

      {showMobileRows ? (
        <div className="grid gap-3" data-data-grid-mobile="">
          {isInitialLoading ? (
            <div role="status" aria-live="polite">
              {loadingState ?? labels.loading}
            </div>
          ) : hasErrorState ? (
            errorState
          ) : rows.length === 0 ? (
            emptyState
          ) : (
            rows.map((row, pageRowIndex) => (
              <div key={row.id}>
                {renderMobileRow({
                  row: row.original,
                  rowId: row.id,
                  pageRowIndex,
                  absoluteRowIndex:
                    pagination.pageIndex * pagination.pageSize + pageRowIndex,
                })}
              </div>
            ))
          )}
        </div>
      ) : null}

      {!showMobileRows ? (
        <div
          ref={scrollContainerRef}
          className={
            virtualizeCurrentPage ? 'overflow-auto' : 'overflow-x-auto'
          }
          style={
            virtualizeCurrentPage
              ? { maxHeight: virtualizeCurrentPage.viewportHeight }
              : undefined
          }
        >
          <table
            className={cn(
              'w-full text-sm',
              virtualizeCurrentPage && 'table-fixed',
              tableClassName,
            )}
            aria-label={labels.table}
          >
            <thead
              className={cn(
                virtualizeCurrentPage && 'sticky top-0 z-10 bg-background',
              )}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border">
                  {headerGroup.headers.map((header) => {
                    const align = header.column.columnDef.meta?.align ?? 'left';
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        rowSpan={header.rowSpan || undefined}
                        aria-sort={canSort ? getAriaSort(sorted) : undefined}
                        className={cn(
                          'px-4 py-3 font-medium text-muted-foreground',
                          ALIGN_CLASS[align],
                          header.column.columnDef.meta?.headerClassName,
                        )}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <table.FlexRender header={header} />
                            <span aria-hidden="true">
                              {getSortIndicator(sorted)}
                            </span>
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody
              data-virtualized-row-count={
                virtualizationEnabled ? rows.length : undefined
              }
              style={
                virtualizationEnabled
                  ? {
                      display: 'grid',
                      height: rowVirtualizer.getTotalSize(),
                      position: 'relative',
                    }
                  : undefined
              }
            >
              {isInitialLoading ? (
                <tr>
                  <td colSpan={leafColumnCount} className="p-4">
                    <div role="status" aria-live="polite">
                      {loadingState ?? labels.loading}
                    </div>
                  </td>
                </tr>
              ) : hasErrorState ? (
                <tr>
                  <td colSpan={leafColumnCount} className="p-4">
                    {errorState}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={leafColumnCount} className="p-4">
                    {emptyState}
                  </td>
                </tr>
              ) : virtualizationEnabled ? (
                rowVirtualizer.getVirtualItems().map((virtualItem) => {
                  const row = rows[virtualItem.index];
                  return row ? renderTableRow(row, virtualItem) : null;
                })
              ) : (
                rows.map((row) => renderTableRow(row))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {hasPagination ? (
        <nav
          className="flex items-center justify-center gap-3 pt-4"
          aria-label={labels.table}
        >
          <button
            type="button"
            aria-label={labels.previousPage}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            ‹
          </button>
          <span aria-live="polite">
            {pagination.pageIndex + 1} / {pagination.pageCount}
          </span>
          <button
            type="button"
            aria-label={labels.nextPage}
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            ›
          </button>
        </nav>
      ) : null}
    </div>
  );
}
