import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TrainingEnrollmentDetailPage from '@/pages/TrainingEnrollmentDetailPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const actions = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@/hooks/useCan', () => ({
  useCan: (cap: string) => cap === 'scheduleDrivingSessions',
}));
vi.mock('@/components/ui/date-time-picker', () => ({
  DateTimePicker: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange: (value: string) => void;
  }) => (
    <input
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
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
      status: 'active',
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useTrainingProgram: () => ({ data: { id: 'p1', name: 'B practice' } }),
}));
vi.mock('@/services/drivingSessionService', () => ({
  useDrivingSummary: () => ({
    data: {
      required_minutes: 120,
      planned_minutes: 0,
      entered_minutes: 0,
      approved_minutes: 0,
      exception_minutes: 0,
      remaining_minutes: 120,
    },
  }),
  useDrivingSessionsForReport: () => ({ data: [] }),
  useCreateDrivingSession: () => ({ mutate: actions.create, isPending: false }),
  usePracticeInstructors: () => ({
    data: [{ id: 't1', name: 'Practice Instructor' }],
  }),
}));
vi.mock('@/services/vehicleService', () => ({
  useVehiclesPage: () => ({
    data: {
      data: [
        {
          id: 'v1',
          plate_number: '01 A 123 BC',
          make: 'Chevrolet',
          model: 'Cobalt',
          categories: ['B'],
          available_for_booking: true,
        },
        {
          id: 'v2',
          plate_number: '01 A 999 BC',
          make: 'Chevrolet',
          model: 'Cobalt',
          categories: ['B'],
          available_for_booking: false,
        },
      ],
    },
  }),
}));

afterEach(() => {
  actions.create.mockClear();
  cleanup();
});

describe('scheduling from an enrollment', () => {
  it('offers only available cars and posts the exact student-car-instructor interval', async () => {
    await renderWithRouter(<TrainingEnrollmentDetailPage />, {
      initialEntry: '/training-enrollments/e1',
      routePattern: '/training-enrollments/$id',
    });
    fireEvent.click(screen.getByRole('button', { name: 'driving.schedule' }));
    const vehicle = screen.getByRole('combobox', { name: 'driving.vehicle' });
    expect(vehicle.querySelector('option[value="v1"]')).toBeTruthy();
    expect(vehicle.querySelector('option[value="v2"]')).toBeNull();
    fireEvent.change(vehicle, { target: { value: 'v1' } });
    fireEvent.change(
      screen.getByRole('combobox', { name: 'driving.instructor' }),
      { target: { value: 't1' } },
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: 'driving.starts_at' }),
      { target: { value: '2026-09-20T07:00:00Z' } },
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'driving.ends_at' }), {
      target: { value: '2026-09-20T08:00:00Z' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'driving.schedule',
      }),
    );
    expect(actions.create).toHaveBeenCalledWith(
      {
        enrollment_id: 'e1',
        vehicle_id: 'v1',
        instructor_id: 't1',
        starts_at: '2026-09-20T07:00:00Z',
        ends_at: '2026-09-20T08:00:00Z',
      },
      expect.any(Object),
    );
  });
});
