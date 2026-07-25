import { useState, useMemo } from 'react';

const ITEMS_PER_PAGE = 10;

export function usePagination<T>(items: T[], perPage = ITEMS_PER_PAGE) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));

  // Was `useEffect(() => { if (currentPage > totalPages) setCurrentPage(1); },
  // [totalPages, currentPage])` (react-hooks/set-state-in-effect). React's
  // documented replacement for "reset state when a value changes" is to do
  // it during render, guarded by a snapshot of the last-seen values, instead
  // of a post-commit effect -- same reset, triggered by the same two
  // conditions, one render sooner (no extra cascading paint).
  const [prevBounds, setPrevBounds] = useState({ totalPages, currentPage });
  if (
    prevBounds.totalPages !== totalPages ||
    prevBounds.currentPage !== currentPage
  ) {
    setPrevBounds({ totalPages, currentPage });
    if (currentPage > totalPages) setCurrentPage(1);
  }

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, currentPage, perPage]);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    setCurrentPage,
    totalItems: items.length,
  };
}
