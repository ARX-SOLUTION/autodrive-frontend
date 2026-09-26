import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRouterTestWrapper } from '@/test/utils/renderWithRouter';
import { LIST_PAGE_SIZE_STORAGE_KEY } from '@/lib/listQuery';
import { useListQueryState } from './useListQueryState';
import { useUrlTab } from './useUrlTab';

afterEach(() => {
  localStorage.removeItem(LIST_PAGE_SIZE_STORAGE_KEY);
});

const renderList = async (initialEntry = '/students') => {
  const { wrapper } = await createRouterTestWrapper({
    initialEntry,
    routePattern: '/students',
  });
  return renderHook(() => useListQueryState(), { wrapper });
};

describe('useListQueryState', () => {
  it('defaults page to 1 and page size to 10', async () => {
    const { result } = await renderList();
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.search).toBe('');
  });

  it('reads page, limit, and q from the URL', async () => {
    const { result } = await renderList('/students?page=3&limit=25&q=ali');
    expect(result.current.page).toBe(3);
    expect(result.current.pageSize).toBe(25);
    expect(result.current.search).toBe('ali');
  });

  it('writes page size to the URL and localStorage and resets page', async () => {
    const { result } = await renderList('/students?page=4');

    act(() => result.current.setPageSize(50));

    await waitFor(() => {
      expect(result.current.pageSize).toBe(50);
      expect(result.current.page).toBe(1);
    });
    expect(localStorage.getItem(LIST_PAGE_SIZE_STORAGE_KEY)).toBe('50');
  });

  it('uses the stored page size when the URL has no limit', async () => {
    localStorage.setItem(LIST_PAGE_SIZE_STORAGE_KEY, '100');
    const { result } = await renderList('/students?page=2');
    expect(result.current.pageSize).toBe(100);
    expect(result.current.page).toBe(2);
  });

  it('clears q and page together when search is emptied', async () => {
    const { result } = await renderList('/students?page=2&q=ali');

    act(() => result.current.setSearch(''));

    await waitFor(() => {
      expect(result.current.search).toBe('');
      expect(result.current.page).toBe(1);
    });
  });
});

describe('useUrlTab', () => {
  it('deep-links a non-default tab and omits the default', async () => {
    const { wrapper } = await createRouterTestWrapper({
      initialEntry: '/groups/1?tab=students',
      routePattern: '/groups/$id',
      params: { id: '1' },
    });
    const { result } = renderHook(
      () => useUrlTab(['info', 'students', 'schedule'] as const, 'info'),
      { wrapper },
    );

    expect(result.current[0]).toBe('students');

    act(() => result.current[1]('info'));

    await waitFor(() => expect(result.current[0]).toBe('info'));
  });

  it('ignores unknown tab values', async () => {
    const { wrapper } = await createRouterTestWrapper({
      initialEntry: '/schedule?tab=nope',
      routePattern: '/schedule',
    });
    const { result } = renderHook(
      () => useUrlTab(['calendar', 'templates'] as const, 'calendar'),
      { wrapper },
    );
    expect(result.current[0]).toBe('calendar');
  });
});
