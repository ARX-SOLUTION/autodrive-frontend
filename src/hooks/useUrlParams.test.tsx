import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createRouterTestWrapper } from '@/test/utils/renderWithRouter';
import { useUrlParams } from './useUrlParams';

const renderUrlParamsHook = async () => {
  const { wrapper } = await createRouterTestWrapper({
    initialEntry: '/students',
    routePattern: '/students',
  });

  return renderHook(() => useUrlParams(), { wrapper });
};

describe('useUrlParams', () => {
  it('writes and reads a single param', async () => {
    const { result } = await renderUrlParamsHook();

    act(() => result.current.setParam('q', 'ali'));

    await waitFor(() =>
      expect(result.current.searchParams.get('q')).toBe('ali'),
    );
  });

  it('deletes a param when set to undefined', async () => {
    const { result } = await renderUrlParamsHook();

    act(() => result.current.setParam('q', 'ali'));
    await waitFor(() =>
      expect(result.current.searchParams.get('q')).toBe('ali'),
    );
    act(() => result.current.setParam('q', undefined));

    await waitFor(() =>
      expect(result.current.searchParams.get('q')).toBeNull(),
    );
  });

  it('writes multiple params atomically without clobbering each other (autodrive-6cq.5.70)', async () => {
    const { result } = await renderUrlParamsHook();

    act(() =>
      result.current.setParams({
        date_from: '2026-07-01',
        date_to: '2026-07-10',
      }),
    );

    await waitFor(() => {
      expect(result.current.searchParams.get('date_from')).toBe('2026-07-01');
      expect(result.current.searchParams.get('date_to')).toBe('2026-07-10');
    });
  });

  it('preserves an unrelated existing param when setParam updates another key', async () => {
    const { result } = await renderUrlParamsHook();

    act(() => result.current.setParam('branch_id', 'b1'));
    await waitFor(() =>
      expect(result.current.searchParams.get('branch_id')).toBe('b1'),
    );
    act(() => result.current.setParam('q', 'ali'));

    await waitFor(() => {
      expect(result.current.searchParams.get('branch_id')).toBe('b1');
      expect(result.current.searchParams.get('q')).toBe('ali');
    });
  });
});
