import { useState, useMemo, useEffect } from 'react';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useSearchSortFilters } from '@/hooks/useSearchSortFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useFilterBarState } from '@/hooks/useFilterBarState';
import { useCan, useIsCrossTenant } from '@/hooks/useCan';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchWithHotkey } from '@/components/filter/SearchWithHotkey';
import { ActiveFilterChips } from '@/components/filter/ActiveFilterChips';
import { MobileFilterSheet } from '@/components/filter/MobileFilterSheet';
import {
  Plus,
  PencilSimple,
  Trash,
  Headphones,
  CircleNotch,
} from '@phosphor-icons/react';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import PersonModal, {
  type PersonFormPayload,
} from '@/features/staff/components/PersonModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useOperatorsPage,
  useCreateOperator,
  useUpdateOperator,
  useDeleteOperator,
} from '@/features/staff/api/operatorService';
import { useBranches } from '@/features/branches/api/branchService';
import { toast } from 'sonner';
import { User } from '@/features/staff/types';
import { formatPhone } from '@/lib/phoneFormater';
import { mutationErrorToast } from '@/lib/mutationErrorToast';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataGrid, createDataGridColumnHelper } from '@/shared/ui/data-grid';
import { usePageSize } from '@/hooks/useListQueryState';

const operatorColumnHelper = createDataGridColumnHelper<User>();
const NO_COLUMN_FILTERS: ColumnFiltersState = [];
const ignoreColumnFiltersChange = () => undefined;

const OperatorsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pageSize, setPageSize } = usePageSize();
  const isCrossTenant = useIsCrossTenant();
  const mayCreate = useCan('staff.create');
  const mayUpdate = useCan('staff.update');
  const mayDelete = useCan('staff.delete');
  const { searchParams, setParams } = useUrlParams();
  const branchId = searchParams.get('branch_id') ?? '';
  const status = searchParams.get('status') ?? '';
  const isActive =
    status === 'active' ? true : status === 'inactive' ? false : undefined;

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

  const handleBranchChange = (nextBranchId: string) => {
    setParams({
      branch_id: nextBranchId || undefined,
      page: undefined,
    });
  };

  const handleStatusChange = (nextStatus: string) => {
    setParams({
      status: nextStatus || undefined,
      page: undefined,
    });
  };

  const clearAllFilters = () => {
    setParams({
      q: undefined,
      branch_id: undefined,
      status: undefined,
      page: undefined,
    });
  };

  const operatorArgs: [number, number, string?, string?, boolean?] = [
    currentPage,
    pageSize,
    debouncedSearch,
  ];
  if (branchId || isActive !== undefined) {
    operatorArgs.push(branchId || undefined, isActive);
  }

  const {
    data: operatorsPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useOperatorsPage(...operatorArgs);
  const operators = useMemo(() => operatorsPage?.data ?? [], [operatorsPage]);
  const total = operatorsPage?.meta.total ?? 0;
  const totalPages = Math.max(1, operatorsPage?.meta.totalPages ?? 1);
  const { data: branches } = useBranches();

  const selectedBranch = branchId
    ? branches?.find((b) => b.id === branchId)
    : undefined;
  const branchLabel = selectedBranch?.name || branchId;

  const { chips, activeCount, isMobileOpen, setIsMobileOpen, clearAll } =
    useFilterBarState({
      filters: [
        Boolean(isCrossTenant && branchId) && {
          id: 'branch',
          label: t('common.branch'),
          value: branchLabel,
          onRemove: () => handleBranchChange(''),
        },
        Boolean(status) && {
          id: 'status',
          label: t('common.status'),
          value:
            status === 'active' ? t('common.active') : t('common.inactive'),
          onRemove: () => handleStatusChange(''),
        },
        Boolean(search.trim()) && {
          id: 'search',
          label: t('common.search'),
          value: search,
          onRemove: () => setSearch(''),
        },
      ],
      onClearAll: clearAllFilters,
    });
  const createMut = useCreateOperator();
  const updateMut = useUpdateOperator();
  const deleteMut = useDeleteOperator();

  // Search is server-owned. GET /users exposes no sort contract, so the
  // controlled TanStack state below is intentionally limited to this page.
  const activeSortField =
    sortField === 'phone' || sortField === 'branch_name' ? sortField : 'name';
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
    if (operatorsPage && currentPage > totalPages) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, operatorsPage !== undefined, totalPages]);

  const openCreate = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const openEdit = (o: User) => {
    setEditItem(o);
    setModalOpen(true);
  };

  const handleSubmit = (data: PersonFormPayload) => {
    const payload = {
      fullName: data.fullName,
      phone: data.phone!,
      branchId: data.branchId,
    };
    if (editItem) {
      updateMut.mutate(
        { id: editItem.id, ...payload },
        {
          onSuccess: () => {
            toast.success(t('operators.updated'));
            setModalOpen(false);
          },
          onError: (err) =>
            mutationErrorToast(err, t, () =>
              updateMut.mutate({ id: editItem.id, ...payload }),
            ),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(t('operators.added'));
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
        toast.success(t('operators.deleted'));
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

  const startIndex = (currentPage - 1) * pageSize;
  const operatorsTitle = t('operators.title');
  const columns = useMemo(
    () =>
      operatorColumnHelper.columns([
        operatorColumnHelper.display({
          id: 'rowNumber',
          header: '#',
          meta: { align: 'center' },
          cell: ({ row }) => startIndex + row.getDisplayIndex() + 1,
        }),
        operatorColumnHelper.accessor('name', {
          header: t('operators.first_name'),
          enableSorting: true,
          sortFn: 'text',
          meta: { cellClassName: 'font-medium' },
          cell: ({ getValue }) => getValue() || t('common.na'),
        }),
        operatorColumnHelper.accessor('phone', {
          header: t('operators.phone'),
          enableSorting: true,
          sortFn: 'text',
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ getValue }) => formatPhone(getValue()),
        }),
        operatorColumnHelper.accessor(
          (operator) => operator.branch_name || '',
          {
            id: 'branch_name',
            header: t('operators.branch'),
            enableSorting: true,
            sortFn: 'text',
            meta: { cellClassName: 'text-muted-foreground' },
            cell: ({ row }) =>
              row.original.branch_name ||
              (branches || []).find(
                (branch) => branch.id === row.original.branch_id,
              )?.name ||
              row.original.branch_id ||
              t('common.na'),
          },
        ),
        operatorColumnHelper.accessor('registered_students_count', {
          header: t('operators.registered_count'),
          meta: {
            align: 'center',
            cellClassName: 'text-muted-foreground tabular-nums',
          },
          cell: ({ getValue }) => getValue() ?? t('common.na'),
        }),
        operatorColumnHelper.accessor('payment_follow_through_rate', {
          header: t('operators.follow_through_rate'),
          meta: {
            align: 'center',
            cellClassName: 'text-muted-foreground tabular-nums',
          },
          cell: ({ getValue }) => {
            const rate = getValue();
            return rate != null ? `${rate}%` : t('common.na');
          },
        }),
        operatorColumnHelper.display({
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
        operatorColumnHelper.display({
          id: 'actions',
          header: t('common.actions'),
          meta: { align: 'center' },
          cell: ({ row }) => (
            <div className="flex items-center justify-center gap-1">
              {mayUpdate && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditItem(row.original);
                    setModalOpen(true);
                  }}
                  aria-label={t('common.edit')}
                  title={t('common.edit')}
                  className="flex h-11 w-11 items-center pointer-fine:h-8 pointer-fine:w-8 justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <PencilSimple className="h-3.5 w-3.5" />
                </button>
              )}
              {mayDelete && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteId(row.original.id);
                  }}
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                  className="flex h-11 w-11 items-center pointer-fine:h-8 pointer-fine:w-8 justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ),
        }),
      ]),
    [branches, startIndex, t, mayUpdate, mayDelete],
  );

  return (
    <div className="space-y-4">
      <div>
        <PageHeader
          eyebrow={operatorsTitle}
          title={operatorsTitle}
          description={
            !isLoading ? t('operators.count', { count: total }) : undefined
          }
          icon={<Headphones className="h-3.5 w-3.5" aria-hidden="true" />}
          actions={
            mayCreate && (
              <Button className="gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" /> {t('operators.add')}
              </Button>
            )
          }
        />
        {isLoading && <Skeleton className="h-4 w-24 mt-1" />}
      </div>
      {/* Filter bar */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] md:max-w-xs">
            <SearchWithHotkey
              placeholder={t('operators.search_placeholder')}
              aria-label={t('operators.search_placeholder')}
              value={search}
              onChange={setSearch}
              className="w-full"
            />
            <div className="md:hidden shrink-0">
              <MobileFilterSheet
                open={isMobileOpen}
                onOpenChange={setIsMobileOpen}
                activeCount={activeCount}
                onClearAll={clearAll}
              >
                {isMobileOpen && (
                  <div className="flex flex-col gap-4">
                    {isCrossTenant && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                          {t('common.branch')}
                        </Label>
                        <select
                          className="h-11 w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label={t('common.branch')}
                          value={branchId}
                          onChange={(e) => handleBranchChange(e.target.value)}
                        >
                          <option value="">{t('common.all_branches')}</option>
                          {branches?.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        {t('common.status')}
                      </Label>
                      <select
                        className="h-11 w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={t('common.status')}
                        value={status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                      >
                        <option value="">{t('common.all')}</option>
                        <option value="active">{t('common.active')}</option>
                        <option value="inactive">{t('common.inactive')}</option>
                      </select>
                    </div>
                  </div>
                )}
              </MobileFilterSheet>
            </div>
          </div>

          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-3">
            {isCrossTenant && (
              <div className="w-44">
                <select
                  className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={t('common.branch')}
                  value={branchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                >
                  <option value="">{t('common.all_branches')}</option>
                  {branches?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="w-36">
              <select
                className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={t('common.status')}
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="">{t('common.all')}</option>
                <option value="active">{t('common.active')}</option>
                <option value="inactive">{t('common.inactive')}</option>
              </select>
            </div>
          </div>
        </div>
        <ActiveFilterChips chips={chips} onClearAll={clearAll} />
      </div>
      <div className="relative">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
            <CircleNotch className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <DataGrid
          data={operators}
          columns={columns}
          getRowId={(operator) => operator.id}
          pagination={{
            pageIndex: currentPage - 1,
            pageSize: pageSize,
            rowCount: total,
            pageCount: totalPages,
          }}
          onPaginationChange={({ pageIndex }) => setCurrentPage(pageIndex + 1)}
          onPageSizeChange={setPageSize}
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
            table: operatorsTitle,
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
            <EmptyState icon={Headphones} title={t('operators.not_found')} />
          }
          renderMobileRow={({ row: operator }) => (
            <div className="px-3 py-1.5">
              <DataCard
                title={operator.name || t('common.na')}
                subtitle={formatPhone(operator.phone)}
                onClick={() =>
                  navigate({ to: '/users/$id', params: { id: operator.id } })
                }
                fields={[
                  {
                    label: t('operators.detail.email'),
                    value: operator.email || t('common.na'),
                  },
                  {
                    label: t('operators.detail.branch'),
                    value:
                      operator.branch_name ||
                      getBranchName(operator.branch_id || ''),
                  },
                  {
                    label: t('operators.registered_count'),
                    value: operator.registered_students_count ?? t('common.na'),
                  },
                  {
                    label: t('operators.follow_through_rate'),
                    value:
                      operator.payment_follow_through_rate != null
                        ? `${operator.payment_follow_through_rate}%`
                        : t('common.na'),
                  },
                  {
                    label: t('operators.detail.created'),
                    value: operator.created_at
                      ? new Date(operator.created_at).toLocaleDateString(
                          'uz-UZ',
                        )
                      : t('common.na'),
                  },
                  {
                    label: t('operators.detail.status'),
                    value:
                      operator.is_active !== false
                        ? t('common.active')
                        : t('common.inactive'),
                  },
                ]}
                actions={
                  <>
                    {mayUpdate && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(operator);
                        }}
                        aria-label={t('common.edit')}
                        title={t('common.edit')}
                        className="flex h-11 w-11 items-center pointer-fine:h-8 pointer-fine:w-8 justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <PencilSimple className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {mayDelete && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteId(operator.id);
                        }}
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                        className="flex h-11 w-11 items-center pointer-fine:h-8 pointer-fine:w-8 justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                }
              />
            </div>
          )}
          tableClassName="min-w-[820px]"
          className={cn(
            'glass-card overflow-hidden transition-opacity duration-200',
            isFetching && !isLoading && 'opacity-50',
          )}
          rowClassName={() => 'table-row-interactive'}
          onRowActivate={(operator) =>
            navigate({ to: '/users/$id', params: { id: operator.id } })
          }
          getRowAriaLabel={(operator) =>
            `${t('common.view')}: ${operator.name || operator.email}`
          }
        />
      </div>

      <PersonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={createMut.isPending || updateMut.isPending}
        role="operator"
        person={editItem}
        title={editItem ? t('operators.edit') : t('operators.add')}
        description={t('operators.form_desc')}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        description={
          deleteId
            ? t('operators.confirm_delete_desc', {
                name: operators?.find((o) => o.id === deleteId)?.name,
              })
            : undefined
        }
      />
    </div>
  );
};

export default OperatorsPage;
