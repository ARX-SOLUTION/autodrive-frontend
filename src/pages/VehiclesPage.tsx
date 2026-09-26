import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Car, Plus } from '@phosphor-icons/react';
import { useBranches } from '@/services/branchService';
import { useVehiclesPage } from '@/services/vehicleService';
import { useListQueryState } from '@/hooks/useListQueryState';
import { useCan } from '@/hooks/useCan';
import { useAuthStore } from '@/store/authStore';
import {
  VEHICLE_CATEGORIES,
  type VehicleCategory,
  type VehicleStatus,
} from '@/types/vehicle';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataCard } from '@/components/ui/DataCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import PaginationControls from '@/components/ui/PaginationControls';
import VehicleFormDialog from './vehicles/VehicleFormDialog';

const VehiclesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canManage = useCan('manageVehicles');
  const canViewAllBranches = useCan('viewAllBranches');
  const { data: branches = [] } = useBranches(canViewAllBranches);
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<VehicleStatus | ''>('');
  const [category, setCategory] = useState<VehicleCategory | ''>('');
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
  const branchNames = new Map(
    branches.map((branch) => [branch.id, branch.name]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('vehicles.title')}
        title={t('vehicles.title')}
        description={t('vehicles.subtitle')}
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

      <div className="glass-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Input
          aria-label={t('common.search')}
          placeholder={t('vehicles.search_placeholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {canViewAllBranches ? (
          <select
            aria-label={t('common.branch')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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
          <span className="flex h-10 items-center text-sm text-muted-foreground">
            {user?.branch_name ?? t('common.branch')}
          </span>
        )}
        <select
          aria-label={t('common.status')}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as VehicleStatus | '');
            setPage(1);
          }}
        >
          <option value="">{t('common.all')}</option>
          <option value="active">{t('vehicles.status.active')}</option>
          <option value="out_of_service">
            {t('vehicles.status.out_of_service')}
          </option>
          <option value="retired">{t('vehicles.status.retired')}</option>
        </select>
        <select
          aria-label={t('vehicles.categories')}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as VehicleCategory | '');
            setPage(1);
          }}
        >
          <option value="">{t('vehicles.all_categories')}</option>
          {VEHICLE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {t(`vehicles.categories_list.${value}`)}
            </option>
          ))}
        </select>
      </div>

      {vehicles.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : vehicles.isError ? (
        <EmptyState
          title={t('common.error')}
          action={{
            label: t('common.retry'),
            onClick: () => void vehicles.refetch(),
          }}
        />
      ) : vehicles.data?.data.length ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {vehicles.data.data.map((vehicle) => (
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
                      new Intl.NumberFormat().format(vehicle.odometer_km) +
                      ' km',
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
                              .map((reason) =>
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
            ))}
          </div>
          <PaginationControls
            currentPage={page}
            totalPages={Math.max(1, vehicles.data.meta.totalPages)}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={vehicles.data.meta.total}
          />
        </>
      ) : (
        <EmptyState
          icon={Car}
          title={t('vehicles.empty')}
          description={t('vehicles.empty_desc')}
        />
      )}

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
