import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import GroupFormDialog from '@/pages/groups/GroupFormDialog';
import type { Branch } from '@/types/branch';
import type { Group } from '@/types/group';

// autodrive-vh0.1: the group form gains an optional teacher selector.
// mutate is a spy (not a real mutation) so these assert on the payload the
// component builds, same seam as groupFormDialogDuplicateWarning.test.tsx.

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const h = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
}));

vi.mock('@/services/groupService', () => ({
  useCreateGroup: () => ({ mutate: h.createMutate, isPending: false }),
  useUpdateGroup: () => ({ mutate: h.updateMutate, isPending: false }),
  useGroups: () => ({ data: [] }),
}));

vi.mock('@/services/teacherService', () => ({
  useTeachers: () => ({
    data: [
      { id: 't1', name: 'Aziz Karimov', email: 'aziz@example.com' },
      { id: 't2', name: 'Malika Yusupova', email: 'malika@example.com' },
    ],
  }),
}));

const BRANCHES: Partial<Branch>[] = [{ id: 'b1', name: 'Yunusobod' }];

const GROUP: Group = {
  id: 'g1',
  name: '11-guruh',
  branch_id: 'b1',
  course_type: 'avto_maktab',
  active_students: 0,
  is_active: true,
  created_at: '2026-07-01T00:00:00.000Z',
  teacher_id: 't1',
  teacher_name: 'Aziz Karimov',
  schedule: [],
  students: [],
};

const renderDialog = (editGroup: Group | null = null) =>
  render(
    <MemoryRouter>
      <GroupFormDialog
        open
        editGroup={editGroup}
        branches={BRANCHES as Branch[]}
        onClose={vi.fn()}
      />
    </MemoryRouter>,
  );

// Same combobox-click pattern as pickBranch in groupFormDialogDuplicateWarning
// -- Radix also renders a visually-hidden native <select> with matching
// <option> text, so the click is scoped to the real, visible listbox.
const pickSelectOption = (labelText: string | RegExp, optionText: string) => {
  fireEvent.click(screen.getByLabelText(labelText));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(optionText));
};

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/groups\.name/), {
    target: { value: '11-guruh' },
  });
  pickSelectOption(/common\.branch/, 'Yunusobod');
};

describe('GroupFormDialog teacher assignment', () => {
  afterEach(() => {
    cleanup();
    h.createMutate.mockClear();
    h.updateMutate.mockClear();
  });

  it('includes teacher_id in the create payload when a teacher is selected', async () => {
    renderDialog();
    fillRequiredFields();
    pickSelectOption(/groups\.form\.teacher_label/, 'Aziz Karimov');

    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() =>
      expect(h.createMutate).toHaveBeenCalledWith(
        expect.objectContaining({ teacherId: 't1' }),
        expect.anything(),
      ),
    );
  });

  it('sends teacher_id: null when "unassigned" (the default) is submitted', async () => {
    renderDialog();
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() =>
      expect(h.createMutate).toHaveBeenCalledWith(
        expect.objectContaining({ teacherId: null }),
        expect.anything(),
      ),
    );
  });

  it("defaults to the group's current teacher on edit and preserves it on submit", async () => {
    renderDialog(GROUP);

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() =>
      expect(h.updateMutate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'g1', teacherId: 't1' }),
        expect.anything(),
      ),
    );
  });
});
