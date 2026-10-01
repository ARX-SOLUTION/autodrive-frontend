import { requestBranchId } from '@/lib/permissions';
import { useWriteOptions } from '@/hooks/useWriteOptions';
import { useMemo, useState, useCallback, type FormEvent } from 'react';
import { usePermissionQuery as useQuery } from '@/hooks/usePermissionQuery';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { CaretRight, GraduationCap, Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { useListQueryState } from '@/hooks/useListQueryState';
import { matchesListQuery } from '@/lib/listQuery';
import { ListSearchField } from '@/components/ui/ListSearchField';
import { useDebounce } from '@/hooks/useDebounce';
import { useBranches } from '@/features/branches/api/branchService';
import { searchStudents } from '@/features/students/api/studentService';
import {
  useActiveTrainingPrograms,
  useCreateTrainingEnrollment,
  useTrainingEnrollmentsPage,
} from '@/features/training/api/trainingService';
import { studentKeys } from '@/lib/queryKeys';
import { extractErrorMessage } from '@/lib/errors';
import type {
  TrainingEnrollment,
  TrainingEnrollmentStatus,
} from '@/features/training/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataGrid, createDataGridColumnHelper } from '@/shared/ui/data-grid';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

const enrollmentColumnHelper = createDataGridColumnHelper<TrainingEnrollment>();

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
  const debouncedSearch = useDebounce(studentSearch, 300);

  const effectiveBranchId = canViewAll ? branchId : (ownBranchId ?? '');

  const studentsQuery = useQuery({
    queryKey: studentKeys.list({
      branchId: effectiveBranchId || undefined,
      search: debouncedSearch,
    }),
    queryFn: ({ signal }) => searchStudents(debouncedSearch, signal),
    enabled: open && debouncedSearch.trim().length >= 2,
    staleTime: 30_000,
  });

  const programs = useActiveTrainingPrograms(
    effectiveBranchId,
    Boolean(effectiveBranchId),
  );

  const options = useWriteOptions(
    'training_enrollments',
    'create',
    effectiveBranchId,
    open,
  );
  const studentChoices = options.scoped
    ? (options.data?.students ?? []).filter((student) =>
        `${student.last_name} ${student.first_name}`
          .toLowerCase()
          .includes(debouncedSearch.toLowerCase()),
      )
    : (studentsQuery.data ?? []);
  const programChoices = options.scoped
    ? (options.data?.programs ?? [])
    : (programs.data ?? []);
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!studentId || !programId) return;

    create.mutate(
      {
        student_id: studentId,
        program_id: programId,
      },
      {
        onSuccess: () => {
          toast.success(t('training.enrollment_created'));
          onClose();
        },
        onError: (err) => {
          toast.error(extractErrorMessage(err));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('training.add_enrollment')}</DialogTitle>
          <DialogDescription>
            {t('training.add_enrollment_desc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {canViewAll && (
            <div>
              <label
                htmlFor="enrollment-branch"
                className="mb-1 block text-sm font-medium"
              >
                {t('common.branch')}
              </label>
              <select
                id="enrollment-branch"
                className={selectClass}
                value={branchId}
                onChange={(event) => {
                  setBranchId(event.target.value);
                  setStudentId('');
                  setProgramId('');
                }}
                required
              >
                <option value="">{t('common.select_branch')}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="student-search-input"
              className="mb-1 block text-sm font-medium"
            >
              {t('training.find_student')}
            </label>
            <Input
              id="student-search-input"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder={t('training.search_student_placeholder')}
              autoComplete="off"
            />
            {studentChoices.length > 0 && (
              <div
                role="listbox"
                aria-label={t('training.find_student')}
                className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-md"
              >
                {studentChoices.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    role="option"
                    aria-selected={studentId === student.id}
                    className={`w-full rounded px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground ${
                      studentId === student.id
                        ? 'bg-accent font-medium text-accent-foreground'
                        : ''
                    }`}
                    onClick={() => {
                      setStudentId(student.id);
                      setStudentSearch(
                        `${student.last_name} ${student.first_name}`,
                      );
                    }}
                  >
                    {student.last_name} {student.first_name} (
                    {'phone' in student && typeof student.phone === 'string'
                      ? student.phone
                      : ''}
                    )
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="training-program-select"
              className="mb-1 block text-sm font-medium"
            >
              {t('training.program')}
            </label>
            <select
              id="training-program-select"
              className={selectClass}
              value={programId}
              onChange={(event) => setProgramId(event.target.value)}
              required
            >
              <option value="">{t('training.select_program')}</option>
              {programChoices.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.name} ({prog.category ?? ''} ·{' '}
                  {Math.round(prog.required_minutes / 60)}h)
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || !studentId || !programId}
            >
              {create.isPending ? t('common.saving') : t('common.save')}
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
  const canViewAll = useCan('viewAllBranches');
  const canCreate = useCan('createTrainingEnrollment');
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
  const effectiveBranch = canViewAll
    ? branchId || undefined
    : (useAuthStore.getState?.()?.activeBranchId ??
      user?.branch_id ??
      undefined);
  const enrollments = useTrainingEnrollmentsPage({
    branchId: effectiveBranch,
    status: status || undefined,
    page,
    limit: pageSize,
  });
  const programs = useActiveTrainingPrograms(
    effectiveBranch ?? '',
    Boolean(effectiveBranch),
  );
  const programMap = useMemo(
    () => new Map((programs.data ?? []).map((prog) => [prog.id, prog])),
    [programs.data],
  );

  const programName = useCallback(
    (enrollment: TrainingEnrollment) => {
      if (enrollment.program_name) return enrollment.program_name;
      if (enrollment.program_id) {
        return (
          programMap.get(enrollment.program_id)?.name ?? t('training.program')
        );
      }
      return t('training.legacy');
    },
    [programMap, t],
  );

  const visibleEnrollments = useMemo(
    () =>
      (enrollments.data?.data ?? []).filter((enrollment) =>
        matchesListQuery(
          debouncedSearch,
          enrollment.student.first_name,
          enrollment.student.last_name,
          enrollment.category ?? '',
          programName(enrollment),
        ),
      ),
    [enrollments.data, debouncedSearch, programName],
  );

  const branchName = useCallback(
    (id: string) =>
      branches.find((branch) => branch.id === id)?.name ??
      (id === requestBranchId(user, useAuthStore.getState?.()?.activeBranchId)
        ? user?.branch_name
        : id),
    [branches, user],
  );

  const startIndex = (page - 1) * pageSize;

  const columns = useMemo(
    () =>
      enrollmentColumnHelper.columns([
        enrollmentColumnHelper.display({
          id: 'rowNumber',
          header: '#',
          meta: {
            align: 'center',
            cellClassName: 'text-muted-foreground w-12',
          },
          cell: ({ row }) => startIndex + row.getDisplayIndex() + 1,
        }),
        enrollmentColumnHelper.display({
          id: 'student',
          header: t('students.student'),
          meta: { cellClassName: 'font-medium' },
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/training-enrollments/$id',
                  params: { id: row.original.id },
                })
              }
              className="text-left font-medium text-foreground hover:underline"
            >
              {row.original.student.last_name} {row.original.student.first_name}
            </button>
          ),
        }),
        enrollmentColumnHelper.display({
          id: 'program',
          header: t('training.program'),
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ row }) => (
            <span>
              <span className="font-semibold text-foreground">
                {row.original.category ?? '—'}
              </span>
              {' · '}
              {programName(row.original)}
            </span>
          ),
        }),
        enrollmentColumnHelper.display({
          id: 'branch',
          header: t('common.branch'),
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ row }) => branchName(row.original.branch_id),
        }),
        enrollmentColumnHelper.accessor('status', {
          header: t('common.status'),
          meta: { align: 'center' },
          cell: ({ getValue }) => {
            const val = getValue();
            const colorClass =
              val === 'active'
                ? 'bg-success/10 text-success'
                : val === 'completed'
                  ? 'bg-info/10 text-info'
                  : val === 'cancelled'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground';
            return (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
              >
                {t(`training.status.${val}`)}
              </span>
            );
          },
        }),
        enrollmentColumnHelper.accessor('approved_minutes', {
          header: t('driving.approved'),
          meta: {
            align: 'center',
            cellClassName: 'tabular-nums text-muted-foreground font-medium',
          },
          cell: ({ getValue }) => `${getValue()} ${t('driving.minutes')}`,
        }),
        enrollmentColumnHelper.display({
          id: 'remaining_minutes',
          header: t('driving.remaining'),
          meta: {
            align: 'center',
            cellClassName: 'tabular-nums text-muted-foreground',
          },
          cell: ({ row }) =>
            row.original.remaining_minutes === null
              ? t('common.na')
              : `${row.original.remaining_minutes} ${t('driving.minutes')}`,
        }),
        enrollmentColumnHelper.display({
          id: 'actions',
          header: t('common.actions'),
          meta: { align: 'center' },
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/training-enrollments/$id',
                  params: { id: row.original.id },
                })
              }
              aria-label={t('common.view')}
              title={t('common.view')}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <CaretRight className="h-4 w-4" />
            </button>
          ),
        }),
      ]),
    [branchName, navigate, programName, startIndex, t],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t('training.enrollments')}
        title={t('training.enrollments')}
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

      <DataGrid
        data={visibleEnrollments}
        columns={columns}
        getRowId={(enrollment) => enrollment.id}
        pagination={{
          pageIndex: page - 1,
          pageSize,
          rowCount: enrollments.data?.meta.total ?? visibleEnrollments.length,
          pageCount: Math.max(1, enrollments.data?.meta.totalPages ?? 1),
        }}
        onPaginationChange={({ pageIndex }) => setPage(pageIndex + 1)}
        onPageSizeChange={setPageSize}
        sorting={[]}
        onSortingChange={() => undefined}
        columnFilters={[]}
        onColumnFiltersChange={() => undefined}
        manualPagination
        manualSorting={false}
        manualFiltering
        isInitialLoading={enrollments.isLoading}
        isFetching={enrollments.isFetching}
        labels={{
          table: t('training.enrollments'),
          loading: t('common.loading'),
          fetching: t('common.loading'),
          previousPage: t('common.previous'),
          nextPage: t('common.next'),
        }}
        errorState={
          enrollments.isError ? (
            <EmptyState
              title={t('common.error')}
              action={{
                label: t('common.retry'),
                onClick: () => void enrollments.refetch(),
              }}
            />
          ) : undefined
        }
        emptyState={<EmptyState title={t('common.no_data')} />}
        renderMobileRow={({ row: enrollment }) => (
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
        )}
      />

      <EnrollmentDialog
        open={dialogOpen}
        branches={branches}
        ownBranchId={
          useAuthStore.getState?.()?.activeBranchId ??
          user?.branch_id ??
          undefined
        }
        canViewAll={canViewAll}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};

export default TrainingEnrollmentsPage;
