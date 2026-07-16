import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import UserDetailPage from '@/pages/UserDetailPage';

// Controllable per-test fixture for isLoading/isError/data-not-found split
// below (autodrive-d4j). Starts undefined (vi.hoisted runs before USER is
// initialized) -- backfilled to USER right after the const, same pattern as
// branch.current in branchDetailPage.test.tsx.
const userQuery = vi.hoisted(() => ({
  data: undefined as Record<string, unknown> | undefined,
  isLoading: false,
  isError: false,
}));

vi.mock('@/services/userService', () => ({
  useUser: () => userQuery,
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
  render(
    <MemoryRouter initialEntries={['/users/u1']}>
      <Routes>
        <Route path="/users/:id" element={<UserDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  userQuery.data = USER;
  userQuery.isLoading = false;
  userQuery.isError = false;
  cleanup();
});

describe('UserDetailPage referred_students_count Field', () => {
  it('links the referred students count to the filtered students list', () => {
    renderPage();
    const link = screen.getByText('3').closest('a');
    expect(link?.getAttribute('href')).toBe('/students?referred_by_user_id=u1');
  });
});

// autodrive-d4j: a real fetch error must not read the same as a genuine
// not-found -- distinct title/icon per EntityDetailShell's isError/
// errorTitle/errorIcon props, same split AuditDetailPage already does.
describe('UserDetailPage error vs not-found (autodrive-d4j)', () => {
  it('shows the not-found message when the user genuinely does not exist', () => {
    userQuery.data = undefined;
    userQuery.isError = false;
    renderPage();
    expect(screen.getByText('common.not_found')).toBeTruthy();
    expect(screen.queryByText('common.error')).toBeNull();
  });

  it('shows the error message, not not-found, on a real fetch error', () => {
    userQuery.data = undefined;
    userQuery.isError = true;
    renderPage();
    expect(screen.getByText('common.error')).toBeTruthy();
    expect(screen.queryByText('common.not_found')).toBeNull();
  });
});
