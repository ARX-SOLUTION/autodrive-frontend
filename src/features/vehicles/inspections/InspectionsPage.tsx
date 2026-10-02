import { useWriteOptions } from '@/hooks/useWriteOptions';
import { useCan } from '@/hooks/useCan';
import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useFilterBarState } from '@/hooks/useFilterBarState';
import { parsePage } from '@/lib/listQuery';
import { ActiveFilterChips } from '@/components/filter/ActiveFilterChips';
import { useBranches } from '@/features/branches/api/branchService';
import { useVehiclesPage } from '@/features/vehicles/api/vehicleService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { ClipboardText } from '@phosphor-icons/react';
import {
  useInspections,
  useInspectionSummary,
  useInspectionReceivers,
  useInspectionMutation,
  createInspection,
} from './service';
import { inspectionManager } from './policy';
const schema = z.object({
  vehicle_id: z.string().min(1),
  receiver_id: z.string().min(1),
  kind: z.enum(['acceptance', 'return']),
  odometer_km: z
    .string()
    .regex(/^\d+$/)
    .refine((v) => Number.isSafeInteger(Number(v))),
  notes: z.string(),
});
const selectClass =
  'h-11 md:h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
export default function InspectionsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const mayCreate = useCan('vehicle_inspections.create');
  const branches = useBranches(user?.role === 'owner');
  const { searchParams, setParams } = useUrlParams();
  const branchId = searchParams.get('branch_id') ?? '';
  const status = searchParams.get('status') ?? '';
  const page = parsePage(searchParams.get('page'));

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

  const handlePageChange = (nextPage: number) => {
    setParams({
      page: nextPage > 1 ? String(nextPage) : undefined,
    });
  };

  const clearFilters = () => {
    setParams({
      branch_id: undefined,
      status: undefined,
      page: undefined,
    });
  };

  const selectedBranch = branchId
    ? branches.data?.find((b) => b.id === branchId)
    : undefined;
  const branchLabel = selectedBranch?.name || branchId;

  const { chips, clearAll } = useFilterBarState({
    filters: [
      Boolean(user?.role === 'owner' && branchId) && {
        id: 'branch',
        label: t('common.branch'),
        value: branchLabel,
        onRemove: () => handleBranchChange(''),
      },
      Boolean(status) && {
        id: 'status',
        label: t('common.status'),
        value: t(`inspections.${status}`, { defaultValue: status }),
        onRemove: () => handleStatusChange(''),
      },
    ],
    onClearAll: clearFilters,
  });

  const [create, setCreate] = useState(false);
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const [lookupBranchId, setLookupBranchId] = useState<string>();
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehiclePage, setVehiclePage] = useState(1);
  const [receiverSearch, setReceiverSearch] = useState('');
  const [receiverPage, setReceiverPage] = useState(1);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicle_id: '',
      receiver_id: '',
      kind: 'acceptance',
      odometer_km: '',
      notes: '',
    },
  });
  const [requestId] = useState(() => crypto.randomUUID());
  const vehicleId = useWatch({ control: form.control, name: 'vehicle_id' });
  const kind = useWatch({ control: form.control, name: 'kind' });
  const vehicles = useVehiclesPage({
    search: vehicleSearch,
    page: vehiclePage,
    limit: 20,
  });
  const options = useWriteOptions(
    'vehicle_inspections',
    'create',
    branchId || activeBranchId || lookupBranchId,
    create,
  );
  const vehicleChoices = options.scoped
    ? (options.data?.vehicles ?? []).filter((vehicle) =>
        vehicle.plate_number
          .toLowerCase()
          .includes(vehicleSearch.toLowerCase()),
      )
    : (vehicles.data?.data ?? []);
  const receivers = useInspectionReceivers(
    vehicleId,
    receiverSearch,
    receiverPage,
    kind,
  );
  const rows = useInspections({
    page,
    limit: 20,
    status: status || undefined,
    branch_id: branchId || undefined,
  });
  const summary = useInspectionSummary(inspectionManager(user?.role));
  const mutation = useInspectionMutation(createInspection);
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('vehicles.title')}
        title={t('inspections.title')}
        icon={<ClipboardText className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          mayCreate ? (
            <Button
              aria-expanded={create}
              aria-controls="inspection-create-form"
              onClick={() => setCreate((v) => !v)}
            >
              {t(create ? 'common.cancel' : 'inspections.create')}
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-2">
        <div className="glass-card grid gap-3 p-4 sm:grid-cols-2">
          {user?.role === 'owner' && (
            <select
              className={selectClass}
              aria-label={t('common.branch')}
              value={branchId}
              onChange={(e) => handleBranchChange(e.target.value)}
            >
              <option value="">{t('common.all_branches')}</option>
              {branches.data?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
          <select
            className={selectClass}
            aria-label={t('common.status')}
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">{t('common.all')}</option>
            {['draft', 'submitted', 'approved', 'rejected'].map((s) => (
              <option key={s} value={s}>
                {t(`inspections.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <ActiveFilterChips chips={chips} onClearAll={clearAll} />
      </div>
      {summary.isLoading && (
        <div
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          aria-label={t('common.loading')}
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-lg" />
          ))}
        </div>
      )}
      {summary.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4"
        >
          <p className="text-sm text-destructive">{t('common.error')}</p>
          <Button variant="outline" onClick={() => void summary.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      )}
      {summary.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Object.entries(summary.data).map(([key, value]) => (
            <div className="glass-card p-4" key={key}>
              <p className="text-sm text-muted-foreground">
                {t(`inspections.${key}`)}
              </p>
              <strong className="mt-1 block text-2xl tabular-nums">
                {value}
              </strong>
            </div>
          ))}
        </div>
      )}
      {create && mayCreate && (
        <Form {...form}>
          <form
            id="inspection-create-form"
            className="glass-card space-y-4 p-4"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                const result = await mutation.mutateAsync({
                  ...values,
                  request_id: requestId,
                  odometer_km: Number(values.odometer_km),
                });
                await navigate({
                  to: '/vehicle-inspections/$id',
                  params: { id: (result as { id: string }).id },
                });
              } catch {
                /* service reports error */
              }
            })}
          >
            {options.scoped &&
              !branchId &&
              !activeBranchId &&
              options.branches.length > 1 && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium">
                    {t('common.select_branch')}
                  </span>
                  <select
                    className={selectClass}
                    value={options.selectedBranchId ?? ''}
                    onChange={(event) => {
                      setLookupBranchId(event.target.value);
                      form.setValue('vehicle_id', '');
                      form.setValue('receiver_id', '');
                    }}
                  >
                    <option value="">{t('common.select_branch')}</option>
                    {options.branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            {options.scoped && options.isFetching && (
              <p role="status">{t('common.loading')}</p>
            )}
            {options.scoped && options.isError && (
              <p role="alert">
                {t('common.error')}{' '}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void options.refetch()}
                >
                  {t('common.retry')}
                </Button>
              </p>
            )}
            {options.scoped &&
              options.selectedBranchId &&
              !options.isFetching &&
              !options.isError &&
              vehicleChoices.length === 0 &&
              ((options.data?.vehicles ?? []).length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-sm">
                  <p className="font-medium">{t('vehicles.no_eligible')}</p>
                  <p className="text-muted-foreground">
                    {t('vehicles.no_eligible_desc')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('vehicles.no_filter_results')}
                </p>
              ))}
            <Input
              aria-label={t('inspections.vehicle_search')}
              placeholder={t('inspections.vehicle_search')}
              value={vehicleSearch}
              onChange={(e) => {
                setVehicleSearch(e.target.value);
                setVehiclePage(1);
              }}
            />
            <FormField
              control={form.control}
              name="vehicle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspections.vehicle')}</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className={selectClass}
                      onChange={(e) => {
                        field.onChange(e);
                        form.setValue('receiver_id', '');
                        setReceiverPage(1);
                      }}
                    >
                      <option value="">{t('inspections.choose')}</option>
                      {vehicleChoices.map((v) => (
                        <option value={v.id} key={v.id}>
                          {v.plate_number} {'make' in v ? String(v.make) : ''}{' '}
                          {v.model}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!options.scoped && (
              <PaginationControls
                currentPage={vehiclePage}
                totalPages={vehicles.data?.meta.totalPages ?? 1}
                onPageChange={setVehiclePage}
              />
            )}
            <Input
              aria-label={t('inspections.receiver_search')}
              placeholder={t('inspections.receiver_search')}
              disabled={!vehicleId}
              value={receiverSearch}
              onChange={(e) => {
                setReceiverSearch(e.target.value);
                setReceiverPage(1);
              }}
            />
            <FormField
              control={form.control}
              name="receiver_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspections.receiver')}</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className={selectClass}
                      disabled={!vehicleId}
                      aria-describedby={
                        vehicleId ? undefined : 'inspection-receiver-hint'
                      }
                    >
                      <option value="">{t('inspections.choose')}</option>
                      {receivers.data?.data
                        .filter((u) => u.id !== user?.id)
                        .map((u) => (
                          <option value={u.id} key={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </FormControl>
                  {!vehicleId && (
                    <p
                      id="inspection-receiver-hint"
                      className="text-xs text-muted-foreground"
                    >
                      {t('inspections.receiver_needs_vehicle')}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <PaginationControls
              currentPage={receiverPage}
              totalPages={receivers.data?.meta.totalPages ?? 1}
              onPageChange={setReceiverPage}
            />
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspections.kind')}</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className={selectClass}
                      onChange={(e) => {
                        field.onChange(e);
                        form.setValue('receiver_id', '');
                        setReceiverPage(1);
                      }}
                    >
                      {['acceptance', 'return'].map((kind) => (
                        <option key={kind} value={kind}>
                          {t(`inspections.${kind}`)}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(['odometer_km', 'notes'] as const).map((name) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(`inspections.${name}`)}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode={
                          name === 'odometer_km' ? 'numeric' : undefined
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button type="submit" disabled={mutation.isPending}>
              {t('inspections.create')}
            </Button>
          </form>
        </Form>
      )}
      {rows.isLoading ? (
        <div className="space-y-3" aria-label={t('common.loading')}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : rows.isError ? (
        <EmptyState
          title={t('common.error')}
          description={t('inspections.load_error_desc')}
          action={{
            label: t('common.retry'),
            onClick: () => void rows.refetch(),
          }}
        />
      ) : rows.data?.data.length ? (
        <div className="grid gap-3">
          {rows.data.data.map((row) => (
            <Link
              className="glass-card block space-y-2 rounded-lg p-4 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              key={row.id}
              to="/vehicle-inspections/$id"
              params={{ id: row.id }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <strong className="text-foreground">
                  {row.vehicle.plate_number} · {t(`inspections.${row.kind}`)}
                </strong>
                <Badge variant="outline">
                  {t(`inspections.${row.status}`)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {row.author.name} → {row.receiver.name}
              </p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {row.odometer_km.toLocaleString(i18n.language)} km ·{' '}
                <time dateTime={row.created_at}>
                  {new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Asia/Tashkent',
                  }).format(new Date(row.created_at))}
                </time>
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t('inspections.empty')}
          description={t(
            status ? 'inspections.no_results_desc' : 'inspections.empty_desc',
          )}
          action={
            status || branchId
              ? {
                  label: t('common.clear'),
                  onClick: clearFilters,
                }
              : undefined
          }
        />
      )}
      <PaginationControls
        currentPage={page}
        totalPages={rows.data?.meta.totalPages ?? 1}
        totalItems={rows.data?.meta.total ?? 0}
        pageSize={20}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
