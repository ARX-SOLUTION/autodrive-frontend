import {
  screen,
  fireEvent,
  act,
  cleanup,
  within,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import GroupFormDialog from '@/pages/groups/GroupFormDialog';
import type { Branch } from '@/types/branch';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// autodrive-553: create-time duplicate check for group names, normalized
// (trim + case-insensitive) and scoped to the currently-selected branch --
// a same-named group in a DIFFERENT branch must NOT trigger the warning.
// Debounce timing test follows the convention in
// commandPaletteSearch.test.tsx ("debounces the query by 300ms...").

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// g1 ("11-guruh") lives ONLY in branch b1 -- picking b2 and typing the same
// name must find nothing, proving branch_id actually scopes the search.
const h = vi.hoisted(() => ({
  groups: [{ id: 'g1', name: '11-guruh', branch_id: 'b1' }],
  spy: vi.fn(),
}));

vi.mock('@/services/groupService', () => ({
  useCreateGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useGroups: (params: { search?: string; branchId?: string }) => {
    h.spy(params);
    const term = (params.search || '').trim().toLowerCase();
    const data = h.groups.filter(
      (g) =>
        (!params.branchId || g.branch_id === params.branchId) &&
        (!term || g.name.toLowerCase().includes(term)),
    );
    return { data };
  },
}));

// GroupFormDialog now also calls useTeachers for its teacher selector
// (autodrive-vh0.1) -- stub it so the real hook doesn't throw for lack of a
// QueryClientProvider in this tree.
vi.mock('@/services/teacherService', () => ({
  useTeachers: () => ({ data: [] }),
}));

const BRANCHES: Partial<Branch>[] = [
  { id: 'b1', name: 'Yunusobod' },
  { id: 'b2', name: 'Chilonzor' },
];

const pickBranch = (name: string) => {
  fireEvent.click(screen.getAllByRole('combobox')[0]);
  // Radix also renders a visually-hidden native <select> for form
  // semantics, which has its own matching <option> text -- scope to the
  // visible listbox so this only ever clicks the real option.
  fireEvent.click(within(screen.getByRole('listbox')).getByText(name));
};

const renderDialog = () =>
  renderWithRouter(
    <GroupFormDialog
      open
      editGroup={null}
      branches={BRANCHES as Branch[]}
      onClose={vi.fn()}
    />,
    { initialEntry: '/groups', routePattern: '/groups' },
  );

describe('GroupFormDialog create-time duplicate warning', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    h.spy.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('debounces the group-name query by 300ms before it reaches useGroups', async () => {
    await renderDialog();
    fireEvent.change(screen.getByLabelText(/groups\.name/), {
      target: { value: '11-guruh' },
    });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(h.spy).not.toHaveBeenCalledWith(
      expect.objectContaining({ search: '11-guruh' }),
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(h.spy).toHaveBeenCalledWith(
      expect.objectContaining({ search: '11-guruh' }),
    );
  });

  it('warns when the same name already exists in the selected branch', async () => {
    await renderDialog();
    pickBranch('Yunusobod'); // b1 -- g1 lives here
    fireEvent.change(screen.getByLabelText(/groups\.name/), {
      target: { value: '11-guruh' },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('groups.duplicate_warning.title')).toBeTruthy();
    const link = screen.getByText('11-guruh').closest('a');
    expect(link).toHaveAttribute('href', '/groups/g1');
  });

  it('does NOT warn for a same-named group in a different branch', async () => {
    await renderDialog();
    pickBranch('Chilonzor'); // b2 -- g1 belongs to b1, not b2
    fireEvent.change(screen.getByLabelText(/groups\.name/), {
      target: { value: '11-guruh' },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('groups.duplicate_warning.title')).toBeNull();
  });

  it('shows no warning for a genuinely new name', async () => {
    await renderDialog();
    pickBranch('Yunusobod');
    fireEvent.change(screen.getByLabelText(/groups\.name/), {
      target: { value: 'Yangi guruh' },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('groups.duplicate_warning.title')).toBeNull();
  });
});
