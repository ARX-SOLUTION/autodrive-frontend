import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ClipboardText, Plus } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { useBranches } from '@/services/branchService';
import { useTestTemplatesPage } from '@/services/schoolTestService';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import PaginationControls from '@/components/ui/PaginationControls';
import { Button } from '@/components/ui/button';
import { TestTemplateFormDialog } from '@/pages/school-tests/TestTemplateFormDialog';

const SchoolTestsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canManage = useCan('manageSchoolLearning');
  const canViewAll = useCan('viewAllBranches');
  const { data: branches = [] } = useBranches(canViewAll || canManage);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const templates = useTestTemplatesPage({ page });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('school_tests.title')}
        title={t('school_tests.title')}
        description={t('school_tests.subtitle')}
        icon={<ClipboardText className="h-3.5 w-3.5" />}
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('school_tests.create')}
            </Button>
          ) : null
        }
      />

      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {t('school_tests.not_official_exam')}
      </p>

      {templates.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : !templates.data?.data.length ? (
        <EmptyState
          icon={ClipboardText}
          title={t('school_tests.empty')}
          description={t('school_tests.empty_desc')}
        />
      ) : (
        <div className="grid gap-3">
          {templates.data.data.map((template) => (
            <DataCard
              key={template.id}
              className="cursor-pointer"
              title={template.title}
              subtitle={`${t(`school_tests.status.${template.status}`)} · ${
                template.question_count
              } ${t('school_tests.questions_short')}`}
              fields={[
                {
                  label: t('school_tests.passing_percent'),
                  value: `${template.passing_threshold_percent}%`,
                },
                {
                  label: t('school_tests.time_limit_seconds'),
                  value: String(template.time_limit_seconds),
                },
              ]}
              onClick={() =>
                navigate({
                  to: '/school-tests/$id',
                  params: { id: template.id },
                })
              }
            />
          ))}
        </div>
      )}

      {templates.data?.meta ? (
        <PaginationControls
          currentPage={templates.data.meta.page}
          totalPages={templates.data.meta.totalPages}
          onPageChange={setPage}
        />
      ) : null}

      {createOpen ? (
        <TestTemplateFormDialog
          open={createOpen}
          template={null}
          branches={branches}
          defaultBranchId={user?.branch_id ?? undefined}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
    </div>
  );
};

export default SchoolTestsPage;
