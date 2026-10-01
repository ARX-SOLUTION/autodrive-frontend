import { requestBranchId } from '@/lib/permissions';
import { useState } from 'react';
import FuelTypes from '../fuel/FuelTypes';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Car, GasPump, User, Warning } from '@phosphor-icons/react';
import { useVehicle } from '@/features/vehicles/api/vehicleService';
import { useBranches } from '@/features/branches/api/branchService';
import { useCan } from '@/hooks/useCan';
import { useUrlTab } from '@/hooks/useUrlTab';
import { useAuthStore } from '@/store/authStore';
import { formatTashkentDate } from '@/lib/calendarDateTime';
import { EntityDetailShell } from '@/components/ui/EntityDetailShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import VehicleFormDialog from '@/features/vehicles/components/VehicleFormDialog';
import VehicleOperations from '@/features/vehicles/components/VehicleOperations';
import VehicleSessionsTab from '@/features/vehicles/components/VehicleSessionsTab';
import FuelCreateDialog from '@/features/vehicles/fuel/FuelCreateDialog';

const VehicleDetailPage = () => {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useUrlTab(
    ['info', 'documents', 'maintenance', 'transfers', 'sessions'] as const,
    'info',
  );
  const { data: vehicle, isLoading, isError, refetch } = useVehicle(id ?? '');
  const canManage = useCan('vehicles.update', vehicle?.branch_id);
  const canCreateDocument = useCan(
    'vehicle_documents.create',
    vehicle?.branch_id,
  );
  const canUpdateDocument = useCan(
    'vehicle_documents.update',
    vehicle?.branch_id,
  );
  const canCreateMaintenance = useCan(
    'vehicle_maintenance.create',
    vehicle?.branch_id,
  );
  const canUpdateMaintenance = useCan(
    'vehicle_maintenance.update',
    vehicle?.branch_id,
  );
  const canTransfer = useCan('vehicle_transfers.create', vehicle?.branch_id);
  const canCreateFuel = useCan('fuel.create', vehicle?.branch_id);
  const canViewAllBranches = useCan('viewAllBranches');
  const user = useAuthStore((state) => state.user);
  const { data: branches = [] } = useBranches(canViewAllBranches);
  const [editOpen, setEditOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);
  const branchName = (branchId: string) =>
    branches.find((branch) => branch.id === branchId)?.name ??
    (branchId ===
    requestBranchId(user, useAuthStore.getState?.()?.activeBranchId)
      ? user?.branch_name
      : branchId);
  const formatDate = (value: string | null | undefined) =>
    value ? formatTashkentDate(value, i18n.language) : t('common.na');

  if (isLoading || isError || !vehicle) {
    return (
      <EntityDetailShell
        onBack={() => navigate({ to: '/vehicles' })}
        backLabel={t('vehicles.title')}
        isLoading={isLoading}
        isError={isError || !vehicle}
        errorTitle={isError ? t('common.error') : t('common.not_found')}
        errorIcon={isError ? Warning : Car}
        onRetry={() => void refetch()}
        retryLabel={t('common.retry')}
      />
    );
  }

  return (
    <EntityDetailShell
      onBack={() => navigate({ to: '/vehicles' })}
      backLabel={t('vehicles.title')}
      isLoading={false}
      isError={false}
      header={
        <div className="glass-card space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-bold">
                {vehicle.plate_number}
              </h1>
              <p className="text-sm text-muted-foreground">
                {vehicle.make} {vehicle.model} · {branchName(vehicle.branch_id)}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {vehicle.current_custodian ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-2.5 py-1 font-medium text-secondary-foreground">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>{t('vehicles.current_custodian')}:</span>
                    <strong className="text-foreground">
                      {vehicle.current_custodian.name}
                    </strong>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                    <User className="h-3.5 w-3.5 opacity-60" />
                    <span>{t('vehicles.current_custodian')}:</span>
                    <span>{t('vehicles.no_custodian')}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canCreateFuel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFuelOpen(true)}
                >
                  <GasPump className="mr-1.5 h-4 w-4 text-primary" />
                  {t('fuel.create')}
                </Button>
              )}
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                >
                  {t('common.edit')}
                </Button>
              )}
            </div>
          </div>
          <p
            className={
              vehicle.available_for_booking
                ? 'text-sm text-emerald-700 dark:text-emerald-400'
                : 'text-sm text-destructive'
            }
          >
            {vehicle.available_for_booking
              ? t('vehicles.available')
              : t('vehicles.unavailable')}
          </p>
          {!vehicle.available_for_booking &&
            vehicle.unavailable_reasons.length > 0 && (
              <ul className="list-inside list-disc text-sm text-destructive">
                {vehicle.unavailable_reasons.map((reason) => (
                  <li key={reason}>
                    {t(`vehicles.reasons.${reason}`, {
                      defaultValue: t('vehicles.unavailable'),
                    })}
                  </li>
                ))}
              </ul>
            )}
        </div>
      }
    >
      {['owner', 'manager'].includes(user?.role ?? '') && (
        <FuelTypes
          key={vehicle.id}
          id={vehicle.id}
          types={vehicle.fuel_types ?? []}
        />
      )}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto min-h-10 max-w-full flex-wrap">
          <TabsTrigger value="info">{t('common.tab_info')}</TabsTrigger>
          <TabsTrigger value="sessions">{t('vehicles.sessions')}</TabsTrigger>
          <TabsTrigger value="documents">{t('vehicles.documents')}</TabsTrigger>
          <TabsTrigger value="maintenance">
            {t('vehicles.maintenance')}
          </TabsTrigger>
          <TabsTrigger value="transfers">{t('vehicles.transfers')}</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <dl className="glass-card grid gap-4 p-5 text-sm sm:grid-cols-2">
            {[
              [t('common.branch'), branchName(vehicle.branch_id)],
              [
                t('vehicles.current_custodian'),
                vehicle.current_custodian?.name ?? t('vehicles.no_custodian'),
              ],
              [t('vehicles.vin'), vehicle.vin || t('common.na')],
              [t('vehicles.year'), String(vehicle.manufacture_year)],
              [t('vehicles.categories'), vehicle.categories.join(', ')],
              [
                t('vehicles.odometer'),
                `${new Intl.NumberFormat(i18n.language).format(vehicle.odometer_km)} km`,
              ],
              [t('common.status'), t(`vehicles.status.${vehicle.status}`)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </TabsContent>
        <TabsContent value="sessions">
          <VehicleSessionsTab vehicleId={vehicle.id} />
        </TabsContent>
        <TabsContent value="documents" className="space-y-4">
          {canCreateDocument && (
            <VehicleOperations
              kind="document"
              vehicle={vehicle}
              branches={branches}
            />
          )}
          {vehicle.documents.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {vehicle.documents.map((document) => (
                <article key={document.id} className="glass-card p-4">
                  <h2 className="font-semibold">{document.label}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t(`vehicles.document_types.${document.type}`)}
                  </p>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">
                        {t('vehicles.expires_on')}
                      </dt>
                      <dd>{formatDate(document.expires_on)}</dd>
                    </div>
                    {document.reference && (
                      <div>
                        <dt className="text-muted-foreground">
                          {t('vehicles.reference')}
                        </dt>
                        <dd>{document.reference}</dd>
                      </div>
                    )}
                  </dl>
                  {canUpdateDocument && (
                    <VehicleOperations
                      kind="editDocument"
                      vehicle={vehicle}
                      branches={branches}
                      document={document}
                    />
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title={t('vehicles.no_documents')} />
          )}
        </TabsContent>
        <TabsContent value="maintenance" className="space-y-4">
          {canCreateMaintenance && (
            <VehicleOperations
              kind="maintenance"
              vehicle={vehicle}
              branches={branches}
            />
          )}
          {vehicle.maintenance.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {vehicle.maintenance.map((record) => (
                <article key={record.id} className="glass-card p-4">
                  <h2 className="font-semibold">{record.description}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t('vehicles.started_at')}: {formatDate(record.started_at)}
                  </p>
                  <p className="mt-2 text-sm">
                    {record.completed_at
                      ? `${t('vehicles.completed_at')}: ${formatDate(record.completed_at)}`
                      : t('vehicles.maintenance_open')}
                  </p>
                  <p className="text-sm">
                    {t('vehicles.next_due_on')}:{' '}
                    {formatDate(record.next_due_on)}
                  </p>
                  <p className="text-sm">
                    {t('vehicles.next_due_odometer')}:{' '}
                    {record.next_due_odometer_km ?? t('common.na')}
                  </p>
                  {canUpdateMaintenance && (
                    <VehicleOperations
                      kind="editMaintenance"
                      vehicle={vehicle}
                      branches={branches}
                      maintenance={record}
                    />
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title={t('vehicles.no_maintenance')} />
          )}
        </TabsContent>
        <TabsContent value="transfers" className="space-y-4">
          {canTransfer && (
            <VehicleOperations
              kind="transfer"
              vehicle={vehicle}
              branches={branches}
            />
          )}
          {vehicle.transfers.length ? (
            <ol className="space-y-3">
              {vehicle.transfers.map((transfer) => (
                <li key={transfer.id} className="glass-card p-4 text-sm">
                  <div className="font-medium">
                    {branchName(transfer.from_branch_id)} →{' '}
                    {branchName(transfer.to_branch_id)}
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {formatDate(transfer.transferred_at)} · {transfer.reason}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title={t('vehicles.no_transfers')} />
          )}
        </TabsContent>
      </Tabs>
      {canManage && (
        <VehicleFormDialog
          open={editOpen}
          vehicle={vehicle}
          branches={branches}
          onClose={() => setEditOpen(false)}
        />
      )}
      {fuelOpen && (
        <FuelCreateDialog
          open={fuelOpen}
          onOpenChange={setFuelOpen}
          initialVehicleId={vehicle.id}
        />
      )}
    </EntityDetailShell>
  );
};

export default VehicleDetailPage;
