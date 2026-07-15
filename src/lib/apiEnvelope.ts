import type { ListMeta, ListResponse } from '@/types/list';

/**
 * Thrown when an API response doesn't match any shape a parser recognizes.
 * Carries the raw payload so it can be logged/inspected from a catch block
 * or React Query's `error` state. `.name` is set explicitly so it's
 * distinguishable from a generic `Error`/`AxiosError` via `err.name` or
 * `err instanceof ApiContractError`.
 */
export class ApiContractError extends Error {
  readonly received: unknown;

  constructor(message: string, received: unknown) {
    super(message);
    this.name = 'ApiContractError';
    this.received = received;
  }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Short, readable description of an unexpected value for error messages.
const describeShape = (v: unknown): string => {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (Array.isArray(v)) return `an array (length ${v.length})`;
  if (typeof v === 'object') return 'a malformed object';
  return `a ${typeof v} (${JSON.stringify(v)})`;
};

/**
 * Normalizes a single-item API response. Recognizes:
 *   - { data: {...} }  -> returns `data`
 *   - {...}            -> bare item (no envelope, no `data` key) -> returns as-is
 * Anything else (null, array, primitive, or a malformed `data`) throws
 * `ApiContractError`.
 */
export function parseItemEnvelope<T>(raw: unknown, resourceName: string): T {
  if (isPlainObject(raw)) {
    if ('data' in raw) {
      const inner = raw.data;
      if (isPlainObject(inner)) return inner as T;
      throw new ApiContractError(
        `Expected "${resourceName}" response envelope { data: object }, but "data" was ${describeShape(inner)}`,
        raw,
      );
    }
    return raw as T;
  }
  throw new ApiContractError(
    `Expected "${resourceName}" response to be an object or a { data: object } envelope, but received ${describeShape(raw)}`,
    raw,
  );
}

// Mirrors parseListResponse's fallbackMeta() in listResponse.ts -- not
// imported from there since it isn't exported, and this is a deliberately
// separate, stricter parser (see src/lib/listResponse.ts).
const synthesizeMeta = (
  dataLength: number,
  meta?: Partial<ListMeta>,
): ListMeta => {
  const page = meta?.page ?? 1;
  const limit = meta?.limit ?? 20;
  const total = meta?.total ?? dataLength;
  const totalPages =
    meta?.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : 0);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: meta?.hasNextPage ?? page < totalPages,
    hasPreviousPage: meta?.hasPreviousPage ?? page > 1,
  };
};

/**
 * Stricter sibling of `parseListResponse` (src/lib/listResponse.ts).
 * Recognizes the exact same 3 known shapes:
 *   - T[]                              (bare array)
 *   - { data: T[] }                    (wrapped)
 *   - { data: { data: T[], meta? } }   (doubly-wrapped)
 * and synthesizes `meta` the same way `parseListResponse` does when the
 * server omits it. Unlike `parseListResponse`, any OTHER shape throws
 * `ApiContractError` instead of silently returning an empty list.
 */
export function parseListEnvelope<T>(
  raw: unknown,
  resourceName: string,
): ListResponse<T> {
  if (Array.isArray(raw)) {
    return { data: raw as T[], meta: synthesizeMeta(raw.length) };
  }

  if (!isPlainObject(raw)) {
    throw new ApiContractError(
      `Expected "${resourceName}" list response to be an array or an envelope object, but received ${describeShape(raw)}`,
      raw,
    );
  }

  const rootData = raw.data;

  if (Array.isArray(rootData)) {
    return {
      data: rootData as T[],
      meta: synthesizeMeta(
        rootData.length,
        raw.meta as Partial<ListMeta> | undefined,
      ),
    };
  }

  if (isPlainObject(rootData) && Array.isArray(rootData.data)) {
    const rows = rootData.data as T[];
    const meta = (rootData.meta ?? raw.meta) as Partial<ListMeta> | undefined;
    return { data: rows, meta: synthesizeMeta(rows.length, meta) };
  }

  throw new ApiContractError(
    `Expected "${resourceName}" list response to be an array, { data: [] }, or { data: { data: [] } }, but received ${describeShape(raw)}`,
    raw,
  );
}
