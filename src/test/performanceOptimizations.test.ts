import { describe, expect, it } from 'vitest';
import { coursesListQueryOptions } from '@/services/courseService';
import { queryClient } from '@/lib/queryClient';
import { createAppRouter } from '@/app/router';
import { branchDetailQueryOptions } from '@/services/branchService';

describe('Performance Architecture Optimizations', () => {
  it('configures course list query options with a 5-minute staleTime for reference data reuse', () => {
    const options = coursesListQueryOptions({ branchId: 'b1' });
    expect(options.staleTime).toBe(5 * 60_000);
  });

  it('configures queryClient with a 10-minute gcTime to retain inactive cache across page transitions', () => {
    const defaultQueries = queryClient.getDefaultOptions().queries;
    expect(defaultQueries?.gcTime).toBe(10 * 60_000);
    expect(defaultQueries?.staleTime).toBe(30_000);
    expect(defaultQueries?.refetchOnWindowFocus).toBe(false);
  });

  it('configures rate-limited prefetching on the app router (100ms debounce, 30s preload staleTime)', () => {
    const router = createAppRouter();
    expect(router.options.defaultPreload).toBe('intent');
    expect(router.options.defaultPreloadDelay).toBe(100);
    expect(router.options.defaultPreloadStaleTime).toBe(30_000);
  });

  it('exports branchDetailQueryOptions with deterministic key and fetcher', () => {
    const options = branchDetailQueryOptions('branch-99');
    expect(options.queryKey).toEqual(['branches', 'detail', 'branch-99']);
    expect(options.enabled).toBe(true);
  });
});
