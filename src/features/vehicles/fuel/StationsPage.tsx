import { useExpenseBranchOptions } from '@/features/expenses/api/expenseService';
import { selectClass } from './FuelForm';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '@/store/authStore';
import axios from '@/api/axiosInstance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  useStations,
  useStationBalance,
  useReconciliations,
  useFuelMutation,
  type Station,
} from './service';
import { canReviewFuel } from './policy';
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
    station?.branch_id ?? user?.branch_id ?? '',
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
      className="space-y-3 rounded border p-3"
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
      {!station && (
        <label>
          {t('common.branch')}
          <select
            required
            className={selectClass}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">{t('fuel.choose')}</option>
            {user?.branch_id && (
              <option value={user.branch_id}>
                {user.branch_name ?? user.branch_id}
              </option>
            )}
            {branches.data
              ?.filter((b) => b.id !== user?.branch_id)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </label>
      )}
      {[
        [name, setName, 'name'],
        [taxId, setTaxId, 'tax_id'],
        [address, setAddress, 'address'],
        [contact, setContact, 'contact'],
      ].map(([value, setter, key]) => (
        <label className="block" key={String(key)}>
          {t(`fuel.${key}`)}
          <Input
            required={key === 'name'}
            maxLength={300}
            value={value as string}
            onChange={(e) =>
              (setter as (value: string) => void)(e.target.value)
            }
          />
        </label>
      ))}
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        {t('fuel.active')}
      </label>
      <Button disabled={mutation.isPending} type="submit">
        {t('common.save')}
      </Button>
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
    <section className="space-y-3">
      <h3>{t('fuel.balance')}</h3>
      {balance.isError ? (
        <Button onClick={() => void balance.refetch()}>
          {t('common.retry')}
        </Button>
      ) : (
        balance.data && (
          <dl className="grid gap-2 sm:grid-cols-3">
            {Object.entries(balance.data)
              .filter(([k]) => k !== 'station_id')
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{t(`fuel.${k}`)}</dt>
                  <dd className="font-semibold">{String(v)}</dd>
                </div>
              ))}
          </dl>
        )
      )}
      <p>{t('fuel.settlement_hint')}</p>
      <Link to="/expenses" search={{ category: 'vehicle' }}>
        {t('fuel.expense_link')}
      </Link>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(undefined, {
            onSuccess: () => setRequestId(crypto.randomUUID()),
          });
        }}
      >
        <label className="block">
          {t('fuel.statement_amount')}
          <Input
            required
            inputMode="decimal"
            pattern="[0-9]+(\.[0-9]{1,2})?"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="block">
          {t('fuel.reason')}
          <Input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <Button disabled={mutation.isPending || !reason.trim()} type="submit">
          {t('fuel.reconcile')}
        </Button>
      </form>
      <PaginationControls
        currentPage={historyPage}
        totalPages={history.data?.meta.totalPages ?? 1}
        onPageChange={setHistoryPage}
      />
      {history.data?.data.map((row) => (
        <p key={row.id}>
          {new Date(row.created_at).toLocaleString()} · {row.statement_amount} ·{' '}
          {t('fuel.difference')}: {row.discrepancy} · {row.reason}
        </p>
      ))}
    </section>
  );
}
export default function StationsPage() {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState('');
  const [editing, setEditing] = useState('');
  const query = useStations({ page, limit: 20, search });
  return (
    <div className="space-y-4">
      <Link to="/vehicle-fuel">{t('fuel.title')}</Link>
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('fuel.stations')}</h1>
        {canReviewFuel(role) && (
          <Button onClick={() => setCreate(!create)}>
            {t('fuel.add_station')}
          </Button>
        )}
      </div>
      {create && <StationEditor onDone={() => setCreate(false)} />}
      <Input
        aria-label={t('fuel.station_search')}
        placeholder={t('fuel.station_search')}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      {query.isError ? (
        <Button onClick={() => void query.refetch()}>
          {t('common.retry')}
        </Button>
      ) : (
        query.data?.data.map((station) => (
          <section key={station.id} className="glass-card space-y-3 p-4">
            <h2 className="font-semibold">
              {station.name} ·{' '}
              {station.active ? t('fuel.active') : t('fuel.inactive')}
            </h2>
            <p>
              {station.stir} · {station.address} · {station.contact}
            </p>
            {canReviewFuel(role) && (
              <Button
                variant="outline"
                onClick={() =>
                  setEditing(editing === station.id ? '' : station.id)
                }
              >
                {t('common.edit')}
              </Button>
            )}
            {editing === station.id && (
              <StationEditor station={station} onDone={() => setEditing('')} />
            )}
            {['owner', 'accountant'].includes(role ?? '') && (
              <Button
                variant="outline"
                onClick={() =>
                  setSelected(selected === station.id ? '' : station.id)
                }
              >
                {t('fuel.balance')}
              </Button>
            )}
            {selected === station.id && <StationAccounts id={station.id} />}
          </section>
        ))
      )}
      <PaginationControls
        currentPage={page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
