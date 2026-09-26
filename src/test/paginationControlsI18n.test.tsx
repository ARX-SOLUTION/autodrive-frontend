import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PaginationControls from '@/components/ui/PaginationControls';

// autodrive-52v.5: "Oldingi"/"Keyingi" were hardcoded Uzbek literals, always
// shown regardless of the active locale. Now routed through the existing
// common.previous / common.next keys (reused, not reinvented).
describe('PaginationControls i18n', () => {
  it('renders previous/next via t(), not hardcoded Uzbek text', () => {
    render(
      <PaginationControls
        currentPage={2}
        totalPages={3}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText('common.previous')).toBeTruthy();
    expect(screen.getByText('common.next')).toBeTruthy();
    expect(screen.queryByText('Oldingi')).toBeNull();
    expect(screen.queryByText('Keyingi')).toBeNull();
  });

  it('shows the row range and a page-size combobox in one footer', () => {
    render(
      <PaginationControls
        currentPage={2}
        totalPages={5}
        onPageChange={vi.fn()}
        pageSize={10}
        onPageSizeChange={vi.fn()}
        totalItems={42}
      />,
    );

    expect(screen.getByText('11–20 / 42')).toBeTruthy();
    expect(
      screen.getByRole('combobox', { name: 'common.rows_per_page' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'common.previous' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
