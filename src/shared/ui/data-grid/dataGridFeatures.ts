import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type CellData,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';

export type DataGridAlign = 'left' | 'center' | 'right';

export interface DataGridColumnMeta {
  align?: DataGridAlign;
  cellClassName?: string;
  headerClassName?: string;
}

export const dataGridFeatures = tableFeatures({
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnMeta: {} as DataGridColumnMeta,
});

export type DataGridFeatures = typeof dataGridFeatures;

export type DataGridColumnDef<
  TData extends RowData,
  TValue extends CellData = CellData,
> = ColumnDef<DataGridFeatures, TData, TValue>;

export const createDataGridColumnHelper = <TData extends RowData>() =>
  createColumnHelper<DataGridFeatures, TData>();
