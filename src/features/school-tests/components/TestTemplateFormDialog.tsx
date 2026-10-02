import { useWriteOptions } from '@/hooks/useWriteOptions';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { extractErrorMessage } from '@/lib/errors';
import {
  useCreateTestTemplate,
  useUpdateTestTemplate,
} from '@/features/school-tests/api/schoolTestService';
import { useQuestionsAvailableForTests } from '@/features/questions/api/questionService';
import type {
  AnswerReviewTiming,
  TestTemplate,
} from '@/features/school-tests/types';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export const TestTemplateFormDialog = ({
  open,
  template,
  branches,
  defaultBranchId,
  onClose,
}: {
  open: boolean;
  template: TestTemplate | null;
  branches: Array<{ id: string; name: string }>;
  defaultBranchId?: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const create = useCreateTestTemplate();
  const update = useUpdateTestTemplate();
  const available = useQuestionsAvailableForTests({ limit: 100 }, open);

  const [branchId, setBranchId] = useState(
    template?.branch_id ?? defaultBranchId ?? '',
  );
  const options = useWriteOptions(
    'test_templates',
    template ? 'update' : 'create',
    branchId,
    open,
  );
  const questionChoices = options.scoped
    ? (options.data?.questions ?? [])
    : (available.data?.data ?? []);
  const questionLookup = options.scoped ? options : available;
  const questionsNeedBranch = options.scoped && !options.selectedBranchId;
  const branchChoices = options.scoped ? options.branches : branches;
  const [title, setTitle] = useState(template?.title ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [questionCount, setQuestionCount] = useState(
    String(template?.question_count ?? 10),
  );
  const [timeLimit, setTimeLimit] = useState(
    String(template?.time_limit_seconds ?? 1200),
  );
  const [passPercent, setPassPercent] = useState(
    String(template?.passing_threshold_percent ?? 80),
  );
  const [retryLimit, setRetryLimit] = useState(
    String(template?.retry_limit ?? 1),
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(
    template?.shuffle_questions ?? true,
  );
  const [shuffleOptions, setShuffleOptions] = useState(
    template?.shuffle_options ?? false,
  );
  const [reviewTiming, setReviewTiming] = useState<AnswerReviewTiming>(
    template?.answer_review_timing ?? 'after_submit',
  );
  const initialSelected = useMemo(
    () => new Set(template?.questions?.map((q) => q.question_id) ?? []),
    [template],
  );
  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  // Already chosen questions stay visible even when the lookup fails or no
  // longer lists them, so the count above never contradicts the list.
  const listedIds = new Set(questionChoices.map((question) => question.id));
  const unlistedSelected = [...selected].filter((id) => !listedIds.has(id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pending = create.isPending || update.isPending;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const question_count = Number(questionCount);
    const time_limit_seconds = Number(timeLimit);
    const passing_threshold_percent = Number(passPercent);
    const retry_limit = Number(retryLimit);
    const question_ids = [...selected];
    if (
      !title.trim() ||
      !Number.isInteger(question_count) ||
      question_count < 1 ||
      !Number.isInteger(time_limit_seconds) ||
      time_limit_seconds < 30 ||
      !Number.isInteger(passing_threshold_percent) ||
      question_ids.length < question_count
    ) {
      toast.error(t('school_tests.validation'));
      return;
    }
    const handlers = {
      onSuccess: () => {
        toast.success(
          t(template ? 'school_tests.updated' : 'school_tests.created'),
        );
        onClose();
      },
      onError: (error: Error) =>
        toast.error(extractErrorMessage(error, t('common.error'))),
    };
    if (template) {
      update.mutate(
        {
          id: template.id,
          title: title.trim(),
          description: description.trim() || undefined,
          question_count,
          time_limit_seconds,
          passing_threshold_percent,
          retry_limit,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          answer_review_timing: reviewTiming,
          question_ids,
        },
        handlers,
      );
      return;
    }
    if (!branchId) {
      toast.error(t('school_tests.branch_required'));
      return;
    }
    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        branch_id: branchId,
        category: 'B',
        question_count,
        time_limit_seconds,
        passing_threshold_percent,
        retry_limit,
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
        answer_review_timing: reviewTiming,
        question_ids,
      },
      handlers,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(template ? 'school_tests.edit' : 'school_tests.create')}
          </DialogTitle>
          <DialogDescription>
            {t('school_tests.not_official_exam')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {!template ? (
            <label className="block space-y-1 text-sm">
              <span>{t('common.branch')}</span>
              <select
                className={selectClass}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
              >
                <option value="">{t('common.select_placeholder')}</option>
                {branchChoices.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span>{t('school_tests.template_title')}</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t('school_tests.description')}</span>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={4000}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>{t('school_tests.question_count')}</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t('school_tests.time_limit_seconds')}</span>
              <Input
                type="number"
                min={30}
                max={14400}
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t('school_tests.passing_percent')}</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={passPercent}
                onChange={(e) => setPassPercent(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t('school_tests.retry_limit')}</span>
              <Input
                type="number"
                min={0}
                max={50}
                value={retryLimit}
                onChange={(e) => setRetryLimit(e.target.value)}
              />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span>{t('school_tests.review_timing')}</span>
            <select
              className={selectClass}
              value={reviewTiming}
              onChange={(e) =>
                setReviewTiming(e.target.value as AnswerReviewTiming)
              }
            >
              {(
                [
                  'never',
                  'immediate',
                  'after_submit',
                  'after_deadline',
                ] as AnswerReviewTiming[]
              ).map((value) => (
                <option key={value} value={value}>
                  {t(`school_tests.review.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
            />
            {t('school_tests.shuffle_questions')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
            />
            {t('school_tests.shuffle_options')}
          </label>
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {t('school_tests.select_questions')} ({selected.size})
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {unlistedSelected.map((id) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked
                    onChange={() => toggle(id)}
                  />
                  <span className="text-muted-foreground">
                    {t('school_tests.selected_question_fallback', {
                      id: id.slice(0, 8),
                    })}
                  </span>
                </label>
              ))}
              {questionChoices.map((question) => (
                <label
                  key={question.id}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(question.id)}
                    onChange={() => toggle(question.id)}
                  />
                  <span>
                    {t(`questions.topics.${question.topic}`)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t(`questions.visibility.${question.visibility}`)}
                    </span>
                  </span>
                </label>
              ))}
              {questionChoices.length ? null : questionsNeedBranch ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  {t('common.select_branch')}
                </p>
              ) : questionLookup.isFetching ? (
                <p
                  role="status"
                  className="px-2 py-3 text-xs text-muted-foreground"
                >
                  {t('common.loading')}
                </p>
              ) : questionLookup.isError ? (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-2 px-2 py-2 text-xs text-destructive"
                >
                  {t('common.error')}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void questionLookup.refetch()}
                  >
                    {t('common.retry')}
                  </Button>
                </div>
              ) : (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  {t('school_tests.no_available_questions')}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
