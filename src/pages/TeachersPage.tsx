import { useState, useMemo, useEffect } from 'react';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useSearchSortFilters } from '@/hooks/useSearchSortFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  UsersThree,
  CircleNotch,
} from '@phosphor-icons/react';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import PersonModal, {
  type PersonFormPayload,
} from '@/components/ui/PersonModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useTeachersPage,
  useCreateTeacher,
  useUpdateTeacher,
  useDeleteTeacher,
  Specialization,
} from '@/services/teacherService';
import { useBranches } from '@/services/branchService';
import { toast } from 'sonner';
import { User } from '@/types/user';
import { mutationErrorToast } from '@/lib/mutationErrorToast';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataGrid, createDataGridColumnHelper } from '@/shared/ui/data-grid';

// Backend GetUsersQueryDto caps limit at 100 -- large enough that a single
// branch/company's teacher list never needs a second server page in
// practice, while still being real pagination (not a silent truncation)
// if it ever does.
const SERVER_PAGE_SIZE = 100;
const teacherColumnHelper = createDataGridColumnHelper<User>();
const NO_COLUMN_FILTERS: ColumnFiltersState = [];
const ignoreColumnFiltersChange = () => undefined;

const TeachersPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // MagnifyingGlass/sort/page live in the URL so reload/back/share preserve them
  // (autodrive-b85.3 -- mirrors admin-panel's useSearchSortFilters).
  const {
    search,
    setSearch,
    sortField,
    sortDir,
    toggleSort,
    page: currentPage,
    setPage: setCurrentPage,
  } = useSearchSortFilters('name');
  const debouncedSearch = useDebounce(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: teachersPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useTeachersPage(currentPage, SERVER_PAGE_SIZE, debouncedSearch);
  const teachers = useMemo(() => teachersPage?.data ?? [], [teachersPage]);
  const total = teachersPage?.meta.total ?? 0;
  const totalPages = Math.max(1, teachersPage?.meta.totalPages ?? 1);
  const { data: branches } = useBranches();
  const createMut = useCreateTeacher();
  const updateMut = useUpdateTeacher();
  const deleteMut = useDeleteTeacher();

  const specLabels = useMemo<Record<Specialization, string>>(
    () => ({
      THEORY: t('teachers.spec_theory'),
      PRACTICE: t('teachers.spec_practice'),
    }),
    [t],
  );

  // Search is server-owned. GET /users exposes no sort contract, so the
  // controlled TanStack state below is intentionally limited to this page.
  const activeSortField = sortField === 'phone' ? 'phone' : 'name';
  const sorting = useMemo<SortingState>(
    () => [{ id: activeSortField, desc: sortDir === 'desc' }],
    [activeSortField, sortDir],
  );

  const handleSortingChange = (nextSorting: SortingState) => {
    const nextSort = nextSorting[0];
    if (!nextSort) return;
    const nextDirection = nextSort.desc ? 'desc' : 'asc';
    if (nextSort.id !== activeSortField || nextDirection !== sortDir) {
      toggleSort(nextSort.id);
    }
  };

  // Out-of-range page (e.g. search narrowed results) -> reset.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages]);

  const openCreate = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const openEdit = (teacher: User) => {
    setEditItem(teacher);
    setModalOpen(true);
  };

  const handleSubmit = (data: PersonFormPayload) => {
    if (editItem) {
      const payload = {
        id: editItem.id,
        fullName: data.fullName,
        phone: data.phone,
        branchId: data.branchId,
        specialization: data.specialization,
      };
      updateMut.mutate(payload, {
        onSuccess: () => {
          toast.success(t('teachers.updated'));
          setModalOpen(false);
        },
        onError: (err) =>
          mutationErrorToast(err, t, () => updateMut.mutate(payload)),
      });
    } else {
      const payload = {
        fullName: data.fullName,
        phone: data.phone!,
        branchId: data.branchId,
        specialization: data.specialization!,
      };
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(t('teachers.added'));
          setModalOpen(false);
        },
        onError: (err) =>
          mutationErrorToast(err, t, () => createMut.mutate(payload)),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMut.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t('teachers.deleted'));
        setDeleteId(null);
      },
      onError: (err) =>
        mutationErrorToast(err, t, () => deleteMut.mutate(deleteId)),
    });
  };

  const getBranchName = (branchId?: string) =>
    (branches || []).find((b) => b.id === branchId)?.name ||
    branchId ||
    t('common.na');

  const startIndex = (currentPage - 1) * SERVER_PAGE_SIZE;
  const teachersTitle = t('teachers.title');
  const columns = useMemo(
    () =>
      teacherColumnHelper.columns([
        teacherColumnHelper.display({
          id: 'rowNumber',
          header: '#',
          meta: { align: 'center' },
          cell: ({ row }) => startIndex + row.getDisplayIndex() + 1,
        }),
        teacherColumnHelper.accessor('name', {
          header: t('teachers.first_name'),
          enableSorting: true,
          sortFn: 'text',
          meta: { cellClassName: 'font-medium' },
          cell: ({ getValue }) => getValue() || t('common.na'),
        }),
        teacherColumnHelper.accessor('phone', {
          header: t('teachers.phone'),
          enableSorting: true,
          sortFn: 'text',
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ getValue }) => getValue() || t('common.na'),
        }),
        teacherColumnHelper.accessor('specialization', {
          header: t('teachers.specialization'),
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ getValue }) => {
            const specialization = getValue();
            return specialization
              ? specLabels[specialization] || specialization
              : t('common.na');
          },
        }),
        teacherColumnHelper.display({
          id: 'branch',
          header: t('teachers.branch'),
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ row }) =>
            row.original.branch_name ||
            (branches || []).find(
              (branch) => branch.id === row.original.branch_id,
            )?.name ||
            row.original.branch_id ||
            t('common.na'),
        }),
        teacherColumnHelper.accessor('lesson_count', {
          header: t('teachers.lesson_count'),
          meta: {
            align: 'center',
            cellClassName: 'text-muted-foreground tabular-nums',
          },
          cell: ({ getValue }) => getValue() ?? t('common.na'),
        }),
        teacherColumnHelper.accessor('student_count', {
          header: t('teachers.student_count'),
          meta: {
            align: 'center',
            cellClassName: 'text-muted-foreground tabular-nums',
          },
          cell: ({ getValue }) => getValue() ?? t('common.na'),
        }),
        teacherColumnHelper.display({
          id: 'status',
          header: t('common.status'),
          meta: { align: 'center' },
          cell: ({ row }) => (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.original.is_active !== false ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
            >
              {row.original.is_active !== false
                ? t('common.active')
                : t('common.inactive')}
            </span>
          ),
        }),
        teacherColumnHelper.display({
          id: 'actions',
          header: t('common.actions'),
          meta: { align: 'center' },
          cell: ({ row }) => (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditItem(row.original);
                  setModalOpen(true);
                }}
                aria-label={t('common.edit')}
                title={t('common.edit')}
                className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <PencilSimple className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteId(row.original.id);
                }}
                aria-label={t('common.delete')}
                title={t('common.delete')}
                className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
          ),
        }),
      ]),
    [branches, specLabels, startIndex, t],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={teachersTitle}
        title={teachersTitle}
        description={t('teachers.count', { count: total })}
        icon={<UsersThree className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t('teachers.add')}
          </Button>
        }
      />
      <div className="relative max-w-sm">
        <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('teachers.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary border-border"
        />
      </div>
      <div className="relative">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
            <CircleNotch className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <DataGrid
          data={teachers}
          columns={columns}
          getRowId={(teacher) => teacher.id}
          pagination={{
            pageIndex: currentPage - 1,
            pageSize: SERVER_PAGE_SIZE,
            rowCount: total,
            pageCount: totalPages,
          }}
          onPaginationChange={({ pageIndex }) => setCurrentPage(pageIndex + 1)}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          columnFilters={NO_COLUMN_FILTERS}
          onColumnFiltersChange={ignoreColumnFiltersChange}
          manualPagination
          manualSorting={false}
          manualFiltering
          isInitialLoading={isLoading}
          isFetching={isFetching}
          labels={{
            table: teachersTitle,
            loading: t('common.loading'),
            fetching: t('common.loading'),
            previousPage: t('common.previous'),
            nextPage: t('common.next'),
          }}
          loadingState={
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-5 w-full" />
              ))}
            </div>
          }
          errorState={
            isError ? (
              <EmptyState
                title={t('common.error')}
                action={{ label: t('common.retry'), onClick: () => refetch() }}
              />
            ) : undefined
          }
          emptyState={
            <EmptyState icon={UsersThree} title={t('teachers.not_found')} />
          }
          renderMobileRow={({ row: teacher }) => (
            <div className="px-3 py-1.5">
              <DataCard
                title={teacher.name || t('common.na')}
                subtitle={teacher.phone}
                onClick={() =>
                  navigate({ to: '/users/$id', params: { id: teacher.id } })
                }
                fields={[
                  {
                    label: t('teachers.specialization'),
                    value: teacher.specialization
                      ? specLabels[teacher.specialization] ||
                        teacher.specialization
                      : t('common.na'),
                  },
                  {
                    label: t('teachers.email'),
                    value: teacher.email || t('common.na'),
                  },
                  {
                    label: t('teachers.branch'),
                    value:
                      teacher.branch_name ||
                      getBranchName(teacher.branch_id || ''),
                  },
                  {
                    label: t('teachers.lesson_count'),
                    value: teacher.lesson_count ?? t('common.na'),
                  },
                  {
                    label: t('teachers.student_count'),
                    value: teacher.student_count ?? t('common.na'),
                  },
                  {
                    label: t('operators.detail.created'),
                    value: teacher.created_at
                      ? new Date(teacher.created_at).toLocaleDateString('uz-UZ')
                      : t('common.na'),
                  },
                ]}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(teacher);
                      }}
                      aria-label={t('common.edit')}
                      title={t('common.edit')}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <PencilSimple className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteId(teacher.id);
                      }}
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </>
                }
              />
            </div>
          )}
          tableClassName="min-w-[900px]"
          className={cn(
            'glass-card overflow-hidden transition-opacity duration-200',
            isFetching && !isLoading && 'opacity-50',
          )}
          rowClassName={() => 'table-row-interactive'}
          onRowActivate={(teacher) =>
            navigate({ to: '/users/$id', params: { id: teacher.id } })
          }
          getRowAriaLabel={(teacher) =>
            `${t('common.view')}: ${teacher.name || teacher.email}`
          }
        />
      </div>

      <PersonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={createMut.isPending || updateMut.isPending}
        role="teacher"
        person={editItem}
        title={editItem ? t('teachers.edit') : t('teachers.add')}
        description={t('teachers.form_desc')}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        description={
          deleteId
            ? t('teachers.confirm_delete_desc', {
                name: teachers?.find((tc) => tc.id === deleteId)?.name,
              })
            : undefined
        }
      />
    </div>
  );
};

export default TeachersPage;
