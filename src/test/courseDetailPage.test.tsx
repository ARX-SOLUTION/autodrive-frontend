import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, afterEach } from 'vitest';
import CourseDetailPage from '@/pages/CourseDetailPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// TDD for CourseDetailPage (Courses had no detail route -- create/edit modal
// only, violating the repo's "entity detail views: always a dedicated route
// + tabs" rule). Mirrors groupDetailPage.test.tsx's hoisted-fixture shape.

const courseQuery = vi.hoisted(() => ({
  data: undefined as Record<string, unknown> | undefined,
  isLoading: false,
  isError: false,
}));

const studentsQuery = vi.hoisted(() => ({
  data: [] as Record<string, unknown>[],
  isLoading: false,
  isError: false,
}));

const useStudentsSpy = vi.hoisted(() => vi.fn());

vi.mock('@/services/courseService', () => ({
  useCourse: () => courseQuery,
}));

vi.mock('@/services/studentService', () => ({
  useStudents: (...args: unknown[]) => {
    useStudentsSpy(...args);
    return studentsQuery;
  },
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [] }),
}));

const auth = vi.hoisted(() => ({
  role: 'manager' as string,
  branch_id: 'b1' as string | null,
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: auth.role, branch_id: auth.branch_id } }),
}));

// Heavy modal, not under test here (same precedent as groupDetailPage.test.tsx
// stubbing StudentModal).
vi.mock('@/pages/courses/CourseFormDialog', () => ({ default: () => null }));

const COURSE = {
  id: 'c1',
  name: 'Toyota kursi',
  branch_id: 'b1',
  branch_name: 'Yunusobod filiali',
  course_type: 'avto_maktab',
  price: 1500000,
  duration_days: 60,
  is_active: true,
  created_at: '2026-07-01T00:00:00.000Z',
};
courseQuery.data = COURSE;

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <CourseDetailPage />
    </QueryClientProvider>,
    { initialEntry: '/courses/c1', routePattern: '/courses/$id' },
  );
};

afterEach(() => {
  courseQuery.data = COURSE;
  courseQuery.isLoading = false;
  courseQuery.isError = false;
  studentsQuery.data = [];
  studentsQuery.isLoading = false;
  studentsQuery.isError = false;
  auth.role = 'manager';
  auth.branch_id = 'b1';
  useStudentsSpy.mockClear();
  cleanup();
});

describe('CourseDetailPage error vs not-found', () => {
  it('shows the not-found message when the course genuinely does not exist', async () => {
    courseQuery.data = undefined;
    courseQuery.isError = false;
    await renderPage();
    expect(screen.getByText('common.not_found')).toBeTruthy();
    expect(screen.queryByText('common.error')).toBeNull();
  });

  it('shows the error message, not not-found, on a real fetch error', async () => {
    courseQuery.data = undefined;
    courseQuery.isError = true;
    await renderPage();
    expect(screen.getByText('common.error')).toBeTruthy();
    expect(screen.queryByText('common.not_found')).toBeNull();
  });
});

describe("CourseDetailPage Ma'lumot (info) tab", () => {
  it('renders the course fields via useCourse', async () => {
    await renderPage();
    expect(screen.getAllByText('Toyota kursi').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Yunusobod filiali').length).toBeGreaterThan(0);
  });
});

describe('CourseDetailPage Talabalar (students) tab', () => {
  it('fetches the roster filtered by this course id', async () => {
    await renderPage();
    const lastCall = useStudentsSpy.mock.calls.at(-1) as unknown[];
    expect(lastCall[5]).toMatchObject({ courseId: 'c1' });
  });

  it('renders the enrolled-student roster and navigates to the student detail page on click', async () => {
    studentsQuery.data = [
      {
        id: 's1',
        last_name: 'Karimov',
        first_name: 'Aziz',
        group_name: 'Alpha guruh',
        status: 'active',
      },
    ];
    const { router } = await renderPage();
    fireEvent.mouseDown(screen.getByText('students.title'));
    expect(screen.getByText('Karimov Aziz')).toBeTruthy();

    fireEvent.click(screen.getByText('Karimov Aziz'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/students/s1'),
    );
  });

  it('shows the empty state when the course has no enrolled students', async () => {
    studentsQuery.data = [];
    await renderPage();
    fireEvent.mouseDown(screen.getByText('students.title'));
    expect(screen.getByText('students.not_found')).toBeTruthy();
  });

  it('never renders a debt/payment amount in the roster', async () => {
    studentsQuery.data = [
      {
        id: 's1',
        last_name: 'Karimov',
        first_name: 'Aziz',
        group_name: 'Alpha guruh',
        status: 'active',
        debt: 434343,
        total_price: 767676,
      },
    ];
    await renderPage();
    fireEvent.mouseDown(screen.getByText('students.title'));
    // Assert the real amounts are absent — not a translation key the roster
    // never renders. This is the actual teacher/payment-hiding guard: if the
    // roster leaked formatMoney(s.debt), "434 343" would appear here.
    expect(screen.queryByText(/434[\s,]?343/)).toBeNull();
    expect(screen.queryByText(/767[\s,]?676/)).toBeNull();
  });
});
