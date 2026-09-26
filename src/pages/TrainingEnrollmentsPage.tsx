import { useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { useListQueryState } from '@/hooks/useListQueryState';
import { matchesListQuery } from '@/lib/listQuery';
import { ListSearchField } from '@/components/ui/ListSearchField';
import { useDebounce } from '@/hooks/useDebounce';
import { useBranches } from '@/services/branchService';
import { searchStudents } from '@/services/studentService';
import {
  useActiveTrainingPrograms,
  useCreateTrainingEnrollment,
  useTrainingEnrollmentsPage,
} from '@/services/trainingService';
import { studentKeys } from '@/lib/queryKeys';
import { extractErrorMessage } from '@/lib/errors';
import type {
  TrainingEnrollment,
  TrainingEnrollmentStatus,
} from '@/types/training';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import PaginationControls from '@/components/ui/PaginationControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

const EnrollmentDialog = ({
  open,
  branches,
  ownBranchId,
  canViewAll,
  onClose,
}: {
  open: boolean;
  branches: Array<{ id: string; name: string }>;
  ownBranchId?: string;
  canViewAll: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const create = useCreateTrainingEnrollment();
  const [branchId, setBranchId] = useState(ownBranchId ?? '');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [programId, setProgramId] = useState('');
  const debouncedSearch = useDebounce(studentSearch.trim(), 250);
  const students = useQuery({
    queryKey: studentKeys.page({ search: debouncedSearch, limit: 50 }),
    queryFn: ({ signal }) => searchStudents(debouncedSearch, signal),
    enabled: open && debouncedSearch.length >= 2,
  });
  const programs = useActiveTrainingPrograms(branchId, open);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!studentId || !programId || !branchId) return;
    create.mutate(
      {
        student_id: studentId,
        program_id: programId,
        ...(canViewAll ? { branch_id: branchId } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('training.enrollment_created'));
          close();
        },
        onError: (error) =>
          toast.error(extractErrorMessage(error, t('common.error'))),
      },
    );
  };
  const close = () => {
    setStudentSearch('');
    setStudentId('');
    setProgramId('');
    setBranchId(ownBranchId ?? '');
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('training.add_enrollment')}</DialogTitle>
          <DialogDescription>{t('training.enrollment_desc')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {canViewAll && (
            <label className="block space-y-1 text-sm">
              <span>{t('common.branch')}</span>
              <select
                className={selectClass}
                value={branchId}
                onChange={(event) => {
                  setBranchId(event.target.value);
                  setProgramId('');
                }}
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
          )}
          <label className="block space-y-1 text-sm">
            <span>{t('training.search_student')}</span>
            <Input
              value={studentSearch}
              onChange={(event) => {
                setStudentSearch(event.target.value);
                setStudentId('');
              }}
              placeholder={t('training.search_student_hint')}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t('training.student')}</span>
            <select
              className={selectClass}
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              disabled={debouncedSearch.length < 2 || students.isLoading}
              required
            >
              <option value="">{t('common.select_placeholder')}</option>
              {students.data?.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.last_name} {student.first_name} · {student.phone}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t('training.program')}</span>
            <select
              className={selectClass}
              value={programId}
              onChange={(event) => setProgramId(event.target.value)}
              disabled={!branchId || programs.isLoading}
              required
            >
              <option value="">{t('common.select_placeholder')}</option>
              {programs.data?.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} · {program.category}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            {t('training.no_attendance_conversion')}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TrainingEnrollmentsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canCreate = useCan('createTrainingEnrollment');
  const canViewAll = useCan('viewAllBranches');
  const { data: branches = [] } = useBranches(canViewAll);
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<TrainingEnrollmentStatus | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    page,
    pageSize,
    search,
    debouncedSearch,
    setPage,
    setPageSize,
    setSearch,
  } = useListQueryState();
  const enrollments = useTrainingEnrollmentsPage({
    branchId: canViewAll
      ? branchId || undefined
      : (user?.branch_id ?? undefined),
    status: status || undefined,
    page,
    limit: pageSize,
  });
  const visibleEnrollments = useMemo(
    () =>
      (enrollments.data?.data ?? []).filter((enrollment) =>
        matchesListQuery(
          debouncedSearch,
          enrollment.student.first_name,
          enrollment.student.last_name,
          enrollment.program_name,
          enrollment.category,
        ),
      ),
    [enrollments.data, debouncedSearch],
  );
  const programName = (enrollment: TrainingEnrollment) =>
    enrollment.program_id
      ? (enrollment.program_name ?? t('training.program'))
      : t('training.legacy');
  const branchName = (id: string) =>
    branches.find((branch) => branch.id === id)?.name ??
    (id === user?.branch_id ? user?.branch_name : id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('training.enrollments')}
        title={t('training.enrollments')}
        description={t('training.enrollments_subtitle')}
        icon={<GraduationCap className="h-3.5 w-3.5" />}
        actions={
          canCreate && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('training.add_enrollment')}
            </Button>
          )
        }
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
            setStatus(event.target.value as TrainingEnrollmentStatus | '');
            setPage(1);
          }}
        >
          <option value="">{t('common.all')}</option>
          {(['active', 'completed', 'cancelled', 'legacy'] as const).map(
            (value) => (
              <option key={value} value={value}>
                {t(`training.status.${value}`)}
              </option>
            ),
          )}
        </select>
      </div>
      {enrollments.isLoading ? (
        <p>{t('common.loading')}</p>
      ) : enrollments.isError ? (
        <EmptyState
          title={t('common.error')}
          action={{
            label: t('common.retry'),
            onClick: () => void enrollments.refetch(),
          }}
        />
      ) : enrollments.data?.data.length ? (
        <>
          {visibleEnrollments.length === 0 ? (
            <EmptyState title={t('common.no_data')} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleEnrollments.map((enrollment) => (
                <DataCard
                  key={enrollment.id}
                  title={`${enrollment.student.last_name} ${enrollment.student.first_name}`}
                  subtitle={`${enrollment.category ?? '—'} · ${programName(enrollment)}`}
                  onClick={() =>
                    navigate({
                      to: '/training-enrollments/$id',
                      params: { id: enrollment.id },
                    })
                  }
                  fields={[
                    {
                      label: t('common.branch'),
                      value: branchName(enrollment.branch_id),
                    },
                    {
                      label: t('common.status'),
                      value: t(`training.status.${enrollment.status}`),
                    },
                    {
                      label: t('driving.approved'),
                      value: `${enrollment.approved_minutes} ${t('driving.minutes')}`,
                    },
                    {
                      label: t('driving.remaining'),
                      value:
                        enrollment.remaining_minutes === null
                          ? t('common.na')
                          : `${enrollment.remaining_minutes} ${t('driving.minutes')}`,
                    },
                  ]}
                />
              ))}
            </div>
          )}
          <PaginationControls
            currentPage={page}
            totalPages={Math.max(1, enrollments.data.meta.totalPages)}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </>
      ) : (
        <EmptyState
          title={t('training.empty_enrollments')}
          description={t('training.empty_enrollments_desc')}
        />
      )}
      {canCreate && (
        <EnrollmentDialog
          open={dialogOpen}
          branches={branches}
          ownBranchId={user?.branch_id ?? undefined}
          canViewAll={canViewAll}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
};

export default TrainingEnrollmentsPage;
