import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Exam } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useCan } from '@/hooks/useCan';
import {
  usePublishQuestion,
  useQuestion,
  useRetireQuestion,
  useUploadQuestionMedia,
  useUpdateQuestionDraft,
} from '@/services/questionService';
import { activeQuestionVersion, type QuestionLocale } from '@/types/question';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extractErrorMessage } from '@/lib/errors';
import { QuestionPreview } from '@/pages/questions/QuestionPreview';
import { QuestionFormDialog } from '@/pages/questions/QuestionFormDialog';
import { useBranches } from '@/services/branchService';

const QuestionDetailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams({ from: '/_authenticated/questions/$id' });
  const canManage = useCan('manageSchoolLearning');
  const { data: question, isLoading } = useQuestion(id);
  const { data: branches = [] } = useBranches(canManage);
  const publish = usePublishQuestion();
  const retire = useRetireQuestion();
  const upload = useUploadQuestionMedia();
  const updateDraft = useUpdateQuestionDraft();
  const [editOpen, setEditOpen] = useState(false);
  const [locale, setLocale] = useState<QuestionLocale>('uz');
  const [altText, setAltText] = useState('');
  const [rightsHolder, setRightsHolder] = useState('');

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
    );
  }
  if (!question) {
    return (
      <p className="text-sm text-muted-foreground">{t('common.not_found')}</p>
    );
  }

  const version = activeQuestionVersion(question);
  const isPrivate = question.visibility === 'school_private';
  const canPublish =
    canManage &&
    isPrivate &&
    (question.status === 'draft' || question.status === 'in_review');
  const canRetire = canManage && isPrivate && question.status === 'published';

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: '/questions' })}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {t('questions.back')}
      </Button>

      <PageHeader
        eyebrow={t('questions.title')}
        title={t(`questions.topics.${question.topic}`)}
        description={`${t(`questions.status.${question.status}`)} · ${t(
          `questions.visibility.${question.visibility}`,
        )}`}
        icon={<Exam className="h-3.5 w-3.5" />}
        actions={
          canManage && isPrivate ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                {t('questions.edit')}
              </Button>
              {canPublish ? (
                <Button
                  onClick={() =>
                    publish.mutate(question.id, {
                      onSuccess: () => toast.success(t('questions.published')),
                      onError: (e: Error) =>
                        toast.error(extractErrorMessage(e, t('common.error'))),
                    })
                  }
                  disabled={publish.isPending}
                >
                  {t('questions.publish')}
                </Button>
              ) : null}
              {canRetire ? (
                <Button
                  variant="destructive"
                  onClick={() =>
                    retire.mutate(question.id, {
                      onSuccess: () => toast.success(t('questions.retired')),
                      onError: (e: Error) =>
                        toast.error(extractErrorMessage(e, t('common.error'))),
                    })
                  }
                  disabled={retire.isPending}
                >
                  {t('questions.retire')}
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      {!isPrivate ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          {t('questions.platform_public_readonly')}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(['uz', 'ru', 'en'] as QuestionLocale[]).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={locale === value ? 'default' : 'outline'}
            onClick={() => setLocale(value)}
          >
            {value.toUpperCase()}
          </Button>
        ))}
      </div>

      {version ? (
        <QuestionPreview
          question={question}
          version={version}
          locale={locale}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('questions.preview_empty')}
        </p>
      )}

      {canManage && isPrivate ? (
        <div className="glass-card space-y-3 p-4">
          <h3 className="font-medium">{t('questions.upload_media')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('questions.media_hint')}
          </p>
          <Input
            placeholder={t('questions.alt_text')}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            maxLength={500}
          />
          <Input
            placeholder={t('questions.rights_holder')}
            value={rightsHolder}
            onChange={(e) => setRightsHolder(e.target.value)}
            maxLength={200}
          />
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!altText.trim() || !rightsHolder.trim()) {
                toast.error(t('questions.media_meta_required'));
                e.target.value = '';
                return;
              }
              upload.mutate(
                {
                  id: question.id,
                  file,
                  alt_text: altText.trim(),
                  rights_basis: 'original',
                  rights_holder: rightsHolder.trim(),
                  rights_confirmed: true,
                },
                {
                  onSuccess: (media) => {
                    toast.success(t('questions.media_uploaded'));
                    updateDraft.mutate({
                      id: question.id,
                      diagram_media_id: media.id,
                    });
                    setAltText('');
                    setRightsHolder('');
                  },
                  onError: (err: Error) =>
                    toast.error(extractErrorMessage(err, t('common.error'))),
                },
              );
              e.target.value = '';
            }}
          />
        </div>
      ) : null}

      {editOpen ? (
        <QuestionFormDialog
          open={editOpen}
          question={question}
          branches={branches}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </div>
  );
};

export default QuestionDetailPage;
