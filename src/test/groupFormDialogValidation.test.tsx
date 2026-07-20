import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { vi, describe, it, expect, afterEach } from 'vitest';
import GroupFormDialog from '@/pages/groups/GroupFormDialog';
import type { Branch } from '@/types/branch';

// autodrive-52v.1: submitting with the required branch <Select> left unset
// used to just `return` with no toast/inline error -- the dialog looked
// frozen. Regression: it must now surface the same fill_required toast
// CoursesPage already uses for this exact situation, and must not call the
// mutation.

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const h = vi.hoisted(() => ({
  createMutate: vi.fn(),
}));

vi.mock('@/services/groupService', () => ({
  useCreateGroup: () => ({ mutate: h.createMutate, isPending: false }),
  useUpdateGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useGroups: () => ({ data: [] }),
}));

vi.mock('@/services/teacherService', () => ({
  useTeachers: () => ({ data: [] }),
}));

const BRANCHES: Partial<Branch>[] = [{ id: 'b1', name: 'Yunusobod' }];

const renderDialog = () =>
  render(
    <MemoryRouter>
      <GroupFormDialog
        open
        editGroup={null}
        branches={BRANCHES as Branch[]}
        onClose={vi.fn()}
      />
    </MemoryRouter>,
  );

describe('GroupFormDialog validation feedback', () => {
  afterEach(() => {
    cleanup();
    h.createMutate.mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it('shows a fill_required toast and does not submit when branch is left unset', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/groups\.name/), {
      target: { value: '11-guruh' },
    });
    // Branch <Select> deliberately left untouched.

    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    expect(toast.error).toHaveBeenCalledWith('common.fill_required');
    expect(h.createMutate).not.toHaveBeenCalled();
  });

  it('submits once name and branch are both filled', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/groups\.name/), {
      target: { value: '11-guruh' },
    });
    fireEvent.click(screen.getByLabelText(/common\.branch/));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Yunusobod'));

    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    expect(toast.error).not.toHaveBeenCalled();
    expect(h.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: '11-guruh', branchId: 'b1' }),
      expect.anything(),
    );
  });
});
