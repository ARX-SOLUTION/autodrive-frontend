export type DataGridSortDirection = 'asc' | 'desc';

export interface DataGridSort<TKey extends string> {
  key: TKey;
  direction: DataGridSortDirection;
}

export interface DataGridSearchConfig<TKey extends string> {
  sortKeys: readonly TKey[];
  defaultSort: DataGridSort<TKey>;
}

export interface DataGridSearchState<TKey extends string> {
  page: number;
  sort: DataGridSort<TKey>;
}

export interface DataGridFilterSearchUpdate {
  type: 'filters';
  values: Readonly<Record<string, string | null | undefined>>;
}

export interface DataGridPageSearchUpdate {
  type: 'page';
  page: number;
}

export interface DataGridSortSearchUpdate<TKey extends string> {
  type: 'sort';
  sort: DataGridSort<TKey>;
}

export type DataGridSearchUpdate<TKey extends string> =
  | DataGridFilterSearchUpdate
  | DataGridPageSearchUpdate
  | DataGridSortSearchUpdate<TKey>;

const isPositiveInteger = (value: string | null): boolean =>
  value !== null &&
  /^[1-9]\d*$/.test(value) &&
  Number.isSafeInteger(Number(value));

export function parseDataGridSearch<TKey extends string>(
  searchParams: URLSearchParams,
  config: DataGridSearchConfig<TKey>,
): DataGridSearchState<TKey> {
  const rawPage = searchParams.get('page');
  const rawSortKey = searchParams.get('sort_by');
  const rawSortDirection = searchParams.get('sort_dir');

  const sortKey = config.sortKeys.find((key) => key === rawSortKey);
  const sortDirection =
    rawSortDirection === 'asc' || rawSortDirection === 'desc'
      ? rawSortDirection
      : config.defaultSort.direction;

  return {
    page: isPositiveInteger(rawPage) ? Number(rawPage) : 1,
    sort: {
      key: sortKey ?? config.defaultSort.key,
      direction: sortDirection,
    },
  };
}

export function updateDataGridSearch<TKey extends string>(
  searchParams: URLSearchParams,
  update: DataGridSearchUpdate<TKey>,
  config: DataGridSearchConfig<TKey>,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);

  if (update.type === 'page') {
    if (Number.isSafeInteger(update.page) && update.page > 1) {
      next.set('page', String(update.page));
    } else {
      next.delete('page');
    }
    return next;
  }

  if (update.type === 'sort') {
    const previousSort = parseDataGridSearch(searchParams, config).sort;
    const key =
      config.sortKeys.find((allowedKey) => allowedKey === update.sort.key) ??
      config.defaultSort.key;
    const direction =
      update.sort.direction === 'asc' || update.sort.direction === 'desc'
        ? update.sort.direction
        : config.defaultSort.direction;

    if (key === config.defaultSort.key) next.delete('sort_by');
    else next.set('sort_by', key);

    if (direction === config.defaultSort.direction) next.delete('sort_dir');
    else next.set('sort_dir', direction);

    if (previousSort.key !== key || previousSort.direction !== direction) {
      next.delete('page');
    }
    return next;
  }

  let changed = false;

  for (const [key, value] of Object.entries(update.values)) {
    const normalizedValue = value || null;

    if (next.get(key) === normalizedValue) continue;

    changed = true;
    if (normalizedValue === null) next.delete(key);
    else next.set(key, normalizedValue);
  }

  if (changed) next.delete('page');
  return next;
}
