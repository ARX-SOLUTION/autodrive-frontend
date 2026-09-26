import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useBranches } from '@/services/branchService';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { useListQueryState } from '@/hooks/useListQueryState';
import { matchesListQuery } from '@/lib/listQuery';
import { ListSearchField } from '@/components/ui/ListSearchField';
import {
  useCreateTrainingProgram,
  useTrainingProgramsPage,
  useUpdateTrainingProgram,
} from '@/services/trainingService';
import { VEHICLE_CATEGORIES, type VehicleCategory } from '@/types/vehicle';
import type { TrainingProgram } from '@/types/training';
import type { CourseType } from '@/types/student';
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
import { extractErrorMessage } from '@/lib/errors';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

const ProgramDialog = ({
  open,
  program,
  branches,
  onClose,
}: {
  open: boolean;
  program: TrainingProgram | null;
  branches: Array<{ id: string; name: string }>;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const create = useCreateTrainingProgram();
  const update = useUpdateTrainingProgram();
  const [branchId, setBranchId] = useState(program?.branch_id ?? '');
  const [name, setName] = useState(program?.name ?? '');
  const [courseType, setCourseType] = useState<CourseType>(
    program?.course_type ?? 'avto_maktab',
  );
  const [category, setCategory] = useState<VehicleCategory>(
    program?.category ?? 'B',
  );
  const [requiredMinutes, setRequiredMinutes] = useState(
    program ? String(program.required_minutes) : '',
  );
  const [active, setActive] = useState(program?.is_active ?? true);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minutes = Number(requiredMinutes);
    if (
      !name.trim() ||
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      (!program && !branchId)
    )
      return;
    const handlers = {
      onSuccess: () => {
        toast.success(t(program ? 'training.updated' : 'training.created'));
        onClose();
      },
      onError: (error: Error) =>
        toast.error(extractErrorMessage(error, t('common.error'))),
    };
    if (program)
      update.mutate(
        {
          id: program.id,
          name: name.trim(),
          required_minutes: minutes,
          is_active: active,
        },
        handlers,
      );
    else
      create.mutate(
        {
          branch_id: branchId,
          name: name.trim(),
          course_type: courseType,
          category,
          required_minutes: minutes,
        },
        handlers,
      );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(program ? 'training.edit_program' : 'training.add_program')}
          </DialogTitle>
          <DialogDescription>{t('training.approval_note')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {!program && (
            <label className="block space-y-1 text-sm">
              <span>{t('common.branch')}</span>
              <select
                className={selectClass}
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
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
            <span>{t('training.program_name')}</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={150}
              required
            />
          </label>
          {!program && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>{t('common.course_type')}</span>
                <select
                  className={selectClass}
                  value={courseType}
                  onChange={(event) =>
                    setCourseType(event.target.value as CourseType)
                  }
                >
                  <option value="avto_maktab">
                    {t('training.course_type.avto_maktab')}
                  </option>
                  <option value="tezkor">
                    {t('training.course_type.tezkor')}
                  </option>
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t('training.category')}</span>
                <select
                  className={selectClass}
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as VehicleCategory)
                  }
                >
                  {VEHICLE_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <label className="block space-y-1 text-sm">
            <span>{t('training.required_minutes')}</span>
            <Input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={requiredMinutes}
              onChange={(event) => setRequiredMinutes(event.target.value)}
              required
            />
          </label>
          {program && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              {t('common.active')}
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || update.isPending}
            >
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TrainingProgramsPage = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const canManage = useCan('manageTrainingPrograms');
  const canViewAll = useCan('viewAllBranches');
  const { data: branches = [] } = useBranches(canViewAll);
  const [branchId, setBranchId] = useState('');
  const [category, setCategory] = useState<VehicleCategory | ''>('');
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<TrainingProgram | null>(null);
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
  const programs = useTrainingProgramsPage({
    branchId: canViewAll
      ? branchId || undefined
      : (user?.branch_id ?? undefined),
    category: category || undefined,
    active: showInactive ? undefined : true,
    page,
    limit: pageSize,
  });
  const visiblePrograms = useMemo(
    () =>
      (programs.data?.data ?? []).filter((program) =>
        matchesListQuery(
          debouncedSearch,
          program.name,
          program.category,
          program.course_type,
        ),
      ),
    [programs.data, debouncedSearch],
  );
  const branchName = (id: string) =>
    branches.find((branch) => branch.id === id)?.name ??
    (id === user?.branch_id ? user?.branch_name : id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('training.title')}
        title={t('training.title')}
        description={t('training.subtitle')}
        icon={<BookOpen className="h-3.5 w-3.5" />}
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('training.add_program')}
            </Button>
          )
        }
      />
      <ListSearchField value={search} onChange={setSearch} />
      <div className="glass-card grid gap-3 p-4 sm:grid-cols-3">
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
          aria-label={t('training.category')}
          className={selectClass}
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as VehicleCategory | '');
            setPage(1);
          }}
        >
          <option value="">{t('training.all_categories')}</option>
          {VEHICLE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => {
              setShowInactive(event.target.checked);
              setPage(1);
            }}
          />
          {t('training.include_inactive')}
        </label>
      </div>
      {programs.isLoading ? (
        <p>{t('common.loading')}</p>
      ) : programs.isError ? (
        <EmptyState
          title={t('common.error')}
          action={{
            label: t('common.retry'),
            onClick: () => void programs.refetch(),
          }}
        />
      ) : programs.data?.data.length ? (
        <>
          {visiblePrograms.length === 0 ? (
            <EmptyState title={t('common.no_data')} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visiblePrograms.map((program) => (
                <DataCard
                  key={program.id}
                  title={program.name}
                  subtitle={`${program.category} · ${t(`training.course_type.${program.course_type}`)}`}
                  fields={[
                    {
                      label: t('common.branch'),
                      value: branchName(program.branch_id),
                    },
                    {
                      label: t('training.required_minutes'),
                      value: `${program.required_minutes} ${t('driving.minutes')}`,
                    },
                    {
                      label: t('common.status'),
                      value: t(
                        program.is_active ? 'common.active' : 'common.inactive',
                      ),
                    },
                  ]}
                  actions={
                    canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(program);
                          setDialogOpen(true);
                        }}
                      >
                        {t('common.edit')}
                      </Button>
                    )
                  }
                />
              ))}
            </div>
          )}
          <PaginationControls
            currentPage={page}
            totalPages={Math.max(1, programs.data.meta.totalPages)}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </>
      ) : (
        <EmptyState
          title={t('training.empty_programs')}
          description={t('training.empty_programs_desc')}
        />
      )}
      {canManage && dialogOpen && (
        <ProgramDialog
          open={dialogOpen}
          program={editing}
          branches={branches}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
};

export default TrainingProgramsPage;
