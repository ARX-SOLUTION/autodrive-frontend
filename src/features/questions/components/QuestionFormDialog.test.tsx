import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { QuestionFormDialog } from './QuestionFormDialog';
import type { Question } from '@/features/questions/types';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/questions/api/questionService', () => ({
  useCreateQuestion: () => ({ mutate, isPending: false }),
  useUpdateQuestionDraft: () => ({ mutate, isPending: false }),
}));
afterEach(() => {
  cleanup();
  mutate.mockClear();
});

const locales = ['uz', 'ru'].map((locale) => ({
  locale,
  stem: `${locale} question`,
  explanation: `${locale} explanation`,
  options: [
    { option_key: 'A', text: `${locale} A`, sort_order: 0 },
    { option_key: 'B', text: `${locale} B`, sort_order: 1 },
  ],
}));
const question = {
  id: 'q1',
  topic: 'general_rules',
  branch_id: 'b1',
  draft_version: { correct_option_key: 'A', locales },
} as Question;
const show = () =>
  render(
    <QuestionFormDialog
      open
      question={question}
      branches={[]}
      onClose={vi.fn()}
    />,
  );

it('preserves untouched translations when saving a question', () => {
  show();
  fireEvent.change(screen.getByLabelText('questions.stem'), {
    target: { value: 'updated uz' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
  expect(mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      locales: expect.arrayContaining([
        expect.objectContaining({ locale: 'uz', stem: 'updated uz' }),
        expect.objectContaining({ locale: 'ru', stem: 'ru question' }),
      ]),
    }),
    expect.anything(),
  );
});

it('loads each translation and retains edits when switching languages', () => {
  show();
  fireEvent.change(screen.getByLabelText('questions.stem'), {
    target: { value: 'updated uz' },
  });
  fireEvent.change(screen.getByLabelText('questions.locale'), {
    target: { value: 'ru' },
  });
  expect(screen.getByLabelText('questions.stem')).toHaveValue('ru question');
  fireEvent.change(screen.getByLabelText('questions.locale'), {
    target: { value: 'uz' },
  });
  expect(screen.getByLabelText('questions.stem')).toHaveValue('updated uz');
});

it('opens the actual existing language instead of relabeling Russian as Uzbek', () => {
  const russianOnly = {
    ...question,
    draft_version: {
      ...question.draft_version!,
      locales: [question.draft_version!.locales[1]],
    },
  };
  render(
    <QuestionFormDialog
      open
      question={russianOnly}
      branches={[]}
      onClose={vi.fn()}
    />,
  );
  expect(screen.getByLabelText('questions.locale')).toHaveValue('ru');
  fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
  expect(mutate.mock.calls[0][0].locales).toHaveLength(1);
  expect(mutate.mock.calls[0][0].locales[0].locale).toBe('ru');
});
