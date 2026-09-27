import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PaginationControls from '@/components/ui/PaginationControls';
import { useFuelList } from './service';
import FuelForm, { selectClass } from './FuelForm';
export default function FuelPage() {
  const { t } = useTranslation();
  const [create, setCreate] = useState(false);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = useFuelList({ page, limit: 20, status: status || undefined });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('fuel.title')}</h1>
        <Button onClick={() => setCreate(!create)}>{t('fuel.create')}</Button>
        <Link to="/fuel-stations">{t('fuel.stations')}</Link>
      </div>
      {create && <FuelForm />}
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
        {['draft', 'submitted', 'approved', 'rejected', 'cancelled'].map(
          (s) => (
            <option key={s} value={s}>
              {t(`fuel.${s}`)}
            </option>
          ),
        )}
      </select>
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : query.isError ? (
        <Button onClick={() => void query.refetch()}>
          {t('common.retry')}
        </Button>
      ) : query.data?.data.length ? (
        query.data.data.map((row) => (
          <Link
            className="glass-card block space-y-2 p-4"
            key={row.id}
            to="/vehicle-fuel/$id"
            params={{ id: row.id }}
          >
            <strong>
              {row.vehicle_plate} · {row.station_name}
            </strong>
            <p>
              {t(`fuel.${row.status}`)} · {t(`fuel.${row.source_status}`)}
            </p>
            <p>
              {new Date(row.occurred_at).toLocaleString()} · {row.odometer_km}{' '}
              km
            </p>
          </Link>
        ))
      ) : (
        <p>{t('fuel.empty')}</p>
      )}
      <PaginationControls
        currentPage={page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
