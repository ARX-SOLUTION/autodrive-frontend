import { screen, fireEvent, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SchedulePage from '@/features/schedule/pages/SchedulePage';
import { useWriteOptions } from '@/hooks/useWriteOptions';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'uz', changeLanguage: () => new Promise(() => {}) },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner' }, activeBranchId: null }),
}));

vi.mock('@/hooks/useWriteOptions', () => ({ useWriteOptions: vi.fn() }));

vi.mock('@/features/schedule/api/scheduleService', () => ({
  useScheduleTemplates: () => ({ data: [], isLoading: false }),
  useCalendarLessons: () => ({ data: [], isLoading: false }),
  useCreateTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGenerateLessons: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/groups/api/groupService', () => ({
  useGroups: () => ({ data: [], isLoading: false }),
  useGroup: () => ({ data: undefined }),
}));

vi.mock('@/features/attendance/api/attendanceService', () => ({
  useLessonById: () => ({ data: undefined, isLoading: false }),
  useBatchAttendance: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const branches = [
  { id: 'b1', name: 'Chilonzor' },
  { id: 'b2', name: 'Yunusobod' },
];

const mockOptions = (overrides: Record<string, unknown>) =>
  vi.mocked(useWriteOptions).mockReturnValue({
    scoped: true,
    branches,
    selectedBranchId: undefined,
    data: undefined,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useWriteOptions>);

const openTemplateDialog = async () => {
  fireEvent.mouseDown(
    screen.getByRole('tab', { name: 'schedule.tab_templates' }),
  );
  fireEvent.click(await screen.findByText('schedule.template'));
  return screen.findByRole('dialog');
};

describe('SchedulePage group lookup', () => {
  beforeEach(() => vi.mocked(useWriteOptions).mockReset());

  it('asks for a branch before group choices under All branches', async () => {
    mockOptions({});
    await renderWithRouter(<SchedulePage />);
    const dialog = await openTemplateDialog();

    expect(within(dialog).getByLabelText('common.branch')).toBeDefined();
    const groupTrigger = within(dialog)
      .getByText('schedule.group_placeholder')
      .closest('button');
    expect(groupTrigger).toBeDisabled();
    expect(within(dialog).queryByText('groups.not_found')).toBeNull();
  });

  it('shows a lookup failure with retry instead of an empty group list', async () => {
    const refetch = vi.fn();
    mockOptions({ selectedBranchId: 'b1', isError: true, refetch });
    await renderWithRouter(<SchedulePage />);
    fireEvent.click(screen.getByText('schedule.generate_lessons'));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByRole('alert')).toHaveTextContent('common.error');
    expect(within(dialog).queryByText('groups.not_found')).toBeNull();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'common.retry' }),
    );
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('says no groups only after a successful lookup for a chosen branch', async () => {
    mockOptions({ selectedBranchId: 'b1', data: { groups: [] } });
    await renderWithRouter(<SchedulePage />);
    const dialog = await openTemplateDialog();

    expect(within(dialog).getByText('groups.not_found')).toBeDefined();
    expect(within(dialog).queryByRole('alert')).toBeNull();
  });
});
