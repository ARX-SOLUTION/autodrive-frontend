import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Car, Warning } from '@phosphor-icons/react';
import { useVehicle } from '@/services/vehicleService';
import { useBranches } from '@/services/branchService';
import { useCan } from '@/hooks/useCan';
import { useAuthStore } from '@/store/authStore';
import { formatTashkentDate } from '@/lib/calendarDateTime';
import { EntityDetailShell } from '@/components/ui/EntityDetailShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import VehicleFormDialog from './vehicles/VehicleFormDialog';
import VehicleOperations from './vehicles/VehicleOperations';

const VehicleDetailPage = () => {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const canManage = useCan('manageVehicles');
  const canViewAllBranches = useCan('viewAllBranches');
  const user = useAuthStore((state) => state.user);
  const { data: branches = [] } = useBranches(canViewAllBranches);
  const [editOpen, setEditOpen] = useState(false);
  const { data: vehicle, isLoading, isError, refetch } = useVehicle(id ?? '');
  const branchName = (branchId: string) =>
    branches.find((branch) => branch.id === branchId)?.name ??
    (branchId === user?.branch_id ? user?.branch_name : branchId);
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
            </div>
            {canManage && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                {t('common.edit')}
              </Button>
            )}
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
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="h-auto min-h-10 max-w-full flex-wrap">
          <TabsTrigger value="info">{t('common.tab_info')}</TabsTrigger>
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
        <TabsContent value="documents" className="space-y-4">
          {canManage && (
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
                  {canManage && (
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
          {canManage && (
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
                  {canManage && (
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
          {canViewAllBranches && (
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
    </EntityDetailShell>
  );
};

export default VehicleDetailPage;
