import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { useBranches } from '@/features/branches/api/branchService';
import { useVehiclesPage } from '@/features/vehicles/api/vehicleService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
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
  'h-10 w-full rounded-md border border-input bg-background px-3';
export default function InspectionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [branchId, setBranchId] = useState('');
  const branches = useBranches(user?.role === 'owner');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [create, setCreate] = useState(false);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('inspections.title')}</h1>
        {user?.role === 'teacher' && (
          <Button onClick={() => setCreate((v) => !v)}>
            {t('inspections.create')}
          </Button>
        )}
      </div>
      {user?.role === 'owner' && (
        <select
          className={selectClass}
          aria-label={t('common.branch')}
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t('common.all_branches')}</option>
          {branches.data?.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      )}
      {summary.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Object.entries(summary.data).map(([key, value]) => (
            <div className="glass-card p-4" key={key}>
              <p>{t(`inspections.${key}`)}</p>
              <strong className="text-2xl">{value}</strong>
            </div>
          ))}
        </div>
      )}
      {create && user?.role === 'teacher' && (
        <Form {...form}>
          <form
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
                      {vehicles.data?.data.map((v) => (
                        <option value={v.id} key={v.id}>
                          {v.plate_number} · {v.make} {v.model}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <PaginationControls
              currentPage={vehiclePage}
              totalPages={vehicles.data?.meta.totalPages ?? 1}
              onPageChange={setVehiclePage}
            />
            <Input
              aria-label={t('inspections.receiver_search')}
              placeholder={t('inspections.receiver_search')}
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
                    <select {...field} className={selectClass}>
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
      <select
        className={selectClass}
        aria-label={t('common.status')}
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
      >
        <option value="">{t('common.all')}</option>
        {['draft', 'submitted', 'approved', 'rejected'].map((s) => (
          <option key={s} value={s}>
            {t(`inspections.${s}`)}
          </option>
        ))}
      </select>
      {rows.isLoading ? (
        <Skeleton className="h-40" />
      ) : rows.isError ? (
        <Button onClick={() => void rows.refetch()}>{t('common.retry')}</Button>
      ) : rows.data?.data.length ? (
        <div className="grid gap-3">
          {rows.data.data.map((row) => (
            <Link
              className="glass-card block space-y-1 p-4"
              key={row.id}
              to="/vehicle-inspections/$id"
              params={{ id: row.id }}
            >
              <strong>
                {row.vehicle.plate_number} · {t(`inspections.${row.kind}`)}
              </strong>
              <p>
                {row.author.name} → {row.receiver.name}
              </p>
              <p>
                {t(`inspections.${row.status}`)} · {row.odometer_km} km ·{' '}
                {new Date(row.created_at).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p>{t('inspections.empty')}</p>
      )}
      <PaginationControls
        currentPage={page}
        totalPages={rows.data?.meta.totalPages ?? 1}
        totalItems={rows.data?.meta.total ?? 0}
        pageSize={20}
        onPageChange={setPage}
      />
    </div>
  );
}
