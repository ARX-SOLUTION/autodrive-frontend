import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import { CommandPalette } from '@/components/layout/CommandPalette';

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

vi.mock('@/services/searchService', () => ({
  useGlobalSearch: (q: string) => {
    searchSpy(q);
    return { data: q.trim().length >= 2 ? RESULTS : EMPTY_RESULTS };
  },
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: () => true,
}));

const renderPalette = (onOpenChange = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="/dashboard"
          element={<CommandPalette open onOpenChange={onOpenChange} />}
        />
        <Route path="/students/:id" element={<div>student-detail</div>} />
        <Route path="/groups/:id" element={<div>group-detail</div>} />
        <Route path="/users/:id" element={<div>user-detail</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('CommandPalette global search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    searchSpy.mockClear();
  });

  it('debounces the query by 300ms before it reaches useGlobalSearch', () => {
    renderPalette();
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

  it('renders results grouped by type once the query is non-trivial', () => {
    renderPalette();
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

  it('navigates to the matching detail route and closes on select', () => {
    const onOpenChange = vi.fn();
    renderPalette(onOpenChange);
    const input = screen.getByPlaceholderText('actions.search_placeholder');

    fireEvent.change(input, { target: { value: 'aziz' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByText('Aziz Karimov'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByText('student-detail')).toBeTruthy();
  });
});
