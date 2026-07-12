import { useUrlParams } from './useUrlParams';

/**
 * Shared search+sort+page URL state for server-paginated list pages
 * (TeachersPage, OperatorsPage) — mirrors admin-panel's
 * useSearchSortFilters, adapted to this repo's useUrlParams/q/sort_by/
 * sort_dir key names (autodrive-b85.3). `search` and `page` are sent to
 * the server; `sortField`/`sortDir` stay client-side over just the current
 * page since GetUsersQueryDto has no sort param.
 */
export function useSearchSortFilters(defaultSortField = 'name') {
  const { searchParams, setParam, setParams } = useUrlParams();

  const search = searchParams.get('q') ?? '';
  const sortField = searchParams.get('sort_by') ?? defaultSortField;
  const sortDir = (searchParams.get('sort_dir') as 'asc' | 'desc') ?? 'asc';
  const page = Number(searchParams.get('page')) || 1;

  // Search changed → old page number may no longer be valid, reset to 1.
  const setSearch = (v: string) =>
    setParams({ q: v || undefined, page: undefined });

  const setPage = (p: number) =>
    setParam('page', p > 1 ? String(p) : undefined);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setParam('sort_dir', sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setParams({ sort_by: field, sort_dir: undefined });
    }
  };

  return { search, setSearch, sortField, sortDir, toggleSort, page, setPage };
}
