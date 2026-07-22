import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import CoursesPage from '@/pages/CoursesPage';
import type { Course } from '@/types/course';

// TDD for the CoursesPage -> CourseDetailPage row navigation (Course entity
// detail views were modal-only, violating the repo's own "row/card that
// opens a detail view navigates, it does not open a modal" rule). Mirrors
// the branches.test.tsx "navigates to the detail page when a card is
// clicked, but not via the edit button" precedent.

const mockMutate = vi.fn();

vi.mock('@/services/courseService', () => ({
  useCourses: () => ({ data: COURSES, isLoading: false, isFetching: false }),
  useCreateCourse: () => ({ mutate: mockMutate, isPending: false }),
  useUpdateCourse: () => ({ mutate: mockMutate, isPending: false }),
  useDeleteCourse: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({
    data: [{ id: 'b1', name: 'Yunusobod filiali' }],
  }),
}));

const COURSES: Course[] = [
  {
    id: 'c1',
    name: 'Toyota kursi',
    branch_id: 'b1',
    branch_name: 'Yunusobod filiali',
    course_type: 'avto_maktab',
    price: 1500000,
    duration_days: 60,
    is_active: true,
    created_at: '2026-07-01T00:00:00.000Z',
  },
];

afterEach(cleanup);

describe('CoursesPage row navigation', () => {
  it('navigates to the course detail page when a row is clicked, but not via the edit/delete buttons', () => {
    render(
      <MemoryRouter initialEntries={['/courses']}>
        <Routes>
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<div>course-detail-page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Every edit/delete button — desktop <tr> AND mobile card — must
    // stopPropagation so it never also navigates to the detail page.
    screen
      .getAllByLabelText('common.edit')
      .forEach((btn) => fireEvent.click(btn));
    screen
      .getAllByLabelText('common.delete')
      .forEach((btn) => fireEvent.click(btn));
    expect(screen.queryByText('course-detail-page')).toBeNull();

    fireEvent.click(screen.getAllByText('Toyota kursi')[0]);
    expect(screen.getByText('course-detail-page')).toBeTruthy();
  });
});
