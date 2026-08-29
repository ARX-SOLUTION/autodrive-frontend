import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataGrid } from './DataGrid';
import { createDataGridColumnHelper } from './dataGridFeatures';

interface Person {
  id: string;
  name: string;
}

const columnHelper = createDataGridColumnHelper<Person>();
const columns = columnHelper.columns([
  columnHelper.accessor('name', {
    header: 'Name',
    cell: ({ getValue }) => getValue(),
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: 'includesString',
  }),
]);

const people: Person[] = [
  { id: '1', name: 'Zara' },
  { id: '2', name: 'Ali' },
];

const labels = {
  table: 'People',
  loading: 'Loading people',
  fetching: 'Refreshing people',
  previousPage: 'Previous page',
  nextPage: 'Next page',
};

const baseProps = {
  columns,
  getRowId: (person: Person) => person.id,
  pagination: { pageIndex: 0, pageSize: 25, rowCount: 2, pageCount: 1 },
  onPaginationChange: vi.fn(),
  sorting: [],
  onSortingChange: vi.fn(),
  columnFilters: [],
  onColumnFiltersChange: vi.fn(),
  manualPagination: true,
  manualSorting: true,
  manualFiltering: true,
  isInitialLoading: false,
  isFetching: false,
  labels,
  emptyState: <p>No people</p>,
};

describe('DataGrid', () => {
  it('renders the supplied current-page rows through TanStack column definitions', () => {
    render(<DataGrid {...baseProps} data={people} />);

    const table = screen.getByRole('table', { name: 'People' });
    expect(within(table).getByText('Zara')).toBeInTheDocument();
    expect(within(table).getByText('Ali')).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('emits resolved controlled sorting and pagination states', () => {
    const onSortingChange = vi.fn();
    const onPaginationChange = vi.fn();
    render(
      <DataGrid
        {...baseProps}
        data={people}
        pagination={{
          pageIndex: 1,
          pageSize: 25,
          rowCount: 100,
          pageCount: 4,
        }}
        onSortingChange={onSortingChange}
        onPaginationChange={onPaginationChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(onSortingChange).toHaveBeenCalledWith([{ id: 'name', desc: false }]);
    expect(onPaginationChange).toHaveBeenCalledWith({
      pageIndex: 2,
      pageSize: 25,
    });
  });

  it('emits resolved controlled column-filter state from a column control', () => {
    const onColumnFiltersChange = vi.fn();
    const filterColumns = columnHelper.columns([
      columnHelper.accessor('name', {
        header: ({ column }) => (
          <button type="button" onClick={() => column.setFilterValue('Ali')}>
            Filter Ali
          </button>
        ),
        cell: ({ getValue }) => getValue(),
        enableColumnFilter: true,
        filterFn: 'includesString',
      }),
    ]);

    render(
      <DataGrid
        {...baseProps}
        data={people}
        columns={filterColumns}
        onColumnFiltersChange={onColumnFiltersChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Filter Ali' }));

    expect(onColumnFiltersChange).toHaveBeenCalledWith([
      { id: 'name', value: 'Ali' },
    ]);
  });

  it('keeps row semantics and supports labelled keyboard row activation', () => {
    const onRowActivate = vi.fn();
    render(
      <DataGrid
        {...baseProps}
        data={[people[0]]}
        pagination={{ ...baseProps.pagination, rowCount: 1 }}
        onRowActivate={onRowActivate}
        getRowAriaLabel={(person) => `Open ${person.name}`}
      />,
    );

    const row = screen.getByRole('row', { name: 'Open Zara' });
    expect(row).toHaveAttribute('tabindex', '0');
    expect(row).toHaveAttribute('aria-keyshortcuts', 'Enter Space');

    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    fireEvent.click(row);

    expect(onRowActivate).toHaveBeenCalledTimes(3);
    expect(onRowActivate).toHaveBeenLastCalledWith(people[0], row);
  });

  it('distinguishes initial loading from background fetching', () => {
    const { rerender } = render(
      <DataGrid
        {...baseProps}
        data={people}
        isInitialLoading
        loadingState={<span>First load skeleton</span>}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('First load skeleton');
    expect(screen.queryByText('Zara')).not.toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'People' }).closest('[aria-busy]'),
    ).toHaveAttribute('aria-busy', 'true');

    rerender(
      <DataGrid
        {...baseProps}
        data={people}
        isFetching
        isInitialLoading={false}
      />,
    );

    expect(screen.getByText('Zara')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Refreshing people');
  });

  it('virtualizes only rows from the supplied current page', async () => {
    const currentPage = Array.from({ length: 100 }, (_, index) => ({
      id: String(index),
      name: `Person ${index}`,
    }));
    const { container } = render(
      <DataGrid
        {...baseProps}
        data={currentPage}
        pagination={{
          pageIndex: 4,
          pageSize: 100,
          rowCount: 10_000,
          pageCount: 100,
        }}
        virtualizeCurrentPage={{
          viewportHeight: 80,
          estimateRowHeight: 20,
          overscan: 0,
        }}
      />,
    );

    const body = container.querySelector('tbody');
    expect(body).toHaveAttribute('data-virtualized-row-count', '100');
    expect(body).toHaveStyle({ height: '2000px' });

    const table = screen.getByRole('table', { name: 'People' });
    await waitFor(() =>
      expect(within(table).getAllByRole('row').length).toBeGreaterThan(1),
    );
    const renderedDataRows = within(table).getAllByRole('row').length - 1;
    expect(renderedDataRows).toBeGreaterThan(0);
    expect(renderedDataRows).toBeLessThan(currentPage.length);
    expect(screen.queryByText('Person 100')).not.toBeInTheDocument();
  });

  it('uses the explicit manual flags as processing ownership boundaries', () => {
    const processingProps = {
      pagination: {
        pageIndex: 0,
        pageSize: 1,
        rowCount: 2,
        pageCount: 2,
      },
      sorting: [{ id: 'name', desc: false }],
      columnFilters: [{ id: 'name', value: 'a' }],
    };
    const { rerender } = render(
      <DataGrid {...baseProps} {...processingProps} data={people} />,
    );

    let table = screen.getByRole('table', { name: 'People' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getAllByRole('cell')[0]).toHaveTextContent('Zara');

    rerender(
      <DataGrid
        {...baseProps}
        {...processingProps}
        data={people}
        manualPagination={false}
        manualSorting={false}
        manualFiltering={false}
      />,
    );

    table = screen.getByRole('table', { name: 'People' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('Ali')).toBeInTheDocument();
    expect(within(table).queryByText('Zara')).not.toBeInTheDocument();
  });

  it('provides current-page metadata to the optional mobile renderer', () => {
    const { container } = render(
      <DataGrid
        {...baseProps}
        data={[people[0]]}
        pagination={{
          pageIndex: 2,
          pageSize: 25,
          rowCount: 60,
          pageCount: 3,
        }}
        renderMobileRow={({ row, absoluteRowIndex }) => (
          <article>
            Mobile {row.name} at {absoluteRowIndex}
          </article>
        )}
      />,
    );

    const mobile = container.querySelector('[data-data-grid-mobile]');
    expect(mobile).toHaveTextContent('Mobile Zara at 50');
  });
});
