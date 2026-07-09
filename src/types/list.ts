export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}
