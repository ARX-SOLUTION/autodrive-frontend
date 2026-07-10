import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import SchedulePage from '@/pages/SchedulePage';
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
  useGenerateLessons: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [], isLoading: false }),
}));

describe('SchedulePage', () => {
  it('renders the templates list without crashing when templates exist', () => {
    expect(() => render(<SchedulePage />)).not.toThrow();
    expect(screen.getByText('Group A')).toBeInTheDocument();
  });
});
