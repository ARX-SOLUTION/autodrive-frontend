import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Car, CaretRight, Plus } from '@phosphor-icons/react';
import { useBranches } from '@/features/branches/api/branchService';
import { useVehiclesPage } from '@/features/vehicles/api/vehicleService';
import { useListQueryState } from '@/hooks/useListQueryState';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useFilterBarState } from '@/hooks/useFilterBarState';
import { useCan } from '@/hooks/useCan';
import { useAuthStore } from '@/store/authStore';
import {
  VEHICLE_CATEGORIES,
  type Vehicle,
  type VehicleCategory,
  type VehicleStatus,
} from '@/features/vehicles/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataCard } from '@/components/ui/DataCard';
import { Button } from '@/components/ui/button';
import { SearchWithHotkey } from '@/components/filter/SearchWithHotkey';
import { ActiveFilterChips } from '@/components/filter/ActiveFilterChips';
import { EmptyState } from '@/components/ui/EmptyState';
import VehicleFormDialog from '@/features/vehicles/components/VehicleFormDialog';
import { DataGrid, createDataGridColumnHelper } from '@/shared/ui/data-grid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const vehicleColumnHelper = createDataGridColumnHelper<Vehicle>();

const VehiclesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canInspect = useCan('viewInspections');
  const canManage = useCan('manageVehicles');
  const canViewAllBranches = useCan('viewAllBranches');
  const { data: branches = [] } = useBranches(canViewAllBranches);
  const { searchParams, setParams } = useUrlParams();
  const branchId = searchParams.get('branch_id') ?? '';
  const status = (searchParams.get('status') ?? '') as VehicleStatus | '';
  const category = (searchParams.get('category') ?? '') as VehicleCategory | '';
  const [formOpen, setFormOpen] = useState(false);
  const {
    page,
    pageSize,
    search,
    debouncedSearch,
    setPage,
    setPageSize,
    setSearch,
  } = useListQueryState();

  const handleBranchChange = (nextBranchId: string) => {
    setParams({
      branch_id: nextBranchId || undefined,
      page: undefined,
    });
  };

  const handleStatusChange = (nextStatus: VehicleStatus | '') => {
    setParams({
      status: nextStatus || undefined,
      page: undefined,
    });
  };

  const handleCategoryChange = (nextCategory: VehicleCategory | '') => {
    setParams({
      category: nextCategory || undefined,
      page: undefined,
    });
  };

  const clearFilters = () => {
    setParams({
      q: undefined,
      branch_id: undefined,
      status: undefined,
      category: undefined,
      page: undefined,
    });
  };

  const vehicles = useVehiclesPage({
    branchId: canViewAllBranches
      ? branchId || undefined
      : (user?.branch_id ?? undefined),
    search: debouncedSearch.trim() || undefined,
    status: status || undefined,
    category: category || undefined,
    page,
    limit: pageSize,
  });
  const branchNames = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );
  const hasFilters = Boolean(search.trim() || branchId || status || category);

  const selectedBranch = branchId
    ? branches.find((b) => b.id === branchId)
    : undefined;
  const branchLabel = selectedBranch?.name || branchId;

  const { chips, clearAll } = useFilterBarState({
    filters: [
      Boolean(canViewAllBranches && branchId) && {
        id: 'branch',
        label: t('common.branch'),
        value: branchLabel,
        onRemove: () => handleBranchChange(''),
      },
      Boolean(status) && {
        id: 'status',
        label: t('common.status'),
        value: t(`vehicles.status.${status}`, { defaultValue: status }),
        onRemove: () => handleStatusChange(''),
      },
      Boolean(category) && {
        id: 'category',
        label: t('vehicles.categories'),
        value: t(`vehicles.categories_list.${category}`, {
          defaultValue: category,
        }),
        onRemove: () => handleCategoryChange(''),
      },
      Boolean(search.trim()) && {
        id: 'search',
        label: t('common.search'),
        value: search,
        onRemove: () => setSearch(''),
      },
    ],
    onClearAll: clearFilters,
  });

  const startIndex = (page - 1) * pageSize;

  const columns = useMemo(
    () =>
      vehicleColumnHelper.columns([
        vehicleColumnHelper.display({
          id: 'rowNumber',
          header: '#',
          meta: {
            align: 'center',
            cellClassName: 'text-muted-foreground w-12',
          },
          cell: ({ row }) => startIndex + row.getDisplayIndex() + 1,
        }),
        vehicleColumnHelper.accessor('plate_number', {
          header: t('vehicles.plate'),
          meta: { cellClassName: 'font-mono font-semibold' },
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/vehicles/$id',
                  params: { id: row.original.id },
                })
              }
              className="text-left font-semibold font-mono text-foreground hover:underline"
            >
              {row.original.plate_number}
            </button>
          ),
        }),
        vehicleColumnHelper.display({
          id: 'model',
          header: t('vehicles.model'),
          meta: { cellClassName: 'font-medium' },
          cell: ({ row }) => `${row.original.make} ${row.original.model}`,
        }),
        vehicleColumnHelper.display({
          id: 'branch',
          header: t('common.branch'),
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ row }) =>
            branchNames.get(row.original.branch_id) ??
            (row.original.branch_id === user?.branch_id
              ? user?.branch_name
              : row.original.branch_id),
        }),
        vehicleColumnHelper.accessor('categories', {
          header: t('vehicles.categories'),
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ getValue }) => getValue().join(', '),
        }),
        vehicleColumnHelper.accessor('odometer_km', {
          header: t('vehicles.odometer'),
          meta: {
            align: 'right',
            cellClassName: 'tabular-nums text-muted-foreground',
          },
          cell: ({ getValue }) =>
            `${new Intl.NumberFormat().format(getValue())} km`,
        }),
        vehicleColumnHelper.accessor('status', {
          header: t('common.status'),
          meta: { align: 'center' },
          cell: ({ getValue }) => {
            const val = getValue();
            const colorClass =
              val === 'active'
                ? 'bg-success/10 text-success'
                : val === 'out_of_service'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-muted text-muted-foreground';
            return (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
              >
                {t(`vehicles.status.${val}`)}
              </span>
            );
          },
        }),
        vehicleColumnHelper.display({
          id: 'booking',
          header: t('vehicles.booking'),
          meta: { align: 'center' },
          cell: ({ row }) => {
            const vehicle = row.original;
            if (vehicle.available_for_booking) {
              return (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-success/10 text-success">
                  {t('vehicles.available')}
                </span>
              );
            }
            const reasons = vehicle.unavailable_reasons
              ?.map((reason) =>
                t(`vehicles.reasons.${reason}`, {
                  defaultValue: t('vehicles.unavailable'),
                }),
              )
              .join(', ');
            return (
              <div className="flex flex-col items-center">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
                  {t('vehicles.unavailable')}
                </span>
                {reasons && (
                  <span
                    className="mt-0.5 max-w-[140px] truncate text-[11px] text-muted-foreground"
                    title={reasons}
                  >
                    {reasons}
                  </span>
                )}
              </div>
            );
          },
        }),
        vehicleColumnHelper.display({
          id: 'actions',
          header: t('common.actions'),
          meta: { align: 'center' },
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/vehicles/$id',
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
    [branchNames, navigate, startIndex, t, user?.branch_id, user?.branch_name],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t('vehicles.title')}
        title={t('vehicles.title')}
        icon={<Car className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          canManage ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('vehicles.add')}
            </Button>
          ) : undefined
        }
      />

      {canInspect && (
        <Button asChild variant="outline">
          <Link to="/vehicle-inspections">{t('inspections.title')}</Link>
        </Button>
      )}
      <div className="glass-card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SearchWithHotkey
            aria-label={t('common.search')}
            placeholder={t('vehicles.search_placeholder')}
            value={search}
            onChange={setSearch}
          />
          {canViewAllBranches ? (
            <Select
              value={branchId || 'all'}
              onValueChange={(val) =>
                handleBranchChange(val === 'all' ? '' : val)
              }
            >
              <SelectTrigger
                aria-label={t('common.branch')}
                className="h-11 md:h-10 w-full bg-secondary border-border"
              >
                <SelectValue placeholder={t('common.all_branches')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all_branches')}</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="flex h-11 md:h-10 items-center text-sm text-muted-foreground">
              {user?.branch_name ?? t('common.branch')}
            </span>
          )}
          <Select
            value={status || 'all'}
            onValueChange={(val) =>
              handleStatusChange(val === 'all' ? '' : (val as VehicleStatus))
            }
          >
            <SelectTrigger
              aria-label={t('common.status')}
              className="h-11 md:h-10 w-full bg-secondary border-border"
            >
              <SelectValue placeholder={t('common.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="active">
                {t('vehicles.status.active')}
              </SelectItem>
              <SelectItem value="out_of_service">
                {t('vehicles.status.out_of_service')}
              </SelectItem>
              <SelectItem value="retired">
                {t('vehicles.status.retired')}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={category || 'all'}
            onValueChange={(val) =>
              handleCategoryChange(
                val === 'all' ? '' : (val as VehicleCategory),
              )
            }
          >
            <SelectTrigger
              aria-label={t('vehicles.categories')}
              className="h-11 md:h-10 w-full bg-secondary border-border"
            >
              <SelectValue placeholder={t('vehicles.all_categories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('vehicles.all_categories')}
              </SelectItem>
              {VEHICLE_CATEGORIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`vehicles.categories_list.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ActiveFilterChips
          chips={chips}
          onClearAll={clearAll}
          clearLabel={t('common.clear')}
        />
        {hasFilters && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={clearFilters}
            >
              {t('common.clear')}
            </Button>
          </div>
        )}
      </div>

      <DataGrid
        data={vehicles.data?.data ?? []}
        columns={columns}
        getRowId={(vehicle) => vehicle.id}
        getRowAriaLabel={(vehicle) =>
          `${vehicle.plate_number} ${vehicle.make} ${vehicle.model}`
        }
        onRowActivate={(vehicle: Vehicle) =>
          navigate({ to: '/vehicles/$id', params: { id: vehicle.id } })
        }
        pagination={{
          pageIndex: page - 1,
          pageSize,
          rowCount: vehicles.data?.meta.total ?? 0,
          pageCount: Math.max(1, vehicles.data?.meta.totalPages ?? 1),
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
        isInitialLoading={vehicles.isLoading}
        isFetching={vehicles.isFetching}
        labels={{
          table: t('vehicles.title'),
          loading: t('common.loading'),
          fetching: t('common.loading'),
          previousPage: t('common.previous'),
          nextPage: t('common.next'),
        }}
        errorState={
          vehicles.isError ? (
            <EmptyState
              title={t('common.error')}
              action={{
                label: t('common.retry'),
                onClick: () => void vehicles.refetch(),
              }}
            />
          ) : undefined
        }
        emptyState={
          <EmptyState
            icon={Car}
            title={t(
              hasFilters ? 'vehicles.no_filter_results' : 'vehicles.empty',
            )}
            description={t(
              hasFilters
                ? 'vehicles.no_filter_results_desc'
                : 'vehicles.empty_desc',
            )}
            action={
              hasFilters
                ? { label: t('common.clear'), onClick: clearFilters }
                : undefined
            }
          />
        }
        renderMobileRow={({ row: vehicle }) => (
          <DataCard
            key={vehicle.id}
            title={vehicle.plate_number}
            subtitle={`${vehicle.make} ${vehicle.model}`}
            onClick={() =>
              navigate({ to: '/vehicles/$id', params: { id: vehicle.id } })
            }
            fields={[
              {
                label: t('common.branch'),
                value:
                  branchNames.get(vehicle.branch_id) ??
                  (vehicle.branch_id === user?.branch_id
                    ? user?.branch_name
                    : vehicle.branch_id),
              },
              {
                label: t('vehicles.categories'),
                value: vehicle.categories.join(', '),
              },
              {
                label: t('vehicles.odometer'),
                value:
                  new Intl.NumberFormat().format(vehicle.odometer_km) + ' km',
              },
              {
                label: t('common.status'),
                value: t(`vehicles.status.${vehicle.status}`),
              },
              {
                label: t('vehicles.booking'),
                value: vehicle.available_for_booking
                  ? t('vehicles.available')
                  : t('vehicles.unavailable'),
              },
              ...(!vehicle.available_for_booking
                ? [
                    {
                      label: t('vehicles.reason'),
                      value:
                        vehicle.unavailable_reasons
                          ?.map((reason) =>
                            t(`vehicles.reasons.${reason}`, {
                              defaultValue: t('vehicles.unavailable'),
                            }),
                          )
                          .join(', ') || t('vehicles.unavailable'),
                    },
                  ]
                : []),
            ]}
          />
        )}
      />

      {canManage && (
        <VehicleFormDialog
          open={formOpen}
          vehicle={null}
          branches={branches}
          defaultBranchId={user?.branch_id ?? undefined}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
};

export default VehiclesPage;
