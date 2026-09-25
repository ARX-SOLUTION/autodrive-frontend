import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Exam, Plus } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { useBranches } from '@/services/branchService';
import { useQuestionsPage } from '@/services/questionService';
import {
  QUESTION_TOPICS,
  type QuestionStatus,
  type QuestionTopic,
} from '@/types/question';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import PaginationControls from '@/components/ui/PaginationControls';
import { Button } from '@/components/ui/button';
import { QuestionFormDialog } from '@/pages/questions/QuestionFormDialog';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

const QuestionsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canManage = useCan('manageSchoolLearning');
  const canViewAll = useCan('viewAllBranches');
  const { data: branches = [] } = useBranches(canViewAll || canManage);
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<QuestionStatus | ''>('');
  const [topic, setTopic] = useState<QuestionTopic | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const effectiveBranch = canViewAll
    ? branchId || undefined
    : (user?.branch_id ?? undefined);

  const questions = useQuestionsPage({
    // CRM staff list defaults to school_private so public bank is not mixed in.
    visibility: 'school_private',
    status: status || undefined,
    topic: topic || undefined,
    branchId: effectiveBranch,
    page,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('questions.title')}
        title={t('questions.title')}
        description={t('questions.subtitle')}
        icon={<Exam className="h-3.5 w-3.5" />}
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('questions.create')}
            </Button>
          ) : null
        }
      />

      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {t('questions.school_private_banner')}
      </p>

      <div className="glass-card grid gap-3 p-4 sm:grid-cols-3">
        {canViewAll ? (
          <select
            aria-label={t('common.branch')}
            className={selectClass}
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('common.all_branches')}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="self-center text-sm text-muted-foreground">
            {user?.branch_name ?? t('common.branch')}
          </span>
        )}
        <select
          aria-label={t('common.status')}
          className={selectClass}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as QuestionStatus | '');
            setPage(1);
          }}
        >
          <option value="">{t('common.all')}</option>
          {(
            [
              'draft',
              'in_review',
              'published',
              'retired',
              'disputed',
            ] as QuestionStatus[]
          ).map((value) => (
            <option key={value} value={value}>
              {t(`questions.status.${value}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('questions.topic')}
          className={selectClass}
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value as QuestionTopic | '');
            setPage(1);
          }}
        >
          <option value="">{t('questions.all_topics')}</option>
          {QUESTION_TOPICS.map((value) => (
            <option key={value} value={value}>
              {t(`questions.topics.${value}`)}
            </option>
          ))}
        </select>
      </div>

      {questions.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : !questions.data?.data.length ? (
        <EmptyState
          icon={Exam}
          title={t('questions.empty')}
          description={t('questions.empty_desc')}
        />
      ) : (
        <div className="grid gap-3">
          {questions.data.data.map((question) => (
            <DataCard
              key={question.id}
              className="cursor-pointer"
              title={t(`questions.topics.${question.topic}`)}
              subtitle={`${t(`questions.status.${question.status}`)} · ${t(
                `questions.visibility.${question.visibility}`,
              )}`}
              fields={[
                {
                  label: t('questions.category'),
                  value: question.category,
                },
              ]}
              onClick={() =>
                navigate({
                  to: '/questions/$id',
                  params: { id: question.id },
                })
              }
            />
          ))}
        </div>
      )}

      {questions.data?.meta ? (
        <PaginationControls
          currentPage={questions.data.meta.page}
          totalPages={questions.data.meta.totalPages}
          onPageChange={setPage}
        />
      ) : null}

      {createOpen ? (
        <QuestionFormDialog
          open={createOpen}
          question={null}
          branches={branches}
          defaultBranchId={user?.branch_id ?? undefined}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
    </div>
  );
};

export default QuestionsPage;
