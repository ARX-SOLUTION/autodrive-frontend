import { useState, useMemo, useEffect } from 'react';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { useNavigate } from '@/app/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useUsersPage,
  useCreateManager,
  useUpdateUser,
  useDeleteUser,
  useRestoreUser,
} from '@/services/userService';
import { useBranches } from '@/services/branchService';
import { RoleGate } from '@/components/RoleGate';
import { useCan, useIsCrossTenant } from '@/hooks/useCan';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlParams } from '@/hooks/useUrlParams';
import { extractErrorMessage } from '@/lib/errors';
import { mutationErrorToast } from '@/lib/mutationErrorToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import PersonModal, {
  type PersonFormPayload,
} from '@/components/ui/PersonModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import {
  UserGear,
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  ArrowCounterClockwise,
  CircleNotch,
} from '@phosphor-icons/react';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { DeletedBadge } from '@/components/ui/DeletedBadge';
import { cn } from '@/lib/utils';
import type { User } from '@/types/user';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataGrid, createDataGridColumnHelper } from '@/shared/ui/data-grid';

const formatDate = (d?: string) => {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd.MM.yyyy');
  } catch {
    return d;
  }
};

// Backend GetUsersQueryDto caps limit at 100 -- large enough that a single
// branch/company's manager list never needs a second server page in
// practice, while still being real pagination (not a silent truncation)
// if it ever does.
const SERVER_PAGE_SIZE = 100;
const userColumnHelper = createDataGridColumnHelper<User>();
const NO_COLUMN_FILTERS: ColumnFiltersState = [];
const ignoreColumnFiltersChange = () => undefined;

const UsersPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isCrossTenant = useIsCrossTenant();
  const canViewDeleted = useCan('viewDeleted');

  // Filter state lives in the URL (autodrive-b85.2), same pattern as
  // StudentsPage's searchParams/setParam.
  const { searchParams, setParam, setParams } = useUrlParams();
  const search = searchParams.get('q') ?? '';
  const setSearch = (v: string) =>
    setParams({ q: v || undefined, page: undefined });
  const branchId = searchParams.get('branch_id') ?? undefined;
  const setBranchId = (v: string | undefined) =>
    setParams({ branch_id: v, page: undefined });
  const isActiveParam = searchParams.get('is_active') ?? undefined;
  const isActive =
    isActiveParam === 'true'
      ? true
      : isActiveParam === 'false'
        ? false
        : undefined;
  const setIsActive = (v: string) =>
    setParams({
      is_active: v === 'all' ? undefined : v,
      page: undefined,
    });

  const debouncedSearch = useDebounce(search, 300);

  // autodrive-cg9: owner-only "show deleted" toggle -- local state (not
  // URL), defaults off.
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // Page in the URL too (like every other filter here) so refresh/share
  // preserves it instead of silently resetting to page 1.
  const currentPage = Number(searchParams.get('page')) || 1;
  const setCurrentPage = (p: number) =>
    setParam('page', p > 1 ? String(p) : undefined);
  const {
    data: usersPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useUsersPage('manager', currentPage, SERVER_PAGE_SIZE, {
    search: debouncedSearch,
    branchId,
    isActive,
    // Defensive even though the toggle only renders for an owner: never let
    // a stray true reach the request for anyone else (403 on the wire).
    includeDeleted: canViewDeleted && includeDeleted,
  });
  const users = useMemo(() => usersPage?.data ?? [], [usersPage]);
  const totalPages = Math.max(1, usersPage?.meta.totalPages ?? 1);

  // Deleting the last row of the last page leaves currentPage pointing past
  // the new totalPages -- clamp back, same fix as GroupsPage (autodrive-52v.3).
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const { data: branches } = useBranches();
  const createMut = useCreateManager();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();
  const restoreMut = useRestoreUser();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const openCreate = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditItem(u);
    setModalOpen(true);
  };

  const handleSubmit = (data: PersonFormPayload) => {
    if (editItem) {
      updateMut.mutate(
        {
          id: editItem.id,
          fullName: data.fullName,
          phone: data.phone,
          branchId: data.branchId,
        },
        {
          onSuccess: () => {
            toast.success(t('users.updated'));
            setModalOpen(false);
          },
          onError: (err) =>
            mutationErrorToast(err, t, () =>
              updateMut.mutate({
                id: editItem.id,
                fullName: data.fullName,
                phone: data.phone,
                branchId: data.branchId,
              }),
            ),
        },
      );
    } else {
      createMut.mutate(
        {
          fullName: data.fullName,
          email: data.email!,
          password: data.password!,
          phone: data.phone,
          branchId: data.branchId!,
        },
        {
          onSuccess: () => {
            toast.success(t('users.added'));
            setModalOpen(false);
          },
          onError: (err) =>
            toast.error(extractErrorMessage(err, t('common.error'))),
        },
      );
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMut.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t('users.deleted'));
        setDeleteId(null);
      },
      onError: (err) =>
        mutationErrorToast(err, t, () => deleteMut.mutate(deleteId)),
    });
  };

  const handleRestore = () => {
    if (!restoreId) return;
    restoreMut.mutate(restoreId, {
      onSuccess: () => {
        toast.success(t('users.restored'));
        setRestoreId(null);
      },
      onError: (err) =>
        mutationErrorToast(err, t, () => restoreMut.mutate(restoreId)),
    });
  };

  const startIndex = (currentPage - 1) * SERVER_PAGE_SIZE;
  const usersTitle = t('users.title');
  const columns = useMemo(
    () =>
      userColumnHelper.columns([
        userColumnHelper.display({
          id: 'rowNumber',
          header: '#',
          meta: { align: 'center' },
          cell: ({ row }) => startIndex + row.getDisplayIndex() + 1,
        }),
        userColumnHelper.accessor('email', {
          header: t('common.email'),
          enableSorting: true,
          sortFn: 'text',
          meta: { cellClassName: 'font-medium' },
          cell: ({ row, getValue }) => (
            <span className="inline-flex items-center gap-1.5">
              {getValue()}
              {row.original.deleted_at ? <DeletedBadge /> : null}
            </span>
          ),
        }),
        userColumnHelper.accessor('phone', {
          header: t('users.detail.phone'),
          enableSorting: true,
          sortFn: 'text',
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ getValue }) => getValue() || t('common.na'),
        }),
        userColumnHelper.accessor('branch_name', {
          header: t('users.detail.branch'),
          enableSorting: true,
          sortFn: 'text',
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ getValue }) => getValue() || t('common.na'),
        }),
        userColumnHelper.display({
          id: 'status',
          header: t('common.status'),
          meta: { align: 'center' },
          cell: ({ row }) => (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.original.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
            >
              {row.original.is_active
                ? t('common.active')
                : t('common.inactive')}
            </span>
          ),
        }),
        userColumnHelper.accessor('created_at', {
          header: t('users.detail.created'),
          enableSorting: true,
          sortFn: 'datetime',
          meta: { cellClassName: 'text-muted-foreground tabular-nums' },
          cell: ({ getValue }) => formatDate(getValue()),
        }),
        userColumnHelper.display({
          id: 'actions',
          header: t('common.actions'),
          meta: { align: 'center' },
          cell: ({ row }) => {
            const user = row.original;
            return user.deleted_at ? (
              canViewDeleted ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setRestoreId(user.id);
                  }}
                  aria-label={t('common.restore')}
                  title={t('common.restore')}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ArrowCounterClockwise className="h-3.5 w-3.5" />
                </button>
              ) : null
            ) : (
              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditItem(user);
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
                    setDeleteId(user.id);
                  }}
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          },
        }),
      ]),
    [canViewDeleted, startIndex, t],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={usersTitle}
        title={usersTitle}
        description={t('users.count', {
          count: usersPage?.meta.total ?? users.length,
        })}
        icon={<UserGear className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          <RoleGate cap="manageStaff">
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('users.add')}
            </Button>
          </RoleGate>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        {isCrossTenant && (
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => setBranchId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder={t('common.branch')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {(branches || []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={isActiveParam ?? 'all'} onValueChange={setIsActive}>
          <SelectTrigger className="w-36 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="true">{t('common.active')}</SelectItem>
            <SelectItem value="false">{t('common.inactive')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('users.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>

        {canViewDeleted && (
          <div className="flex items-center gap-2">
            <Label htmlFor="users-show-deleted">
              {t('common.show_deleted')}
            </Label>
            <Switch
              id="users-show-deleted"
              checked={includeDeleted}
              onCheckedChange={(checked) => {
                setIncludeDeleted(checked);
                setParam('page', undefined);
              }}
            />
          </div>
        )}
      </div>

      <div className="relative">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
            <CircleNotch className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <DataGrid
          data={users}
          columns={columns}
          getRowId={(user) => user.id}
          pagination={{
            pageIndex: currentPage - 1,
            pageSize: SERVER_PAGE_SIZE,
            rowCount: usersPage?.meta.total ?? users.length,
            pageCount: totalPages,
          }}
          onPaginationChange={({ pageIndex }) => setCurrentPage(pageIndex + 1)}
          sorting={sorting}
          onSortingChange={setSorting}
          columnFilters={NO_COLUMN_FILTERS}
          onColumnFiltersChange={ignoreColumnFiltersChange}
          manualPagination
          // GET /users has no supported sort parameters. The grid therefore
          // sorts only the current server page instead of faking global sort.
          manualSorting={false}
          manualFiltering
          isInitialLoading={isLoading}
          isFetching={isFetching}
          labels={{
            table: usersTitle,
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
            <EmptyState icon={UserGear} title={t('users.not_found')} />
          }
          renderMobileRow={({ row: user }) => (
            <div className="px-3 py-1.5">
              <DataCard
                title={
                  <span className="inline-flex items-center gap-1.5">
                    {user.name || user.email}
                    {user.deleted_at ? <DeletedBadge /> : null}
                  </span>
                }
                subtitle={user.email}
                onClick={() => navigate(`/users/${user.id}`)}
                className={user.deleted_at ? 'opacity-60' : undefined}
                fields={[
                  {
                    label: t('users.detail.branch'),
                    value: user.branch_name ?? t('common.na'),
                  },
                  {
                    label: t('users.detail.phone'),
                    value: user.phone ?? t('common.na'),
                  },
                  {
                    label: t('users.detail.created'),
                    value: formatDate(user.created_at),
                  },
                ]}
                actions={
                  user.deleted_at ? (
                    canViewDeleted ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setRestoreId(user.id);
                        }}
                        aria-label={t('common.restore')}
                        title={t('common.restore')}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <ArrowCounterClockwise className="h-3.5 w-3.5" />
                      </button>
                    ) : null
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(user);
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
                          setDeleteId(user.id);
                        }}
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )
                }
              />
            </div>
          )}
          tableClassName="min-w-[760px]"
          className={cn(
            'glass-card overflow-hidden transition-opacity duration-200',
            isFetching && !isLoading && 'opacity-50',
          )}
          rowClassName={(user) =>
            cn('table-row-interactive', user.deleted_at && 'opacity-60')
          }
          onRowActivate={(user) => navigate(`/users/${user.id}`)}
          getRowAriaLabel={(user) =>
            `${t('common.view')}: ${user.name || user.email}`
          }
        />
      </div>

      <PersonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={createMut.isPending || updateMut.isPending}
        role="manager"
        person={editItem}
        title={editItem ? t('users.edit') : t('users.add_title')}
        description={t('users.add_desc')}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        description={
          deleteId
            ? t('users.confirm_delete_desc', {
                name: users.find((u) => u.id === deleteId)?.name,
              })
            : undefined
        }
      />

      {/* autodrive-cg9: restore only un-deletes this row -- honesty
          requirement, see common.confirm_restore_desc. */}
      <ConfirmDialog
        open={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={handleRestore}
        loading={restoreMut.isPending}
        title={t('common.confirm_restore_title')}
        description={t('common.confirm_restore_desc')}
        confirmLabel={
          restoreMut.isPending ? t('common.restoring') : t('common.restore')
        }
      />
    </div>
  );
};

export default UsersPage;
