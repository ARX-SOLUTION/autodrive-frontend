import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Car } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { useListQueryState } from '@/hooks/useListQueryState';
import { matchesListQuery } from '@/lib/listQuery';
import { ListSearchField } from '@/components/ui/ListSearchField';
import { useBranches } from '@/services/branchService';
import { useDrivingSessionsPage } from '@/services/drivingSessionService';
import { formatTashkentDateTime } from '@/lib/calendarDateTime';
import type { DrivingSessionStatus } from '@/types/drivingSession';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import PaginationControls from '@/components/ui/PaginationControls';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

const DrivingSessionsPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canViewAll = useCan('viewAllBranches');
  const canSchedule = useCan('scheduleDrivingSessions');
  const { data: branches = [] } = useBranches(canViewAll);
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<DrivingSessionStatus | ''>('');
  const {
    page,
    pageSize,
    search,
    debouncedSearch,
    setPage,
    setPageSize,
    setSearch,
  } = useListQueryState();
  const effectiveBranch = canViewAll
    ? branchId || undefined
    : (user?.branch_id ?? undefined);
  const sessions = useDrivingSessionsPage({
    branchId: effectiveBranch,
    status: status || undefined,
    page,
    limit: pageSize,
  });
  const visibleSessions = useMemo(
    () =>
      (sessions.data?.data ?? []).filter((session) =>
        matchesListQuery(
          debouncedSearch,
          session.student.first_name,
          session.student.last_name,
          session.vehicle.plate_number,
          session.instructor.name,
        ),
      ),
    [sessions.data, debouncedSearch],
  );
  const formatDate = (value: string) =>
    formatTashkentDateTime(value, i18n.language);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('driving.title')}
        title={t('driving.title')}
        description={t('driving.subtitle')}
        icon={<Car className="h-3.5 w-3.5" />}
      />
      <ListSearchField value={search} onChange={setSearch} />
      <div className="glass-card grid gap-3 p-4 sm:grid-cols-2">
        {canViewAll ? (
          <select
            aria-label={t('common.branch')}
            className={selectClass}
            value={branchId}
            onChange={(event) => {
              setBranchId(event.target.value);
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
          onChange={(event) => {
            setStatus(event.target.value as DrivingSessionStatus | '');
            setPage(1);
          }}
        >
          <option value="">{t('common.all')}</option>
          {(
            [
              'planned',
              'submitted',
              'approved',
              'rejected',
              'cancelled',
            ] as const
          ).map((value) => (
            <option key={value} value={value}>
              {t(`driving.status.${value}`)}
            </option>
          ))}
        </select>
      </div>
      {sessions.isLoading ? (
        <p>{t('common.loading')}</p>
      ) : sessions.isError ? (
        <EmptyState
          title={t('common.error')}
          action={{
            label: t('common.retry'),
            onClick: () => void sessions.refetch(),
          }}
        />
      ) : sessions.data?.data.length ? (
        <>
          {visibleSessions.length === 0 ? (
            <EmptyState title={t('common.no_data')} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleSessions.map((session) => (
                <DataCard
                  key={session.id}
                  title={`${session.student.last_name} ${session.student.first_name}`}
                  subtitle={formatDate(session.starts_at)}
                  onClick={() =>
                    navigate({
                      to: '/driving-sessions/$id',
                      params: { id: session.id },
                    })
                  }
                  fields={[
                    {
                      label: t('driving.vehicle'),
                      value: session.vehicle.plate_number,
                    },
                    {
                      label: t('driving.instructor'),
                      value: session.instructor.name,
                    },
                    {
                      label: t('common.status'),
                      value: t(`driving.status.${session.status}`),
                    },
                    {
                      label: t('driving.planned'),
                      value: `${session.planned_minutes} ${t('driving.minutes')}`,
                    },
                    {
                      label: t('driving.entered'),
                      value:
                        session.actual_minutes === null
                          ? t('common.na')
                          : `${session.actual_minutes} ${t('driving.minutes')}`,
                    },
                    {
                      label: t('driving.approved'),
                      value: `${session.approved_minutes} ${t('driving.minutes')}`,
                    },
                  ]}
                />
              ))}
            </div>
          )}
          <PaginationControls
            currentPage={page}
            totalPages={Math.max(1, sessions.data.meta.totalPages)}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </>
      ) : (
        <EmptyState
          title={t('driving.empty_sessions')}
          description={t('driving.empty_sessions_desc')}
          action={
            canSchedule
              ? {
                  label: t('training.enrollments'),
                  onClick: () => navigate({ to: '/training-enrollments' }),
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default DrivingSessionsPage;
