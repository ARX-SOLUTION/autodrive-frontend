import type { ListMeta, ListResponse } from '@/types/list';

const fallbackMeta = (
  dataLength: number,
  page: number,
  limit: number,
  meta?: Partial<ListMeta>,
): ListMeta => {
  const total = meta?.total ?? dataLength;
  const safeLimit = meta?.limit ?? limit;
  const totalPages =
    meta?.totalPages ?? (safeLimit > 0 ? Math.ceil(total / safeLimit) : 0);

  return {
    total,
    page: meta?.page ?? page,
    limit: safeLimit,
    totalPages,
    hasNextPage: meta?.hasNextPage ?? page < totalPages,
    hasPreviousPage: meta?.hasPreviousPage ?? page > 1,
  };
};

export const parseListResponse = <T>(
  raw: unknown,
  page = 1,
  limit = 20,
): ListResponse<T> => {
  const root = raw as {
    data?: unknown;
    meta?: Partial<ListMeta>;
  };
  const nested = root?.data as
    | { data?: unknown; meta?: Partial<ListMeta> }
    | undefined;
  const payload =
    nested && 'data' in nested && 'meta' in nested ? nested : root;

  let rows: unknown = [];
  if (Array.isArray(payload)) rows = payload;
  else if (Array.isArray(payload?.data)) rows = payload.data;
  else if (Array.isArray(nested?.data)) rows = nested.data;

  const data = Array.isArray(rows) ? (rows as T[]) : [];
  const meta = payload?.meta ?? nested?.meta;

  return {
    data,
    meta: fallbackMeta(data.length, page, limit, meta),
  };
};
