import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import { TestTemplateFormDialog } from './TestTemplateFormDialog';
import { useWriteOptions } from '@/hooks/useWriteOptions';
import type { TestTemplate } from '@/features/school-tests/types';

const mutate = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useWriteOptions', () => ({ useWriteOptions: vi.fn() }));
vi.mock('@/features/school-tests/api/schoolTestService', () => ({
  useCreateTestTemplate: () => ({ mutate, isPending: false }),
  useUpdateTestTemplate: () => ({ mutate, isPending: false }),
}));
vi.mock('@/features/questions/api/questionService', () => ({
  useQuestionsAvailableForTests: () => ({ data: undefined }),
}));

const template = {
  id: 'tpl-1',
  branch_id: 'b1',
  title: 'Haftalik test',
  description: null,
  question_count: 1,
  time_limit_seconds: 1200,
  passing_threshold_percent: 80,
  retry_limit: 1,
  shuffle_questions: true,
  shuffle_options: false,
  answer_review_timing: 'after_submit',
  questions: [{ question_id: 'q-kept-12345678', sort_order: 1 }],
} as unknown as TestTemplate;

const mockOptions = (overrides: Record<string, unknown>) =>
  vi.mocked(useWriteOptions).mockReturnValue({
    scoped: true,
    branches: [{ id: 'b1', name: 'Chilonzor' }],
    selectedBranchId: 'b1',
    data: { questions: [] },
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useWriteOptions>);

beforeEach(() => {
  mutate.mockClear();
  vi.mocked(useWriteOptions).mockReset();
});
afterEach(cleanup);

const renderDialog = (tpl: TestTemplate | null = null) =>
  render(
    <TestTemplateFormDialog
      open
      template={tpl}
      branches={[]}
      onClose={vi.fn()}
    />,
  );

describe('TestTemplateFormDialog question lookup states', () => {
  it('asks for a branch before saying there are no questions', () => {
    mockOptions({ selectedBranchId: '', data: undefined });
    renderDialog();

    expect(screen.getByText('common.select_branch')).toBeInTheDocument();
    expect(
      screen.queryByText('school_tests.no_available_questions'),
    ).toBeNull();
  });

  it('shows loading and failure apart from zero eligible questions', () => {
    const refetch = vi.fn();
    mockOptions({ isFetching: true, data: undefined });
    const { rerender } = renderDialog();
    expect(screen.getByRole('status')).toHaveTextContent('common.loading');

    mockOptions({ isError: true, data: undefined, refetch });
    rerender(
      <TestTemplateFormDialog
        open
        template={null}
        branches={[]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('common.error');
    expect(
      screen.queryByText('school_tests.no_available_questions'),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refetch).toHaveBeenCalledOnce();

    mockOptions({});
    rerender(
      <TestTemplateFormDialog
        open
        template={null}
        branches={[]}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText('school_tests.no_available_questions'),
    ).toBeInTheDocument();
  });

  it('keeps already chosen questions visible and saved when the lookup fails', () => {
    mockOptions({ isError: true, data: undefined });
    renderDialog(template);

    const kept = screen.getByRole('checkbox', {
      name: 'school_tests.selected_question_fallback',
    });
    expect(kept).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ question_ids: ['q-kept-12345678'] }),
      expect.any(Object),
    );
  });
});
