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
  it('keeps the range visible for a single fixed-size page', () => {
    render(
      <PaginationControls
        currentPage={1}
        totalPages={1}
        pageSize={20}
        totalItems={7}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('1–7 / 7')).toBeInTheDocument();
  });

  it('does not invent a range when the page size is unknown', () => {
    render(
      <PaginationControls
        currentPage={2}
        totalPages={3}
        totalItems={47}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/\d+–\d+ \/ 47/)).not.toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('caps the final-page range at the total count', () => {
    render(
      <PaginationControls
        currentPage={3}
        totalPages={3}
        pageSize={20}
        totalItems={47}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('41–47 / 47')).toBeInTheDocument();
  });

  it('changes pages without submitting an enclosing form', () => {
    const onPageChange = vi.fn();
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PaginationControls
          currentPage={1}
          totalPages={3}
          onPageChange={onPageChange}
        />
      </form>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
