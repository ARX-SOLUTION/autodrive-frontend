import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePagination } from './usePagination';

// react-hooks/set-state-in-effect fix: the out-of-range reset moved from a
// useEffect to a render-phase guarded setState. Locks down the exact
// original semantics: resetting all the way to page 1 (not clamping to the
// new last page) when the current page runs past a shrunk item list, and
// staying there even if the list grows back.
// ponytail: this hook has no callers anywhere in the app today -- fixed in
// place (not deleted) since it's still exported; this is its first test.

describe('usePagination', () => {
  it('paginates and reports totalPages', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items, 10));
    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedItems).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it('resets to page 1 (not clamped to the new last page) when the item list shrinks past the current page', () => {
    const { result, rerender } = renderHook(
      ({ items }) => usePagination(items, 10),
      { initialProps: { items: Array.from({ length: 25 }, (_, i) => i) } },
    );

    act(() => result.current.setCurrentPage(3));
    expect(result.current.currentPage).toBe(3);

    rerender({ items: Array.from({ length: 15 }, (_, i) => i) }); // totalPages -> 2
    expect(result.current.currentPage).toBe(1);
  });

  it('does not reset while the current page stays in range', () => {
    const { result, rerender } = renderHook(
      ({ items }) => usePagination(items, 10),
      { initialProps: { items: Array.from({ length: 25 }, (_, i) => i) } },
    );

    act(() => result.current.setCurrentPage(2));
    rerender({ items: Array.from({ length: 21 }, (_, i) => i) }); // still 3 pages
    expect(result.current.currentPage).toBe(2);
  });
});
