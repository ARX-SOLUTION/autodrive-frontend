import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PaginationControls from '@/components/ui/PaginationControls';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, number>) =>
      key === 'common.showing_range' && values
        ? `${values.from}–${values.to} / ${values.total}`
        : key,
  }),
}));

describe('PaginationControls', () => {
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
    expect(screen.getByRole('button', { name: 'common.next' })).toBeDisabled();
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
