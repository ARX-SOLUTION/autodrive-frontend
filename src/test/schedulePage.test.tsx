import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import SchedulePage from '@/pages/SchedulePage';
import { useGenerateLessons } from '@/services/scheduleService';
import { ScheduleTemplate } from '@/types/schedule';

const mockTemplates: ScheduleTemplate[] = [
  {
    id: 'tpl-1',
    group_id: 'group-1',
    group_name: 'Group A',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '11:00',
    lesson_type: 'theory',
    is_active: true,
    teacher_name: 'Teacher A',
  },
];

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner' } }),
}));

vi.mock('@/services/scheduleService', () => ({
  useScheduleTemplates: () => ({ data: mockTemplates, isLoading: false }),
  useCalendarLessons: () => ({ data: [], isLoading: false }),
  useCreateTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGenerateLessons: vi.fn(),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [], isLoading: false }),
}));

describe('SchedulePage', () => {
  it('renders the templates list without crashing when templates exist', () => {
    vi.mocked(useGenerateLessons).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateLessons>);

    expect(() =>
      render(
        <MemoryRouter>
          <SchedulePage />
        </MemoryRouter>,
      ),
    ).not.toThrow();
    expect(screen.getByText('Group A')).toBeInTheDocument();
  });

  // Regression for autodrive-6cq.5.53: parseInt('') is NaN, and NaN<1 /
  // NaN>12 are both false, so the guard used to let a cleared weeks field
  // through and call generateLessons with weeks: NaN.
  it('rejects a cleared weeks field instead of sending NaN', () => {
    const mutateAsync = vi.fn();
    vi.mocked(useGenerateLessons).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateLessons>);

    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('schedule.generate_lessons'));
    // No htmlFor/id ties the <Label> to the <Input> here, so target the
    // one type="number" field in the dialog by role instead.
    const weeksInput = screen.getByRole('spinbutton');
    fireEvent.change(weeksInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('common.create'));

    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
