import { screen, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import UserDetailPage from '@/features/staff/pages/UserDetailPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// Controllable per-test fixture for isLoading/isError/data-not-found split
// below (autodrive-d4j). Starts undefined (vi.hoisted runs before USER is
// initialized) -- backfilled to USER right after the const, same pattern as
// branch.current in branchDetailPage.test.tsx.
const userQuery = vi.hoisted(() => ({
  data: undefined as Record<string, unknown> | undefined,
  isLoading: false,
  isError: false,
}));

vi.mock('@/features/staff/api/userService', () => ({
  useUser: () => userQuery,
}));

vi.mock('@/features/staff/components/UserAccessPanel', () => ({
  default: () => <div>Permission editor</div>,
}));

const USER = {
  id: 'u1',
  name: 'Nigora Karimova',
  email: 'nigora@example.com',
  role: 'operator',
  branch_name: 'Yunusobod',
  is_active: true,
  referred_students_count: 3,
};
userQuery.data = USER;

const renderPage = () =>
  renderWithRouter(<UserDetailPage />, {
    routePattern: '/users/$id',
    params: { id: 'u1' },
  });

afterEach(() => {
  userQuery.data = USER;
  userQuery.isLoading = false;
  userQuery.isError = false;
  cleanup();
});

describe('UserDetailPage referred_students_count Field', () => {
  it('links the referred students count to the filtered students list', async () => {
    await renderPage();
    const link = screen.getByText('3').closest('a');
    expect(link?.getAttribute('href')).toBe('/students?referred_by_user_id=u1');
  });
});

// autodrive-d4j: a real fetch error must not read the same as a genuine
// not-found -- distinct title/icon per EntityDetailShell's isError/
// errorTitle/errorIcon props, same split AuditDetailPage already does.
describe('UserDetailPage error vs not-found (autodrive-d4j)', () => {
  it('shows the not-found message when the user genuinely does not exist', async () => {
    userQuery.data = undefined;
    userQuery.isError = false;
    await renderPage();
    expect(screen.getByText('common.not_found')).toBeTruthy();
    expect(screen.queryByText('common.error')).toBeNull();
  });

  it('shows the error message, not not-found, on a real fetch error', async () => {
    userQuery.data = undefined;
    userQuery.isError = true;
    await renderPage();
    expect(screen.getByText('common.error')).toBeTruthy();
    expect(screen.queryByText('common.not_found')).toBeNull();
  });
});

describe('staff access management visibility', () => {
  beforeEach(() =>
    useAuthStore.setState({
      user: {
        id: 'actor',
        email: 'actor@example.com',
        role: 'manager',
        branch_ids: ['a'],
        permissions: [
          { permission: 'staff.read', scope: 'branch', branch_id: 'a' },
        ],
        delegations: [],
      },
      activeBranchId: 'a',
    }),
  );
  afterEach(() => useAuthStore.setState({ user: null, activeBranchId: null }));
  const renderAccessPage = () =>
    renderWithRouter(<UserDetailPage />, {
      routePattern: '/users/$id',
      initialEntry: '/users/u1?tab=access',
      params: { id: 'u1' },
    });
  it('opens the editor for a reader with delegation rights but no execution manage grant', async () => {
    useAuthStore.setState({
      user: {
        ...useAuthStore.getState().user!,
        delegations: [
          { permission: 'students.update', scope: 'branch', branch_id: 'a' },
        ],
      },
    });
    await renderAccessPage();
    expect(
      await screen.findByRole('tab', { name: 'access.title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Permission editor')).toBeInTheDocument();
  });
  it('hides manager controls when execution manage has no delegation ceiling', async () => {
    useAuthStore.setState({
      user: {
        ...useAuthStore.getState().user!,
        permissions: [
          ...useAuthStore.getState().user!.permissions!,
          {
            permission: 'staff.permissions.manage',
            scope: 'branch',
            branch_id: 'a',
          },
        ],
      },
    });
    await renderAccessPage();
    expect(
      await screen.findByRole('heading', { name: USER.name }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: 'access.title' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Permission editor')).not.toBeInTheDocument();
  });
});
