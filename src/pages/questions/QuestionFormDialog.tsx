import { useState, type FormEvent } from 'react';
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
  useCreateQuestion,
  useUpdateQuestionDraft,
} from '@/services/questionService';
import {
  QUESTION_OPTION_KEYS,
  QUESTION_TOPICS,
  activeQuestionVersion,
  localeContent,
  type Question,
  type QuestionLocale,
  type QuestionOptionKey,
  type QuestionTopic,
} from '@/types/question';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

const emptyOptions = () =>
  QUESTION_OPTION_KEYS.map((key) => ({ option_key: key, text: '' }));

export const QuestionFormDialog = ({
  open,
  question,
  branches,
  defaultBranchId,
  onClose,
}: {
  open: boolean;
  question: Question | null;
  branches: Array<{ id: string; name: string }>;
  defaultBranchId?: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const create = useCreateQuestion();
  const update = useUpdateQuestionDraft();
  const existing = question
    ? localeContent(activeQuestionVersion(question), 'uz')
    : null;

  const [branchId, setBranchId] = useState(
    question?.branch_id ?? defaultBranchId ?? '',
  );
  const [topic, setTopic] = useState<QuestionTopic>(
    question?.topic ?? 'general_rules',
  );
  const [locale, setLocale] = useState<QuestionLocale>('uz');
  const [stem, setStem] = useState(existing?.stem ?? '');
  const [explanation, setExplanation] = useState(existing?.explanation ?? '');
  const [correctKey, setCorrectKey] = useState<QuestionOptionKey>(
    (activeQuestionVersion(question)
      ?.correct_option_key as QuestionOptionKey) ?? 'A',
  );
  const [options, setOptions] = useState(() => {
    if (existing?.options?.length) {
      return QUESTION_OPTION_KEYS.map((key) => ({
        option_key: key,
        text: existing.options.find((o) => o.option_key === key)?.text ?? '',
      }));
    }
    return emptyOptions();
  });
  const [sourceUrl, setSourceUrl] = useState(
    activeQuestionVersion(question)?.source_url ?? '',
  );
  const [legalProvision, setLegalProvision] = useState(
    activeQuestionVersion(question)?.legal_provision ?? '',
  );

  const pending = create.isPending || update.isPending;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const filled = options.filter((o) => o.text.trim());
    if (filled.length < 2 || !stem.trim() || !explanation.trim()) {
      toast.error(t('questions.validation_min'));
      return;
    }
    if (!filled.some((o) => o.option_key === correctKey)) {
      toast.error(t('questions.validation_correct'));
      return;
    }
    const locales = [
      {
        locale,
        stem: stem.trim(),
        explanation: explanation.trim(),
        options: filled.map((o) => ({
          option_key: o.option_key,
          text: o.text.trim(),
        })),
      },
    ];
    const handlers = {
      onSuccess: () => {
        toast.success(t(question ? 'questions.updated' : 'questions.created'));
        onClose();
      },
      onError: (error: Error) =>
        toast.error(extractErrorMessage(error, t('common.error'))),
    };
    if (question) {
      update.mutate(
        {
          id: question.id,
          topic,
          correct_option_key: correctKey,
          source_url: sourceUrl.trim() || null,
          legal_provision: legalProvision.trim() || null,
          locales,
        },
        handlers,
      );
      return;
    }
    if (!branchId) {
      toast.error(t('questions.branch_required'));
      return;
    }
    create.mutate(
      {
        visibility: 'school_private',
        topic,
        branch_id: branchId,
        correct_option_key: correctKey,
        source_url: sourceUrl.trim() || undefined,
        legal_provision: legalProvision.trim() || undefined,
        locales,
      },
      handlers,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(question ? 'questions.edit' : 'questions.create')}
          </DialogTitle>
          <DialogDescription>
            {t('questions.school_private_only')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {!question ? (
            <label className="block space-y-1 text-sm">
              <span>{t('common.branch')}</span>
              <select
                className={selectClass}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
              >
                <option value="">{t('common.select_placeholder')}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>{t('questions.topic')}</span>
              <select
                className={selectClass}
                value={topic}
                onChange={(e) => setTopic(e.target.value as QuestionTopic)}
              >
                {QUESTION_TOPICS.map((item) => (
                  <option key={item} value={item}>
                    {t(`questions.topics.${item}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t('questions.locale')}</span>
              <select
                className={selectClass}
                value={locale}
                onChange={(e) => setLocale(e.target.value as QuestionLocale)}
              >
                <option value="uz">Oʻzbek</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span>{t('questions.stem')}</span>
            <Textarea
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              rows={3}
              maxLength={4000}
              required
            />
          </label>
          {QUESTION_OPTION_KEYS.map((key) => (
            <label key={key} className="block space-y-1 text-sm">
              <span>
                {t('questions.option')} {key}
              </span>
              <Input
                value={options.find((o) => o.option_key === key)?.text ?? ''}
                onChange={(e) =>
                  setOptions((prev) =>
                    prev.map((o) =>
                      o.option_key === key ? { ...o, text: e.target.value } : o,
                    ),
                  )
                }
                maxLength={500}
              />
            </label>
          ))}
          <label className="block space-y-1 text-sm">
            <span>{t('questions.correct_option')}</span>
            <select
              className={selectClass}
              value={correctKey}
              onChange={(e) =>
                setCorrectKey(e.target.value as QuestionOptionKey)
              }
            >
              {QUESTION_OPTION_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t('questions.explanation')}</span>
            <Textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              maxLength={8000}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t('questions.source_url')}</span>
            <Input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://"
              maxLength={2000}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t('questions.legal_provision')}</span>
            <Input
              value={legalProvision}
              onChange={(e) => setLegalProvision(e.target.value)}
              maxLength={500}
            />
          </label>
          <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            {t('questions.visibility_locked')}
          </p>
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
