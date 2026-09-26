import { useUrlParams } from '@/hooks/useUrlParams';
import { useDebounce } from '@/hooks/useDebounce';
import {
  parseListTab,
  parsePage,
  parsePageSize,
  readStoredPageSize,
  resolvePageSize,
  writeStoredPageSize,
} from '@/lib/listQuery';

/**
 * Shared list chrome state: `page`, `limit`, and `q` live in the URL.
 * Page size also sticks in localStorage so the next list opens at the same
 * size when its URL does not say otherwise.
 */
export function useListQueryState<TTab extends string = string>(options?: {
  tabs?: readonly TTab[];
  defaultTab?: TTab;
}) {
  const { searchParams, setParam, setParams } = useUrlParams();
  const page = parsePage(searchParams.get('page'));
  const pageSize = resolvePageSize(
    searchParams.get('limit'),
    readStoredPageSize(),
  );
  const search = searchParams.get('q') ?? '';
  const debouncedSearch = useDebounce(search, 300);
  const fallbackTab = options?.defaultTab ?? options?.tabs?.[0];
  const tab = options?.tabs
    ? parseListTab(searchParams.get('tab'), options.tabs, fallbackTab as TTab)
    : ((searchParams.get('tab') ?? '') as TTab);

  const setPage = (nextPage: number) =>
    setParam('page', nextPage > 1 ? String(nextPage) : undefined);

  const setPageSize = (size: number) => {
    const next = parsePageSize(String(size));
    if (!next) return;
    writeStoredPageSize(next);
    setParams({ limit: String(next), page: undefined });
  };

  const setSearch = (value: string) =>
    setParams({ q: value.length > 0 ? value : undefined, page: undefined });

  const setTab = (next: string) => {
    if (options?.tabs && !(options.tabs as readonly string[]).includes(next)) {
      return;
    }
    setParams({
      tab: fallbackTab && next === fallbackTab ? undefined : next,
      page: undefined,
    });
  };

  return {
    page,
    pageSize,
    search,
    debouncedSearch,
    tab,
    setPage,
    setPageSize,
    setSearch,
    setTab,
  };
}

export function usePageSize() {
  const { pageSize, setPageSize } = useListQueryState();
  return { pageSize, setPageSize };
}
