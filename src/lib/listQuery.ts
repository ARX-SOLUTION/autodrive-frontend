export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSizeOption = 10;

/** Secondary persistence when a list URL has no `limit`. */
export const LIST_PAGE_SIZE_STORAGE_KEY = 'autodrive-list-page-size';

export const isPageSizeOption = (value: number): value is PageSizeOption =>
  (PAGE_SIZE_OPTIONS as readonly number[]).includes(value);

export const parsePage = (raw: string | null | undefined): number => {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export const parsePageSize = (
  raw: string | null | undefined,
): PageSizeOption | null => {
  const size = Number(raw);
  return isPageSizeOption(size) ? size : null;
};

const storageOrNull = (storage?: Storage | null) => {
  if (storage !== undefined) return storage;
  return typeof window === 'undefined' ? null : window.localStorage;
};

export const readStoredPageSize = (
  storage?: Storage | null,
): PageSizeOption | null => {
  const target = storageOrNull(storage);
  if (!target) return null;
  try {
    return parsePageSize(target.getItem(LIST_PAGE_SIZE_STORAGE_KEY));
  } catch {
    return null;
  }
};

export const writeStoredPageSize = (
  size: PageSizeOption,
  storage?: Storage | null,
) => {
  const target = storageOrNull(storage);
  if (!target) return;
  try {
    target.setItem(LIST_PAGE_SIZE_STORAGE_KEY, String(size));
  } catch {
    // Private mode and quota errors should not block the list.
  }
};

/** URL `limit` wins; otherwise the stored preference; otherwise 10. */
export const resolvePageSize = (
  urlValue: string | null | undefined,
  stored: PageSizeOption | null = readStoredPageSize(),
): PageSizeOption => parsePageSize(urlValue) ?? stored ?? DEFAULT_PAGE_SIZE;

export const parseRoutePage = (value: unknown): number | undefined => {
  const page =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  return Number.isInteger(page) && page > 0 ? page : undefined;
};

export const parseRouteLimit = (value: unknown): PageSizeOption | undefined => {
  const size =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  return isPageSizeOption(size) ? size : undefined;
};

export const parseListTab = <T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
): T =>
  raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;

export const matchesListQuery = (
  query: string,
  ...parts: Array<string | number | null | undefined>
): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) =>
    String(part ?? '')
      .toLowerCase()
      .includes(needle),
  );
};

export const slicePage = <T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): T[] => {
  const start = Math.max(0, page - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

export const pageCountFor = (total: number, pageSize: number): number =>
  Math.max(1, pageSize > 0 ? Math.ceil(total / pageSize) : 1);
