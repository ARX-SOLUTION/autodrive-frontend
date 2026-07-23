import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '@/pages/DashboardPage';

// autodrive-vh0.6: TeacherDashboard was extracted out of DashboardPage.tsx
// into its own module (dashboard/TeacherDashboard.tsx). This locks down that
// DashboardPage's role router still picks the right dashboard per role after
// the extraction -- LegacyMainDashboard/CompanyRevenueDashboard's own
// internals are untouched and out of scope here.

let user: Record<string, unknown> = { name: 'Test', role: 'owner' };

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user }),
}));
vi.mock('@/pages/dashboard/TeacherDashboard', () => ({
  default: () => <div data-testid="teacher-dashboard-marker" />,
}));
vi.mock('@/pages/dashboard/CompanyRevenueDashboard', () => ({
  default: () => <div data-testid="company-revenue-dashboard-marker" />,
}));

afterEach(() => {
  user = { name: 'Test', role: 'owner' };
  vi.clearAllMocks();
  cleanup();
});

const renderDashboardPage = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <DashboardPage />
    </MemoryRouter>,
  );

describe('DashboardPage role routing (autodrive-vh0.6 regression)', () => {
  // The sub-dashboards are now React.lazy, so the marker appears after the
  // Suspense boundary resolves — findBy* awaits that.
  it('routes a teacher to TeacherDashboard', async () => {
    user = { name: 'Teacher', role: 'teacher' };
    renderDashboardPage();
    expect(
      await screen.findByTestId('teacher-dashboard-marker'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('company-revenue-dashboard-marker')).toBeNull();
  });

  it('routes a non-teacher role to CompanyRevenueDashboard, not TeacherDashboard', async () => {
    user = { name: 'Owner', role: 'owner' };
    renderDashboardPage();
    expect(
      await screen.findByTestId('company-revenue-dashboard-marker'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('teacher-dashboard-marker')).toBeNull();
  });
});
