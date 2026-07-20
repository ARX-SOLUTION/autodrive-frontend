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
});
