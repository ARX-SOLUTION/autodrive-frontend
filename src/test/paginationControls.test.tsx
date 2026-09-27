import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PaginationControls from '@/components/ui/PaginationControls';

describe('PaginationControls', () => {
  it('navigates to adjacent pages while showing position and page size', () => {
    const onPageChange = vi.fn();
    render(
      <PaginationControls
        currentPage={2}
        totalPages={5}
        onPageChange={onPageChange}
        pageSize={10}
        onPageSizeChange={vi.fn()}
        totalItems={42}
      />,
    );

    expect(screen.getByText('11–20 / 42')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'common.rows_per_page' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toHaveAttribute(
      'aria-label',
      'common.pagination',
    );
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.next' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.previous' }));
    expect(onPageChange.mock.calls).toEqual([[3], [1]]);
  });

  it('does not navigate past the final page', () => {
    const onPageChange = vi.fn();
    render(
      <PaginationControls
        currentPage={2}
        totalPages={2}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'common.next' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'common.previous' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
