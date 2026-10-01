import { requestBranchId } from '@/lib/permissions';
import { useCan } from '@/hooks/useCan';
import { useExpenseBranchOptions } from '@/features/expenses/api/expenseService';
import { selectClass } from './FuelForm';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '@/store/authStore';
import axios from '@/api/axiosInstance';
import {
  ArrowLeft,
  Buildings,
  Plus,
  Wallet,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListSearchField } from '@/components/ui/ListSearchField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  useStations,
  useStationBalance,
  useReconciliations,
  useFuelMutation,
  type Station,
} from './service';

function StationEditor({
  station,
  onDone,
}: {
  station?: Station;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const branches = useExpenseBranchOptions();
  const [branchId, setBranchId] = useState(
    station?.branch_id ??
      useAuthStore.getState?.()?.activeBranchId ??
      user?.branch_id ??
      '',
  );
  const [name, setName] = useState(station?.name ?? '');
  const [taxId, setTaxId] = useState(station?.stir ?? '');
  const [address, setAddress] = useState(station?.address ?? '');
  const [contact, setContact] = useState(station?.contact ?? '');
  const [active, setActive] = useState(station?.active ?? true);
  const mutation = useFuelMutation(() => {
    const body = { name, stir: taxId || undefined, address, contact, active };
    return station
      ? axios.patch(`/fuel-stations/${station.id}`, body)
      : axios.post('/fuel-stations', { ...body, branch_id: branchId });
  });
  return (
    <form
      aria-label={t(station ? 'common.edit' : 'fuel.add_station')}
      className="glass-card space-y-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await mutation.mutateAsync(undefined);
          onDone();
        } catch {
          /* service handles error */
        }
      }}
    >
      <h2 className="font-heading text-base font-semibold">
        {t(station ? 'common.edit' : 'fuel.add_station')}
      </h2>
      {!station && (
        <label className="block space-y-1">
          <span className="text-xs font-medium">{t('common.branch')}</span>
          <select
            required
            className={selectClass}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">{t('fuel.choose')}</option>
            {requestBranchId(
              user,
              useAuthStore.getState?.()?.activeBranchId,
            ) && (
              <option
                value={
                  useAuthStore.getState?.()?.activeBranchId ??
                  user?.branch_id ??
                  ''
                }
              >
                {user?.branch_name ?? user?.branch_id}
              </option>
            )}
            {branches.data
              ?.filter(
                (b) =>
                  b.id !==
                  (useAuthStore.getState?.()?.activeBranchId ??
                    user?.branch_id),
              )
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          [name, setName, 'name', true],
          [taxId, setTaxId, 'tax_id', false],
          [address, setAddress, 'address', false],
          [contact, setContact, 'contact', false],
        ].map(([value, setter, key, required]) => (
          <label className="block space-y-1" key={String(key)}>
            <span className="text-xs font-medium">{t(`fuel.${key}`)}</span>
            <Input
              required={required as boolean}
              maxLength={300}
              value={value as string}
              onChange={(e) =>
                (setter as (value: string) => void)(e.target.value)
              }
            />
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="rounded"
        />
        {t('fuel.active')}
      </label>
      <div className="flex justify-end">
        <Button disabled={mutation.isPending} type="submit" size="sm">
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

function StationAccounts({ id }: { id: string }) {
  const { t } = useTranslation();
  const balance = useStationBalance(id);
  const [historyPage, setHistoryPage] = useState(1);
  const history = useReconciliations(id, historyPage);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const mutation = useFuelMutation(() =>
    axios.post(`/fuel-stations/${id}/reconciliations`, {
      request_id: requestId,
      statement_amount: amount,
      reason,
    }),
  );
  return (
    <section className="space-y-4 border-t pt-4">
      <h3 className="font-heading text-sm font-semibold flex items-center gap-1.5">
        <Wallet className="h-4 w-4 text-primary" />
        {t('fuel.balance')}
      </h3>
      {balance.isLoading ? (
        <div
          className="grid gap-3 sm:grid-cols-3"
          aria-label={t('common.loading')}
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : balance.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-destructive">{t('common.error')}</p>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => void balance.refetch()}
          >
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        balance.data && (
          <dl className="grid gap-3 sm:grid-cols-3">
            {Object.entries(balance.data)
              .filter(([k]) => k !== 'station_id')
              .map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted/40 p-3">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t(`fuel.${k}`)}
                  </dt>
                  <dd className="mt-0.5 font-heading text-lg font-bold tabular-nums">
                    {String(v)}
                  </dd>
                </div>
              ))}
          </dl>
        )
      )}
      <p className="text-xs text-muted-foreground">
        {t('fuel.settlement_hint')}
      </p>
      <Link
        to="/expenses"
        search={{ category: 'vehicle' }}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t('fuel.expense_link')}
      </Link>
      <form
        className="space-y-3 rounded-lg border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(undefined, {
            onSuccess: () => setRequestId(crypto.randomUUID()),
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium">
              {t('fuel.statement_amount')}
            </span>
            <Input
              required
              inputMode="decimal"
              pattern="[0-9]+(\.[0-9]{1,2})?"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium">{t('fuel.reason')}</span>
            <Input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </div>
        <Button
          disabled={mutation.isPending || !reason.trim()}
          type="submit"
          size="sm"
          className="min-h-11"
        >
          {t('fuel.reconcile')}
        </Button>
      </form>
      {history.isLoading ? (
        <div className="space-y-2" aria-label={t('common.loading')}>
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : history.isError ? (
        <EmptyState
          title={t('common.error')}
          action={{
            label: t('common.retry'),
            onClick: () => void history.refetch(),
          }}
        />
      ) : (
        <PaginationControls
          currentPage={historyPage}
          totalPages={history.data?.meta.totalPages ?? 1}
          onPageChange={setHistoryPage}
        />
      )}
      {history.data?.data.length ? (
        <div className="space-y-2">
          {history.data.data.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-baseline gap-2 text-sm rounded-lg bg-muted/30 p-3"
            >
              <span className="text-xs text-muted-foreground tabular-nums">
                {new Date(row.created_at).toLocaleString('uz-UZ')}
              </span>
              <span className="font-medium tabular-nums">
                {row.statement_amount}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('fuel.difference')}:{' '}
                <span className="font-medium">{row.discrepancy}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {row.reason}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function StationsPage() {
  const { t } = useTranslation();
  const mayCreate = useCan('fuel_stations.create');
  const mayUpdate = useCan('fuel_stations.update');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState('');
  const [editing, setEditing] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 300);
  const query = useStations({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });

  return (
    <div className="space-y-4">
      <Link
        to="/vehicle-fuel"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('fuel.title')}
      </Link>

      <PageHeader
        eyebrow={t('fuel.stations')}
        title={t('fuel.stations')}
        icon={<Buildings className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          mayCreate ? (
            <Button
              onClick={() => setCreate(!create)}
              className="min-h-11 gap-2"
              aria-expanded={create}
              aria-controls="fuel-station-create-form"
            >
              <Plus className="h-4 w-4" weight="bold" />
              {t(create ? 'common.cancel' : 'fuel.add_station')}
            </Button>
          ) : undefined
        }
      />

      {create && (
        <div id="fuel-station-create-form">
          <StationEditor onDone={() => setCreate(false)} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <ListSearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t('fuel.station_search')}
          />
        </div>
        {search && (
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => {
              setSearch('');
              setPage(1);
            }}
          >
            {t('common.clear')}
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <div className="space-y-3" aria-label={t('common.loading')}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="glass-card">
          <EmptyState
            icon={Buildings}
            title={t('common.error')}
            action={{
              label: t('common.retry'),
              onClick: () => void query.refetch(),
            }}
          />
        </div>
      ) : query.data?.data.length === 0 && debouncedSearch ? (
        <EmptyState
          icon={Buildings}
          title={t('fuel.no_station_search_results')}
          description={t('fuel.no_station_search_results_desc')}
          action={{
            label: t('common.clear'),
            onClick: () => {
              setSearch('');
              setPage(1);
            },
          }}
        />
      ) : query.data?.data.length === 0 ? (
        <EmptyState
          icon={Buildings}
          title={t('fuel.no_stations')}
          description={t('fuel.no_stations_description')}
          action={
            mayCreate
              ? {
                  label: t('fuel.add_station'),
                  onClick: () => setCreate(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4">
          {query.data?.data.map((station) => (
            <section
              key={station.id}
              className="glass-card space-y-4 p-5 [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="font-heading text-base font-semibold flex items-center gap-2">
                    <Buildings className="h-4 w-4 text-primary" />
                    {station.name}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {station.stir && (
                      <span className="tabular-nums">{station.stir}</span>
                    )}
                    {station.address && <span>· {station.address}</span>}
                    {station.contact && <span>· {station.contact}</span>}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    station.active
                      ? 'gap-1 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                      : 'gap-1 border-rose-300 text-rose-700 dark:text-rose-300'
                  }
                >
                  {station.active ? (
                    <CheckCircle className="h-3 w-3" weight="fill" />
                  ) : (
                    <XCircle className="h-3 w-3" weight="fill" />
                  )}
                  {station.active ? t('fuel.active') : t('fuel.inactive')}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {mayUpdate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    aria-expanded={editing === station.id}
                    aria-controls={`fuel-station-edit-${station.id}`}
                    onClick={() =>
                      setEditing(editing === station.id ? '' : station.id)
                    }
                  >
                    {t('common.edit')}
                  </Button>
                )}
                {mayUpdate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    aria-expanded={selected === station.id}
                    aria-controls={`fuel-station-balance-${station.id}`}
                    onClick={() =>
                      setSelected(selected === station.id ? '' : station.id)
                    }
                  >
                    <Wallet className="mr-1.5 h-3.5 w-3.5" />
                    {t('fuel.balance')}
                  </Button>
                )}
              </div>

              {editing === station.id && (
                <div id={`fuel-station-edit-${station.id}`}>
                  <StationEditor
                    station={station}
                    onDone={() => setEditing('')}
                  />
                </div>
              )}
              {selected === station.id && (
                <div id={`fuel-station-balance-${station.id}`}>
                  <StationAccounts id={station.id} />
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <PaginationControls
        currentPage={page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
