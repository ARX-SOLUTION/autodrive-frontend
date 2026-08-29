import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoursesGrid } from '@/pages/courses/CoursesGrid';
import type { Course } from '@/types/course';

const courses: Course[] = [
  {
    id: 'course-z',
    name: 'Zebra kursi',
    branch_id: 'branch-1',
    branch_name: 'Yunusobod',
    course_type: 'tezkor',
    price: 1_000_000,
    duration_days: 30,
    is_active: true,
    created_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'course-a',
    name: 'Alpha kursi',
    branch_id: 'branch-1',
    branch_name: 'Yunusobod',
    course_type: 'avto_maktab',
    price: 2_000_000,
    duration_days: 60,
    is_active: true,
    created_at: '2026-08-02T00:00:00.000Z',
  },
];

describe('CoursesGrid client sorting', () => {
  it('keeps endpoint order initially, then sorts the complete returned list locally', () => {
    render(
      <CoursesGrid
        courses={courses}
        isLoading={false}
        isFetching={false}
        onNavigate={vi.fn()}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const table = screen.getByRole('table', { name: 'courses.title' });
    let rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Zebra kursi');
    expect(rows[1]).toHaveTextContent('Alpha kursi');

    fireEvent.click(
      within(table).getByRole('button', { name: 'courses.name' }),
    );

    rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Alpha kursi');
    expect(rows[1]).toHaveTextContent('Zebra kursi');
  });
});
