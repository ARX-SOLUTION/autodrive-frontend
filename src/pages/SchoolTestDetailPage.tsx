import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ClipboardText } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useCan } from '@/hooks/useCan';
import { useBranches } from '@/services/branchService';
import {
  usePublishTestTemplate,
  useTemplateAssignments,
  useTestTemplate,
} from '@/services/schoolTestService';
import {
  assignmentWindowStatus,
  type AssignmentWindowStatus,
} from '@/types/schoolTest';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { extractErrorMessage } from '@/lib/errors';
import { formatTashkentDateTime } from '@/lib/calendarDateTime';
import { TestTemplateFormDialog } from '@/pages/school-tests/TestTemplateFormDialog';
import { AssignTestDialog } from '@/pages/school-tests/AssignTestDialog';
import { QuestionPreview } from '@/pages/questions/QuestionPreview';
import { useQuestion } from '@/services/questionService';
import { activeQuestionVersion } from '@/types/question';

const PreviewQuestion = ({ questionId }: { questionId: string }) => {
  const { t } = useTranslation();
  const { data: question } = useQuestion(questionId);
  const version = question ? activeQuestionVersion(question) : null;
  if (!question || !version) {
    return (
      <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
    );
  }
  return (
    <QuestionPreview
      question={question}
      version={version}
      locale="uz"
      revealAnswer
    />
  );
};

const windowTone = (status: AssignmentWindowStatus) => {
  if (status === 'open') return 'text-emerald-600';
  if (status === 'scheduled') return 'text-amber-600';
  return 'text-muted-foreground';
};

const SchoolTestDetailPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams({ from: '/_authenticated/school-tests/$id' });
  const canManage = useCan('manageSchoolLearning');
  const { data: template, isLoading } = useTestTemplate(id);
  const assignments = useTemplateAssignments(id);
  const { data: branches = [] } = useBranches(canManage);
  const publish = usePublishTestTemplate();
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
    );
  }
  if (!template) {
    return (
      <p className="text-sm text-muted-foreground">{t('common.not_found')}</p>
    );
  }

  const canPublish = canManage && template.status === 'draft';
  const canAssign = canManage && template.status === 'published';

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: '/school-tests' })}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {t('school_tests.back')}
      </Button>

      <PageHeader
        eyebrow={t('school_tests.title')}
        title={template.title}
        description={`${t(`school_tests.status.${template.status}`)} · ${t(
          'school_tests.not_official_exam',
        )}`}
        icon={<ClipboardText className="h-3.5 w-3.5" />}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                {t('school_tests.edit')}
              </Button>
              {canPublish ? (
                <Button
                  onClick={() =>
                    publish.mutate(template.id, {
                      onSuccess: () =>
                        toast.success(t('school_tests.published')),
                      onError: (e: Error) =>
                        toast.error(extractErrorMessage(e, t('common.error'))),
                    })
                  }
                  disabled={publish.isPending}
                >
                  {t('school_tests.publish')}
                </Button>
              ) : null}
              {canAssign ? (
                <Button onClick={() => setAssignOpen(true)}>
                  {t('school_tests.assign')}
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      <div className="glass-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">
            {t('school_tests.question_count')}
          </div>
          <div className="font-medium">{template.question_count}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            {t('school_tests.time_limit_seconds')}
          </div>
          <div className="font-medium">{template.time_limit_seconds}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            {t('school_tests.passing_percent')}
          </div>
          <div className="font-medium">
            {template.passing_threshold_percent}%
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            {t('school_tests.review_timing')}
          </div>
          <div className="font-medium">
            {t(`school_tests.review.${template.answer_review_timing}`)}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">
          {t('school_tests.preview_questions')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('school_tests.preview_hint')}
        </p>
        <div className="flex flex-wrap gap-2">
          {(template.questions ?? []).map((item) => (
            <Button
              key={item.question_id}
              size="sm"
              variant={previewId === item.question_id ? 'default' : 'outline'}
              onClick={() => setPreviewId(item.question_id)}
            >
              #{item.sort_order + 1}
            </Button>
          ))}
        </div>
        {previewId ? <PreviewQuestion questionId={previewId} /> : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">
          {t('school_tests.assignments_outcomes')}
        </h2>
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {t('school_tests.outcomes_separate_from_exams')}
        </p>
        {assignments.isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : !assignments.data?.length ? (
          <EmptyState
            icon={ClipboardText}
            title={t('school_tests.no_assignments')}
            description={t('school_tests.no_assignments_desc')}
          />
        ) : (
          <div className="grid gap-3">
            {assignments.data.map((assignment) => {
              const windowStatus = assignmentWindowStatus(assignment);
              return (
                <DataCard
                  key={assignment.id}
                  title={
                    assignment.group_id
                      ? t('school_tests.group_assignment')
                      : t('school_tests.student_assignment')
                  }
                  subtitle={
                    <span className={windowTone(windowStatus)}>
                      {t(`school_tests.window.${windowStatus}`)}
                    </span>
                  }
                  fields={[
                    {
                      label: t('school_tests.target_id'),
                      value:
                        assignment.group_id ?? assignment.student_id ?? '—',
                    },
                    {
                      label: t('school_tests.available_from'),
                      value: assignment.available_from
                        ? formatTashkentDateTime(
                            assignment.available_from,
                            i18n.language,
                          )
                        : '—',
                    },
                    {
                      label: t('school_tests.available_until'),
                      value: assignment.available_until
                        ? formatTashkentDateTime(
                            assignment.available_until,
                            i18n.language,
                          )
                        : '—',
                    },
                  ]}
                />
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {t('school_tests.analytics_pending')}
        </p>
      </section>

      {editOpen ? (
        <TestTemplateFormDialog
          open={editOpen}
          template={template}
          branches={branches}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
      {assignOpen ? (
        <AssignTestDialog
          open={assignOpen}
          templateId={template.id}
          branchId={template.branch_id}
          onClose={() => setAssignOpen(false)}
        />
      ) : null}
    </div>
  );
};

export default SchoolTestDetailPage;
