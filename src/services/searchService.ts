import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';

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
const EMPTY: SearchResponse = { students: [], groups: [], staff: [] };

// autodrive-cdy: GET /search?q= — tenant-scoped. Shape confirmed against
// backend PR #114 (autodrive-backend src/modules/search/search.service.ts):
// { students, groups, staff }, each item { id, label, subtitle }. No
// separate "payments" group — a payment match surfaces as its student.
export const useGlobalSearch = (query: string) => {
  const trimmed = query.trim();
  return useQuery<SearchResponse>({
    queryKey: ['search', trimmed],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/search', {
        params: { q: trimmed },
      });
      return data?.data ?? data ?? EMPTY;
    },
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  });
};
