import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  useFilterBarState,
  type ActiveFilterChipItem,
} from '@/hooks/useFilterBarState';

describe('useFilterBarState', () => {
  it('initializes with default empty state', () => {
    const { result } = renderHook(() => useFilterBarState());

    expect(result.current.chips).toEqual([]);
    expect(result.current.activeCount).toBe(0);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.isMobileOpen).toBe(false);
  });

  it('filters out falsy and empty values', () => {
    const onRemoveMock = vi.fn();
    const filters: (ActiveFilterChipItem | null | undefined | false)[] = [
      { id: '1', label: 'Status', value: 'Active', onRemove: onRemoveMock },
      null,
      undefined,
      false,
      { id: '2', label: 'Branch', value: '', onRemove: onRemoveMock },
      { id: '3', label: 'Type', value: 'Car', onRemove: onRemoveMock },
    ];

    const { result } = renderHook(() => useFilterBarState({ filters }));

    expect(result.current.chips).toHaveLength(2);
    expect(result.current.activeCount).toBe(2);
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.chips[0].id).toBe('1');
    expect(result.current.chips[1].id).toBe('3');
  });

  it('handles removeFilter correctly', () => {
    const remove1 = vi.fn();
    const remove2 = vi.fn();
    const filters: ActiveFilterChipItem[] = [
      { id: 'status', label: 'Status', value: 'Active', onRemove: remove1 },
      { id: 'branch', label: 'Branch', value: 'Main', onRemove: remove2 },
    ];

    const { result } = renderHook(() => useFilterBarState({ filters }));

    act(() => {
      result.current.removeFilter('status');
    });

    expect(remove1).toHaveBeenCalledTimes(1);
    expect(remove2).not.toHaveBeenCalled();

    act(() => {
      result.current.removeFilter('nonexistent');
    });
    expect(remove1).toHaveBeenCalledTimes(1);
    expect(remove2).not.toHaveBeenCalled();
  });

  it('handles clearAll', () => {
    const onClearAll = vi.fn();
    const { result } = renderHook(() => useFilterBarState({ onClearAll }));

    act(() => {
      result.current.clearAll();
    });

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it('manages mobile sheet open/close state', () => {
    const { result } = renderHook(() =>
      useFilterBarState({ initialMobileOpen: false }),
    );

    expect(result.current.isMobileOpen).toBe(false);

    act(() => {
      result.current.openMobile();
    });
    expect(result.current.isMobileOpen).toBe(true);

    act(() => {
      result.current.closeMobile();
    });
    expect(result.current.isMobileOpen).toBe(false);

    act(() => {
      result.current.setIsMobileOpen(true);
    });
    expect(result.current.isMobileOpen).toBe(true);
  });
});
