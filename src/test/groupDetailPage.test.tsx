import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, afterEach } from 'vitest';
import GroupDetailPage from '@/pages/GroupDetailPage';

// Controllable per-test fixture for isLoading/isError/data-not-found split
// below (autodrive-d4j). Starts undefined (vi.hoisted runs before GROUP is
// initialized) -- backfilled to GROUP right after the const, same pattern as
// branch.current in branchDetailPage.test.tsx.
const groupQuery = vi.hoisted(() => ({
  data: undefined as Record<string, unknown> | undefined,
  isLoading: false,
  isError: false,
}));

vi.mock('@/services/groupService', () => ({
  useGroup: () => groupQuery,
}));

vi.mock('@/services/operatorService', () => ({
  useOperators: () => ({ data: [] }),
}));

vi.mock('@/services/studentService', () => ({
  useUpdateStudent: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Heavy modal, not under test here.
vi.mock('@/components/ui/StudentModal', () => ({ default: () => null }));

const GROUP = {
  id: 'g1',
  name: 'B-1',
  branch_id: 'b1',
  branch_name: 'Yunusobod',
  course_type: 'tezkor',
  active_students: 5,
  is_active: true,
  created_at: '2026-07-01T00:00:00.000Z',
  teacher_id: 't1',
  teacher_name: 'Aziz',
  schedule: [],
  students: [],
};
groupQuery.data = GROUP;

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/groups/g1']}>
        <Routes>
          <Route path="/groups/:id" element={<GroupDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  groupQuery.data = GROUP;
  groupQuery.isLoading = false;
  groupQuery.isError = false;
  cleanup();
});

// autodrive-d4j: a real fetch error must not read the same as a genuine
// not-found -- distinct title/icon per EntityDetailShell's isError/
// errorTitle/errorIcon props, same split AuditDetailPage already does.
describe('GroupDetailPage error vs not-found (autodrive-d4j)', () => {
  it('shows the not-found message when the group genuinely does not exist', () => {
    groupQuery.data = undefined;
    groupQuery.isError = false;
    renderPage();
    expect(screen.getByText('common.not_found')).toBeTruthy();
    expect(screen.queryByText('common.error')).toBeNull();
  });

  it('shows the error message, not not-found, on a real fetch error', () => {
    groupQuery.data = undefined;
    groupQuery.isError = true;
    renderPage();
    expect(screen.getByText('common.error')).toBeTruthy();
    expect(screen.queryByText('common.not_found')).toBeNull();
  });
});
