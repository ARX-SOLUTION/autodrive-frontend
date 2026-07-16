import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable, type DataTableColumn } from './DataTable';

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name },
];

describe('DataTable', () => {
  it('renders rows via the column render function', () => {
    render(
      <DataTable
        columns={columns}
        rows={[
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' },
        ]}
        keyExtractor={(r) => r.id}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('calls onRowClick with the row and the clicked element', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={[{ id: '1', name: 'Alice' }]}
        keyExtractor={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0]).toEqual({ id: '1', name: 'Alice' });
    expect(onRowClick.mock.calls[0][1]).toBeInstanceOf(HTMLElement);
  });

  it('activates onRowClick via Enter key for keyboard access', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={[{ id: '1', name: 'Alice' }]}
        keyExtractor={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state node when there are no rows', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        keyExtractor={(r) => r.id}
        emptyState={<div>nothing here</div>}
      />,
    );
    expect(screen.getByText('nothing here')).toBeInTheDocument();
  });

  it('renders nothing extra when rows are empty and no emptyState is given', () => {
    const { container } = render(
      <DataTable columns={columns} rows={[]} keyExtractor={(r) => r.id} />,
    );
    expect(container.querySelectorAll('tbody tr').length).toBe(0);
  });

  it('shows the error state and skips rows when isError is true', () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ id: '1', name: 'Alice' }]}
        keyExtractor={(r) => r.id}
        isError
        errorState={<div>boom</div>}
      />,
    );
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('shows skeletonRowCount skeleton rows while loading', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={[]}
        keyExtractor={(r) => r.id}
        isLoading
        skeletonRowCount={3}
      />,
    );
    expect(container.querySelectorAll('tbody tr').length).toBe(3);
  });
});
