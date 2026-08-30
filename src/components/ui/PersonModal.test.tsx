import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import PersonModal, {
  type PersonFormPayload,
} from '@/components/ui/PersonModal';

// autodrive-6ef.11 -- PersonModal is the single role-parameterized modal
// replacing UsersPage/OperatorsPage/TeachersPage's inline forms. Covers: the
// right fields render per role, invalid input blocks submit, and a valid
// submit produces the payload shape each page's mutation hook expects.

const auth = vi.hoisted(() => ({ role: 'owner' as string }));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: auth.role, branch_id: null } }),
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'b1', name: 'Branch 1' }] }),
}));

const q = (name: string) =>
  document.querySelector(`input[name="${name}"]`) as HTMLInputElement;

afterEach(cleanup);

describe('PersonModal field visibility per role', () => {
  it('shows email/password for a manager and hides specialization', () => {
    auth.role = 'owner';
    render(
      <PersonModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        role="manager"
        title="t"
        description="d"
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(q('email')).toBeTruthy();
    expect(q('password')).toBeTruthy();
    expect(within(dialog).queryByText('teachers.specialization')).toBeNull();
  });

  it('hides email/password/specialization for an operator', () => {
    auth.role = 'owner';
    render(
      <PersonModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        role="operator"
        title="t"
        description="d"
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(q('email')).toBeFalsy();
    expect(q('password')).toBeFalsy();
    expect(within(dialog).queryByText('teachers.specialization')).toBeNull();
  });

  it('shows specialization and hides email/password for a teacher', () => {
    auth.role = 'owner';
    render(
      <PersonModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        role="teacher"
        title="t"
        description="d"
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText('teachers.specialization', { exact: false }),
    ).toBeTruthy();
    expect(q('email')).toBeFalsy();
    expect(q('password')).toBeFalsy();
  });

  it('hides the branch select for a branch-scoped manager creating a teacher', () => {
    auth.role = 'manager';
    render(
      <PersonModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        role="teacher"
        title="t"
        description="d"
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('teachers.branch')).toBeNull();
  });
});

describe('PersonModal validation', () => {
  it('blocks submit and does not call onSubmit when required fields are empty', async () => {
    auth.role = 'owner';
    const onSubmit = vi.fn();
    render(
      <PersonModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        role="operator"
        title="t"
        description="d"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    expect(await screen.findByText('common.invalid_name')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('PersonModal submit payload shape', () => {
  it('lets an owner choose accountant and submit without a branch', async () => {
    auth.role = 'owner';
    const onSubmit = vi.fn();
    render(
      <PersonModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        role="manager"
        selectableRoles={['manager', 'accountant']}
        title="t"
        description="d"
      />,
    );

    fireEvent.click(
      screen.getByRole('combobox', { name: 'users.detail.role' }),
    );
    fireEvent.click(
      within(screen.getByRole('listbox')).getByText('roles.accountant'),
    );
    fireEvent.change(q('fullName'), { target: { value: 'Aziza Hisobchi' } });
    fireEvent.change(q('email'), { target: { value: 'aziza@example.com' } });
    fireEvent.change(q('password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    expect(
      await screen.findByText('users.password_requirements'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(q('password'), { target: { value: 'Secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Aziza Hisobchi',
      phone: undefined,
      email: 'aziza@example.com',
      password: 'Secret123',
      role: 'accountant',
    });
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('branchId');
  });

  it('does not expose accountant selection to a manager', () => {
    auth.role = 'manager';
    render(
      <PersonModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        role="manager"
        selectableRoles={['manager', 'accountant']}
        title="t"
        description="d"
      />,
    );

    expect(
      screen.queryByRole('combobox', { name: 'users.detail.role' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('roles.accountant')).not.toBeInTheDocument();
  });

  it('submits an operator payload with no email/password/specialization keys', async () => {
    auth.role = 'owner';
    const onSubmit = vi.fn();
    render(
      <PersonModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        role="operator"
        title="t"
        description="d"
      />,
    );
    fireEvent.change(q('fullName'), { target: { value: 'Ali Aliyev' } });
    fireEvent.change(q('phone'), { target: { value: '901234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await screen.findByRole('button', { name: 'common.add' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as PersonFormPayload;
    expect(payload).toEqual({
      fullName: 'Ali Aliyev',
      phone: '+998901234567',
      branchId: undefined,
    });
  });

  it('blocks manager submit without a branch, even with email/password filled', async () => {
    // branchId is a Radix Select (no plain <input>), so this checks the
    // required-branch guard rather than driving a full Select interaction.
    auth.role = 'owner';
    const onSubmit = vi.fn();
    render(
      <PersonModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        role="manager"
        title="t"
        description="d"
      />,
    );
    fireEvent.change(q('fullName'), { target: { value: 'Vali Valiyev' } });
    fireEvent.change(q('email'), { target: { value: 'vali@example.com' } });
    fireEvent.change(q('password'), { target: { value: 'Secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    expect(await screen.findByText('Required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a teacher payload without monetary or manager-only fields', async () => {
    auth.role = 'owner';
    const onSubmit = vi.fn();
    render(
      <PersonModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        role="teacher"
        title="t"
        description="d"
      />,
    );
    fireEvent.change(q('fullName'), { target: { value: 'Malika Ustoz' } });
    fireEvent.change(q('phone'), { target: { value: '909876543' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Malika Ustoz',
      phone: '+998909876543',
      branchId: undefined,
      specialization: 'THEORY',
    });
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('email');
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('password');
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('amount');
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('price');
  });
});
