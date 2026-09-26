import { useUrlParams } from '@/hooks/useUrlParams';
import { parseListTab } from '@/lib/listQuery';

/**
 * Section tabs that used to live in component state. The default tab is
 * omitted from the URL unless `persistDefault` is set (needed when another
 * query flag would otherwise reopen the non-default tab).
 */
export function useUrlTab<T extends string>(
  allowed: readonly T[],
  fallback: T,
  options?: { persistDefault?: boolean },
) {
  const { searchParams, setParams } = useUrlParams();
  const tab = parseListTab(searchParams.get('tab'), allowed, fallback);

  const setTab = (next: string) => {
    if (!(allowed as readonly string[]).includes(next)) return;
    const value =
      !options?.persistDefault && next === fallback ? undefined : next;
    setParams({ tab: value, page: undefined });
  };

  return [tab, setTab] as const;
}
