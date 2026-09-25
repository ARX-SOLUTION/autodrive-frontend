import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type {
  Question,
  QuestionLocale,
  QuestionVersion,
} from '@/types/question';
import { localeContent } from '@/types/question';
import { questionMediaUrl } from '@/services/questionService';
import axiosInstance from '@/api/axiosInstance';

const selectClass =
  'flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm transition hover:border-primary/40';

function useAuthedMediaUrl(questionId: string, mediaId: string | null) {
  return useQuery({
    queryKey: ['question-media-blob', questionId, mediaId],
    enabled: !!mediaId,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const response = await axiosInstance.get(
        questionMediaUrl(questionId, mediaId!),
        { responseType: 'blob', signal },
      );
      return URL.createObjectURL(response.data as Blob);
    },
  });
}

export const QuestionPreview = ({
  question,
  version,
  locale,
  revealAnswer = true,
}: {
  question: Question;
  version: QuestionVersion;
  locale: QuestionLocale;
  revealAnswer?: boolean;
}) => {
  const { t } = useTranslation();
  const content = localeContent(version, locale);
  const mediaQuery = useAuthedMediaUrl(question.id, version.diagram_media_id);
  const mediaUrl = mediaQuery.data ?? null;
  const mediaMeta = question.media?.find(
    (item) => item.id === version.diagram_media_id,
  );

  if (!content) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('questions.preview_empty')}
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('questions.learner_preview')}
      </div>
      <p className="whitespace-pre-wrap text-base font-medium leading-relaxed">
        {content.stem}
      </p>
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt={mediaMeta?.alt_text ?? t('questions.diagram_alt')}
          className="max-h-64 w-full rounded-lg object-contain bg-muted/40"
        />
      ) : null}
      <div className="space-y-2">
        {content.options
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((option) => {
            const isCorrect =
              revealAnswer && option.option_key === version.correct_option_key;
            return (
              <div
                key={option.option_key}
                className={`${selectClass} ${
                  isCorrect ? 'border-emerald-500/60 bg-emerald-500/5' : ''
                }`}
              >
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {option.option_key}
                </span>
                <span className="flex-1 whitespace-pre-wrap">
                  {option.text}
                </span>
              </div>
            );
          })}
      </div>
      {revealAnswer ? (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <div className="mb-1 font-medium">{t('questions.explanation')}</div>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {content.explanation}
          </p>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {t('questions.visibility_label')}:{' '}
        {t(`questions.visibility.${question.visibility}`)}
        {' · '}
        {t('questions.not_official_exam')}
      </p>
    </div>
  );
};
