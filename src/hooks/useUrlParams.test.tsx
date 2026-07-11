import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { useUrlParams } from './useUrlParams';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/students']}>{children}</MemoryRouter>
);

describe('useUrlParams', () => {
  it('writes and reads a single param', () => {
    const { result } = renderHook(() => useUrlParams(), { wrapper });

    act(() => result.current.setParam('q', 'ali'));

    expect(result.current.searchParams.get('q')).toBe('ali');
  });

  it('deletes a param when set to undefined', () => {
    const { result } = renderHook(() => useUrlParams(), { wrapper });

    act(() => result.current.setParam('q', 'ali'));
    act(() => result.current.setParam('q', undefined));

    expect(result.current.searchParams.get('q')).toBeNull();
  });

  it('writes multiple params atomically without clobbering each other (autodrive-6cq.5.70)', () => {
    const { result } = renderHook(() => useUrlParams(), { wrapper });

    act(() =>
      result.current.setParams({
        date_from: '2026-07-01',
        date_to: '2026-07-10',
      }),
    );

    expect(result.current.searchParams.get('date_from')).toBe('2026-07-01');
    expect(result.current.searchParams.get('date_to')).toBe('2026-07-10');
  });

  it('preserves an unrelated existing param when setParam updates another key', () => {
    const { result } = renderHook(() => useUrlParams(), { wrapper });

    act(() => result.current.setParam('branch_id', 'b1'));
    act(() => result.current.setParam('q', 'ali'));

    expect(result.current.searchParams.get('branch_id')).toBe('b1');
    expect(result.current.searchParams.get('q')).toBe('ali');
  });
});
