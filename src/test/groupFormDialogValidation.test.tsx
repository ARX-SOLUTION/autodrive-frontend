import {
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from '@testing-library/react';
import { toast } from 'sonner';
import { vi, describe, it, expect, afterEach } from 'vitest';
import GroupFormDialog from '@/pages/groups/GroupFormDialog';
import type { Branch } from '@/types/branch';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// autodrive-52v.1: submitting with the required branch <Select> left unset
// used to just `return` with no toast/inline error -- the dialog looked
// frozen. Regression: it must now surface an inline <FormMessage> (zod
// `common.required`) on the branch field, and must not call the mutation.

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
  renderWithRouter(
    <GroupFormDialog
      open
      editGroup={null}
      branches={BRANCHES as Branch[]}
      onClose={vi.fn()}
    />,
    { initialEntry: '/groups', routePattern: '/groups' },
  );

describe('GroupFormDialog validation feedback', () => {
  afterEach(() => {
    cleanup();
    h.createMutate.mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it('shows an inline required error and does not submit when branch is left unset', async () => {
    await renderDialog();
    fireEvent.change(screen.getByLabelText(/groups\.name/), {
      target: { value: '11-guruh' },
    });
    // Branch <Select> deliberately left untouched.

    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() =>
      expect(screen.getByText('common.required')).toBeInTheDocument(),
    );
    expect(h.createMutate).not.toHaveBeenCalled();
  });

  it('submits once name and branch are both filled', async () => {
    await renderDialog();
    fireEvent.change(screen.getByLabelText(/groups\.name/), {
      target: { value: '11-guruh' },
    });
    fireEvent.click(screen.getByLabelText(/common\.branch/));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Yunusobod'));

    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() =>
      expect(h.createMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: '11-guruh', branchId: 'b1' }),
        expect.anything(),
      ),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });
});
