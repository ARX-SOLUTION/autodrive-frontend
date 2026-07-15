import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { parseItemEnvelope } from '@/lib/apiEnvelope';
import { searchKeys } from '@/lib/queryKeys';

export interface SearchResultItem {
  id: string;
  label: string;
  subtitle: string;
}

export interface SearchResponse {
  students: SearchResultItem[];
  groups: SearchResultItem[];
  staff: SearchResultItem[];
}

const MIN_QUERY_LENGTH = 2;

// autodrive-cdy: GET /search?q= — tenant-scoped. Shape confirmed against
// backend PR #114 (autodrive-backend src/modules/search/search.service.ts):
// { students, groups, staff }, each item { id, label, subtitle }. No
// separate "payments" group — a payment match surfaces as its student.
export const useGlobalSearch = (query: string) => {
  const trimmed = query.trim();
  return useQuery<SearchResponse>({
    queryKey: searchKeys.query(trimmed),
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get('/search', {
        params: { q: trimmed },
        signal,
      });
      return parseItemEnvelope<SearchResponse>(data, 'search');
    },
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  });
};
