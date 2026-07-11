import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import StudentsPage from '@/pages/StudentsPage';

// autodrive-6ef.18: whole row navigates to student detail; action buttons
// (edit/delete) stopPropagation so they don't also trigger navigation.

const STUDENT = {
  id: 's1',
  last_name: 'Karimov',
  first_name: 'Aziz',
  phone: '+998901234567',
  total_price: 3000000,
  course_type: 'tezkor',
  branch_id: 'b1',
  payment_method: 'naqd',
  debt: 0,
  has_document: true,
  registered_by: 'Nigora',
  result: 'oqimoqda',
  created_at: '2026-07-01T00:00:00.000Z',
  amount_paid: 3000000,
};

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: { role: 'owner', branch_id: null },
      isOwner: () => true,
    }),
}));

vi.mock('@/services/studentService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/studentService')>();
  return {
    ...actual,
    fetchAllStudents: vi.fn(),
    useStudentsPage: () => ({
      data: { data: [STUDENT], meta: { total: 1, totalPages: 1 } },
      isLoading: false,
    }),
    useCreateStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteStudent: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/services/operatorService', () => ({
  useOperators: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/components/ui/StudentModal', () => ({ default: () => null }));
vi.mock('@/components/ui/ImportStudentsModal', () => ({
  default: () => null,
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/students']}>
      <Routes>
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<div>student-detail-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('StudentsPage row navigation', () => {
  it('navigates to the detail page when a row is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Karimov'));
    expect(screen.getByText('student-detail-page')).toBeTruthy();
  });

  it('does not navigate when the edit button is clicked', () => {
    renderPage();
    // desktop table + mobile DataCard both render in jsdom (no real media
    // query), so there are two edit buttons — either is a valid check.
    fireEvent.click(screen.getAllByLabelText('common.edit')[0]);
    expect(screen.queryByText('student-detail-page')).toBeNull();
  });
});
