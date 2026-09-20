import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DrivingSessionDetailPage from '@/pages/DrivingSessionDetailPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const access = vi.hoisted(() => ({
  role: 'manager',
  status: 'submitted',
  approve: vi.fn(),
  submit: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      user: {
        id: access.role === 'teacher' ? 't1' : 'm1',
        role: access.role,
        name: 'Manager',
      },
    }),
}));
vi.mock('@/hooks/useCan', () => ({
  useCan: (cap: string) =>
    (cap === 'reviewDrivingSessions' && access.role === 'manager') ||
    (cap === 'submitDrivingSession' && access.role === 'teacher'),
}));
vi.mock('@/services/drivingSessionService', () => ({
  useDrivingSession: () => ({
    data: {
      id: 'd1',
      enrollment_id: 'e1',
      student_id: 's1',
      student: { id: 's1', first_name: 'Ali', last_name: 'Valiyev' },
      vehicle_id: 'v1',
      vehicle: { id: 'v1', plate_number: '01 A 123 BC' },
      instructor_id: 't1',
      instructor: { id: 't1', name: 'Test Instructor' },
      starts_at: '2026-09-20T07:00:00Z',
      ends_at: '2026-09-20T08:00:00Z',
      status: access.status,
      planned_minutes: 60,
      actual_minutes: 40,
      approved_minutes: 0,
      gps_exception_reason: null,
      rejection_reason: null,
      cancellation_reason: null,
      last_correction_reason: null,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useSubmitDrivingSession: () => ({ mutate: access.submit, isPending: false }),
  useApproveDrivingSession: () => ({
    mutate: access.approve,
    isPending: false,
  }),
  useRejectDrivingSession: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelDrivingSession: () => ({ mutate: vi.fn(), isPending: false }),
  useCorrectDrivingSession: () => ({ mutate: vi.fn(), isPending: false }),
}));

beforeEach(() => {
  access.role = 'manager';
  access.status = 'submitted';
  access.approve.mockClear();
  access.submit.mockClear();
});
afterEach(cleanup);

describe('DrivingSessionDetailPage', () => {
  it('identifies the instructor and requires an explicit GPS exception before manager approval', async () => {
    await renderWithRouter(<DrivingSessionDetailPage />, {
      initialEntry: '/driving-sessions/d1',
      routePattern: '/driving-sessions/$id',
    });
    expect(screen.getByText('Test Instructor')).toBeTruthy();
    expect(screen.getByText('01 A 123 BC')).toBeTruthy();
    expect(screen.getByText('0 driving.minutes')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'driving.actions.approve' }),
    );
    const confirm = screen.getByRole('button', { name: 'common.confirm' });
    expect(confirm).toBeDisabled();
    fireEvent.change(
      screen.getByRole('textbox', { name: 'driving.gps_exception_reason' }),
      { target: { value: 'Tracker offline' } },
    );
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    expect(access.approve).toHaveBeenCalledWith(
      { id: 'd1', gps_exception_reason: 'Tracker offline' },
      expect.any(Object),
    );
  });

  it('does not offer an owner the manager-only approval action', async () => {
    access.role = 'owner';
    await renderWithRouter(<DrivingSessionDetailPage />, {
      initialEntry: '/driving-sessions/d1',
      routePattern: '/driving-sessions/$id',
    });
    expect(
      screen.queryByRole('button', { name: 'driving.actions.approve' }),
    ).toBeNull();
  });

  it('lets only the assigned instructor submit actual minutes', async () => {
    access.role = 'teacher';
    access.status = 'planned';
    await renderWithRouter(<DrivingSessionDetailPage />, {
      initialEntry: '/driving-sessions/d1',
      routePattern: '/driving-sessions/$id',
    });
    expect(
      screen.queryByRole('button', { name: 'driving.actions.approve' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'driving.actions.submit' }),
    );
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'driving.actual_minutes' }),
      { target: { value: '45' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
    expect(access.submit).toHaveBeenCalledWith(
      { id: 'd1', actual_minutes: 45 },
      expect.any(Object),
    );
  });
});
