import {
  screen,
  fireEvent,
  act,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// autodrive-cdy: Cmd+K palette wires a debounced (300ms, 2+ chars) call to
// the global search endpoint alongside the existing static page-name
// matching, renders results grouped by type (Talabalar/Guruhlar/Xodimlar),
// and navigates to the right detail route on select.

const searchSpy = vi.fn();
// autodrive-cdy: real backend shape (PR #114) — { students, groups, staff },
// each item { id, label, subtitle }. Not a flat type-tagged array.
const RESULTS = {
  students: [{ id: 's1', label: 'Aziz Karimov', subtitle: '+998901234567' }],
  groups: [{ id: 'g1', label: '11-guruh', subtitle: '' }],
  staff: [{ id: 'u1', label: 'Nigora Yusupova', subtitle: 'manager' }],
};
const EMPTY_RESULTS = { students: [], groups: [], staff: [] };

// autodrive-d88: lets tests drive isFetching independently of data, to
// cover the in-flight loading/disabled states. hasData=false simulates
// TanStack Query's `data: undefined` before the first fetch resolves.
const mockQueryState: { isFetching: boolean; hasData: boolean } = {
  isFetching: false,
  hasData: true,
};

vi.mock('@/services/searchService', () => ({
  useGlobalSearch: (q: string) => {
    searchSpy(q);
    const computed = q.trim().length >= 2 ? RESULTS : EMPTY_RESULTS;
    return {
      data: mockQueryState.hasData ? computed : undefined,
      isFetching: mockQueryState.isFetching,
    };
  },
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: () => true,
}));

const renderPalette = (onOpenChange = vi.fn()) =>
  renderWithRouter(<CommandPalette open onOpenChange={onOpenChange} />, {
    initialEntry: '/dashboard',
    routePattern: '/$',
  });

describe('CommandPalette global search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    searchSpy.mockClear();
    mockQueryState.isFetching = false;
    mockQueryState.hasData = true;
  });

  it('debounces the query by 300ms before it reaches useGlobalSearch', async () => {
    await renderPalette();
    const input = screen.getByPlaceholderText('actions.search_placeholder');

    fireEvent.change(input, { target: { value: 'k' } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(searchSpy).not.toHaveBeenCalledWith('k');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(searchSpy).toHaveBeenCalledWith('k');
  });

  it('renders results grouped by type once the query is non-trivial', async () => {
    await renderPalette();
    const input = screen.getByPlaceholderText('actions.search_placeholder');

    fireEvent.change(input, { target: { value: 'aziz' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('nav.students')).toBeTruthy();
    expect(screen.getByText('nav.groups')).toBeTruthy();
    expect(screen.getByText('actions.search_group_staff')).toBeTruthy();
    expect(screen.getByText('Aziz Karimov')).toBeTruthy();
    expect(screen.getByText('11-guruh')).toBeTruthy();
    expect(screen.getByText('Nigora Yusupova')).toBeTruthy();
  });

  it('navigates to the matching detail route and closes on select', async () => {
    const onOpenChange = vi.fn();
    const { router } = await renderPalette(onOpenChange);
    const input = screen.getByPlaceholderText('actions.search_placeholder');

    fireEvent.change(input, { target: { value: 'aziz' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    vi.useRealTimers();
    fireEvent.click(screen.getByText('Aziz Karimov'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/students/s1'),
    );
  });

  it('disables input and sets aria-busy while the first fetch of a fresh query is pending', async () => {
    mockQueryState.isFetching = true;
    mockQueryState.hasData = false;
    await renderPalette();
    const input = screen.getByPlaceholderText('actions.search_placeholder');

    fireEvent.change(input, { target: { value: 'aziz' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-busy', 'true');
  });

  it('keeps input enabled but still aria-busy on incremental re-fetches once results exist', async () => {
    mockQueryState.isFetching = true;
    mockQueryState.hasData = true;
    await renderPalette();
    const input = screen.getByPlaceholderText('actions.search_placeholder');

    fireEvent.change(input, { target: { value: 'aziz' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute('aria-busy', 'true');
  });
});
