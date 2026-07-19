import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TeacherDashboard from '@/pages/dashboard/TeacherDashboard';
import { formatMoney } from '@/lib/money';
import type { Lesson } from '@/types/attendance';
import type { Student } from '@/types/student';

// autodrive-vh0.6: teacher dashboard redesign. Role-parameterized authStore
// mock + real permissions matrix precedent: sidebarTeacherNav.test.tsx,
// studentsPaymentVisibility.test.tsx.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

// Dates built off the REAL current Tashkent calendar day (not fake timers,
// not a hardcoded date) so this test never goes stale -- same anti-staleness
// approach as companyRevenueDashboard.test.tsx's todayInUz() mirror helper.
const pad = (n: number) => String(n).padStart(2, '0');
const uzDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tashkent',
});
const [ty, tm, td] = uzDateFormatter.format(new Date()).split('-').map(Number);
// Noon UTC of "today" in Tashkent -- Asia/Tashkent has no DST, and noon UTC
// is always mid-afternoon there, so shifting by whole days never crosses a
// calendar boundary unexpectedly.
const todayNoonUTC = Date.UTC(ty, tm - 1, td, 12, 0, 0);
const ymdAtOffset = (days: number) =>
  new Date(todayNoonUTC + days * 86_400_000).toISOString().slice(0, 10);
const isoAt = (days: number, hourUZ: number) =>
  `${ymdAtOffset(days)}T${pad(hourUZ)}:00:00+05:00`;

const baseLesson: Omit<Lesson, 'id' | 'title' | 'date' | 'group_name'> = {
  lesson_type: 'theory',
  group_id: 'g1',
  branch_id: 'b1',
  created_by_id: 'teacher-1',
  created_at: isoAt(-10, 8),
  attendance: [],
};

const LESSONS: Lesson[] = [
  {
    ...baseLesson,
    id: 'l-plus3',
    title: 'Day+3 lesson',
    group_name: 'Group C',
    date: isoAt(3, 9),
  },
  {
    ...baseLesson,
    id: 'l-past',
    title: 'Yesterday lesson',
    group_name: 'Group A',
    date: isoAt(-1, 10),
  },
  {
    ...baseLesson,
    id: 'l-tomorrow',
    title: 'Tomorrow lesson',
    group_name: 'Group A',
    date: isoAt(1, 9),
  },
  {
    ...baseLesson,
    id: 'l-today-late',
    title: 'Afternoon practice',
    group_name: 'Group B',
    date: isoAt(0, 16),
  },
  {
    ...baseLesson,
    id: 'l-plus4',
    title: 'Day+4 lesson (should be cut)',
    group_name: 'Group C',
    date: isoAt(4, 9),
  },
  {
    ...baseLesson,
    id: 'l-today-early',
    title: 'Morning theory',
    group_name: 'Group A',
    date: isoAt(0, 6),
  },
  {
    ...baseLesson,
    id: 'l-plus2',
    title: 'Day+2 lesson',
    group_name: 'Group C',
    date: isoAt(2, 9),
  },
];

const baseStudent: Omit<Student, 'id' | 'has_debt'> = {
  last_name: 'Student',
  first_name: 'Test',
  phone: '+998900000000',
  total_price: 10_000_000,
  course_type: 'tezkor',
  branch_id: 'b1',
  payment_method: 'naqd',
  debt: 5_000_000,
  has_document: true,
  result: 'oqimoqda',
  created_at: '2026-01-01T00:00:00.000Z',
};

const STUDENTS: Student[] = [
  { ...baseStudent, id: 's1', has_debt: true },
  { ...baseStudent, id: 's2', has_debt: true },
  { ...baseStudent, id: 's3', has_debt: true },
  { ...baseStudent, id: 's4', has_debt: false },
  { ...baseStudent, id: 's5', has_debt: false },
];

const state = vi.hoisted(() => ({
  analytics: {
    data: {
      active_groups: 6,
      total_students: 15,
      result_stats: { oqimoqda: 5, topshirdi: 4, yiqildi: 3 },
    },
    isLoading: false,
  },
  lessons: {
    data: { data: [] as Lesson[], total: 0, page: 1, limit: 100 },
    isLoading: false,
  },
  students: { data: [] as Student[], isLoading: false },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: { name: 'Malika Yusupova', role: 'teacher', branch_id: 'b1' },
    }),
}));
vi.mock('@/services/dashboardService', () => ({
  useTeacherAnalytics: () => state.analytics,
}));
vi.mock('@/services/attendanceService', () => ({
  useLessons: () => state.lessons,
}));
vi.mock('@/services/studentService', () => ({
  useStudents: () => state.students,
}));

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <TeacherDashboard />
    </MemoryRouter>,
  );

afterEach(() => {
  state.analytics = {
    data: {
      active_groups: 6,
      total_students: 15,
      result_stats: { oqimoqda: 5, topshirdi: 4, yiqildi: 3 },
    },
    isLoading: false,
  };
  state.lessons = {
    data: { data: [], total: 0, page: 1, limit: 100 },
    isLoading: false,
  };
  state.students = { data: [], isLoading: false };
  vi.clearAllMocks();
  cleanup();
});

describe('TeacherDashboard KPIs (autodrive-vh0.6)', () => {
  it('renders the 4 scoped KPIs from mocked data', () => {
    state.lessons.data = {
      data: LESSONS,
      total: LESSONS.length,
      page: 1,
      limit: 100,
    };
    state.students.data = STUDENTS;
    renderDashboard();

    expect(
      screen.getByText('dashboard.teacher.kpi_my_groups'),
    ).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(
      screen.getByText('dashboard.teacher.kpi_my_students'),
    ).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(
      screen.getByText('dashboard.teacher.kpi_owing_students'),
    ).toBeInTheDocument();
    // 3 of 5 fixture students have has_debt: true.
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(
      screen.getByText('dashboard.teacher.kpi_today_lessons'),
    ).toBeInTheDocument();
    // today-early + today-late = 2 lessons dated today.
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders no payment amount anywhere, only the owing COUNT', () => {
    state.lessons.data = {
      data: LESSONS,
      total: LESSONS.length,
      page: 1,
      limit: 100,
    };
    state.students.data = STUDENTS;
    renderDashboard();

    expect(screen.queryByText(formatMoney(5_000_000))).toBeNull();
    expect(screen.queryByText(formatMoney(10_000_000))).toBeNull();
    expect(
      screen.queryByText((content) => content.replace(/\D/g, '') === '5000000'),
    ).toBeNull();
    expect(
      screen.queryByText(
        (content) => content.replace(/\D/g, '') === '10000000',
      ),
    ).toBeNull();
    // The count itself must still render.
    expect(
      screen.getByText('dashboard.teacher.kpi_owing_students'),
    ).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('TeacherDashboard upcoming lessons (autodrive-vh0.6)', () => {
  it('renders the next 5 lessons soonest-first and caps at 5', () => {
    state.lessons.data = {
      data: LESSONS,
      total: LESSONS.length,
      page: 1,
      limit: 100,
    };
    state.students.data = STUDENTS;
    renderDashboard();

    const titles = [
      'Morning theory',
      'Afternoon practice',
      'Tomorrow lesson',
      'Day+2 lesson',
      'Day+3 lesson',
    ];
    const positions = titles.map((title) => {
      const el = screen.getByText(title);
      return Array.from(document.body.querySelectorAll('*')).indexOf(el);
    });
    // Strictly ascending DOM order == soonest-first render order.
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
    // Past lesson excluded entirely.
    expect(screen.queryByText('Yesterday lesson')).toBeNull();
    // 6th-soonest upcoming lesson excluded by the ~5 cap.
    expect(screen.queryByText('Day+4 lesson (should be cut)')).toBeNull();
  });

  it('a row navigates to the attendance flow', () => {
    state.lessons.data = {
      data: LESSONS,
      total: LESSONS.length,
      page: 1,
      limit: 100,
    };
    state.students.data = STUDENTS;
    const DestinationProbe = () => {
      const location = useLocation();
      return <output data-testid="destination">{location.pathname}</output>;
    };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<TeacherDashboard />} />
          <Route path="/attendance" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('Morning theory'));
    expect(screen.getByTestId('destination')).toHaveTextContent('/attendance');
  });
});

describe('TeacherDashboard empty states (autodrive-vh0.6)', () => {
  it('renders a no-groups empty state and no KPI cards when active_groups is 0', () => {
    state.analytics.data = {
      active_groups: 0,
      total_students: 0,
      result_stats: { oqimoqda: 0, topshirdi: 0, yiqildi: 0 },
    };
    renderDashboard();

    expect(
      screen.getByText('dashboard.teacher.no_groups_title'),
    ).toBeInTheDocument();
    expect(screen.queryByText('dashboard.teacher.kpi_my_groups')).toBeNull();
  });

  it('renders a no-upcoming-lessons empty state when groups exist but no lessons are scheduled', () => {
    state.lessons.data = { data: [], total: 0, page: 1, limit: 100 };
    state.students.data = STUDENTS;
    renderDashboard();

    expect(
      screen.getByText('dashboard.teacher.upcoming_empty_title'),
    ).toBeInTheDocument();
    // KPI row still renders -- this teacher does have groups.
    expect(
      screen.getByText('dashboard.teacher.kpi_my_groups'),
    ).toBeInTheDocument();
  });
});
