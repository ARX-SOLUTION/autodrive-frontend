import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TrainingEnrollmentDetailPage from '@/pages/TrainingEnrollmentDetailPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const access = vi.hoisted(() => ({ canViewSummary: true, summaryId: vi.fn() }));
vi.mock('@/hooks/useCan', () => ({
  useCan: (cap: string) =>
    cap === 'viewDrivingSummary' && access.canViewSummary,
}));
vi.mock('@/services/trainingService', () => ({
  useTrainingEnrollment: () => ({
    data: {
      id: 'e1',
      branch_id: 'b1',
      program_id: 'p1',
      student: { id: 's1', first_name: 'Ali', last_name: 'Valiyev' },
      category: 'B',
      required_minutes: 120,
      approved_minutes: 0,
      remaining_minutes: 120,
      status: 'active',
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useTrainingProgram: () => ({ data: { id: 'p1', name: 'B practice' } }),
}));
vi.mock('@/services/drivingSessionService', () => ({
  useDrivingSummary: (id: string) => {
    access.summaryId(id);
    return {
      data: {
        enrollment_id: 'e1',
        student_id: 's1',
        required_minutes: 120,
        planned_minutes: 60,
        entered_minutes: 40,
        approved_minutes: 0,
        exception_minutes: 0,
        remaining_minutes: 120,
      },
      isError: false,
    };
  },
  useDrivingSessionsForReport: () => ({
    data: [
      {
        id: 'd1',
        starts_at: '2026-09-20T07:00:00Z',
        status: 'submitted',
        planned_minutes: 60,
        actual_minutes: 40,
        approved_minutes: 0,
        gps_exception_reason: null,
        vehicle: { id: 'v1', plate_number: '01 A 123 BC' },
        instructor: { id: 't1', name: 'Test Instructor' },
      },
    ],
    isError: false,
  }),
}));

afterEach(() => {
  access.canViewSummary = true;
  access.summaryId.mockClear();
  cleanup();
});

describe('learner practical driving report', () => {
  it('separates entered from approved minutes and prints car/instructor attribution', async () => {
    await renderWithRouter(<TrainingEnrollmentDetailPage />, {
      initialEntry: '/training-enrollments/e1',
      routePattern: '/training-enrollments/$id',
    });
    const report = screen.getByRole('region', { name: 'driving.report_title' });
    expect(within(report).getByText(/Valiyev Ali/)).toBeTruthy();
    expect(within(report).getByText('40 driving.minutes')).toBeTruthy();
    expect(
      within(report).getAllByText('0 driving.minutes').length,
    ).toBeGreaterThan(0);
    expect(within(report).getByText('01 A 123 BC')).toBeTruthy();
    expect(within(report).getByText('Test Instructor')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'driving.print_report' }),
    ).not.toBeDisabled();
    expect(
      within(report).getByText('driving.instructor_confirmation_notice'),
    ).toBeTruthy();
  });

  it('does not request a full balance for a teacher who may only see assigned sessions', async () => {
    access.canViewSummary = false;
    await renderWithRouter(<TrainingEnrollmentDetailPage />, {
      initialEntry: '/training-enrollments/e1',
      routePattern: '/training-enrollments/$id',
    });
    expect(access.summaryId).toHaveBeenCalledWith('');
    expect(
      screen.queryByRole('button', { name: 'driving.print_report' }),
    ).toBeNull();
    expect(screen.getByText('driving.report_staff_only')).toBeTruthy();
  });
});
