import { useEffect, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFuel,
  useFuelMutation,
  fuelAction,
  uploadFuelEvidence,
  fuelImage,
} from './service';
import { canReviewFuel } from './policy';
import FuelForm from './FuelForm';
function Evidence({
  id,
  evidenceId,
  slot,
}: {
  id: string;
  evidenceId: string;
  slot: string;
}) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { t } = useTranslation();
  useEffect(() => {
    const c = new AbortController();
    let objectUrl = '';
    void fuelImage(id, evidenceId, c.signal)
      .then((blob) => {
        if (!c.signal.aborted) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!c.signal.aborted) setFailed(true);
      });
    return () => {
      c.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, evidenceId, attempt]);
  return url ? (
    <img
      src={url}
      alt={t(`fuel.${slot}`)}
      className="max-h-72 w-full rounded object-contain"
    />
  ) : failed ? (
    <Button
      onClick={() => {
        setFailed(false);
        setAttempt((v) => v + 1);
      }}
    >
      {t('common.retry')}
    </Button>
  ) : (
    <Skeleton className="h-24" />
  );
}
function Upload({
  id,
  slot,
  busy,
}: {
  id: string;
  slot: string;
  busy: (value: boolean) => void;
}) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const upload = useFuelMutation(async () => {
    if (file) await uploadFuelEvidence(id, slot, file, setProgress);
  });
  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        aria-label={t(`fuel.${slot}`)}
        disabled={upload.isPending}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {file && (
        <Button
          disabled={upload.isPending}
          onClick={async () => {
            busy(true);
            try {
              await upload.mutateAsync(undefined);
              setFile(null);
            } catch {
              /* preserve selected image for retry */
            } finally {
              busy(false);
            }
          }}
        >
          {t(upload.isError ? 'common.retry' : 'fuel.upload')}
        </Button>
      )}
      {upload.isPending && (
        <progress max={100} value={progress} aria-label={t('fuel.upload')} />
      )}
    </div>
  );
}
export default function FuelDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const query = useFuel(id);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string[]>([]);
  const mutation = useFuelMutation(
    ({ action, body }: { action: string; body: unknown }) =>
      fuelAction(id, action, body),
  );
  if (query.isLoading) return <Skeleton className="h-64" />;
  if (!query.data)
    return (
      <Button onClick={() => void query.refetch()}>{t('common.retry')}</Button>
    );
  const row = query.data;
  const edit =
    ['draft', 'rejected'].includes(row.status) && row.author_id === user?.id;
  const reviewer = canReviewFuel(user?.role);
  return (
    <div className="space-y-4">
      <Link to="/vehicle-fuel">{t('fuel.title')}</Link>
      <h1 className="text-2xl font-semibold">
        {row.vehicle_plate} · {row.station_name}
      </h1>
      <p>
        {t('fuel.business_status')}: {t(`fuel.${row.status}`)}
      </p>
      <p>
        {t('fuel.source_status')}: {t(`fuel.${row.source_status}`)}
      </p>
      <p>
        {new Date(row.occurred_at).toLocaleString()} · {row.odometer_km} km ·{' '}
        {t(`fuel.${row.funding_source}`)}
      </p>
      <section
        aria-label={t('fuel.original_receipt')}
        className="glass-card space-y-3 p-4"
      >
        <h2 className="font-semibold">{t('fuel.original_receipt')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('fuel.source_comparison_hint')}
        </p>
        {row.source_data?.seller_name && <p>{row.source_data.seller_name}</p>}
        {row.source_data?.seller_tin && (
          <p>
            {t('fuel.tax_id')}: <span>{row.source_data.seller_tin}</span>
          </p>
        )}
        {row.source_data?.total && (
          <p>
            {t('fuel.receipt_total')}: <strong>{row.source_data.total}</strong>
          </p>
        )}
        {row.source_data?.reason && (
          <p role="status">
            {t(`fuel.source_reasons.${row.source_data.reason}`, {
              defaultValue: t('fuel.manual_review'),
            })}
          </p>
        )}
        {row.source_data?.warnings?.map((warning) => (
          <p
            className="font-medium text-destructive"
            role="alert"
            key={warning}
          >
            {t(`fuel.source_reasons.${warning}`, {
              defaultValue: t('fuel.manual_review'),
            })}
          </p>
        ))}
        {!row.source_data && <p>{t('fuel.manual_review')}</p>}
        {row.source_data?.lines?.map((line) => (
          <div key={line.index} className="rounded border p-3 text-sm">
            <p className="font-medium">{line.name}</p>
            <p>
              {t('fuel.quantity')}: {line.quantity}{' '}
              {line.unit ?? t('common.na')} · {t('fuel.line_total')}:{' '}
              {line.line_total}
            </p>
            <p>
              {t('fuel.mxik')}: {line.mxik || t('common.na')}
            </p>
          </div>
        ))}
      </section>
      <h2 className="font-semibold">{t('fuel.selected_fuel')}</h2>
      {edit ? (
        <FuelForm row={row} />
      ) : (
        <div className="grid gap-3">
          {row.lines.map((line, i) => (
            <div className="glass-card p-3" key={i}>
              {line.name} · {t(`fuel.${line.fuel_type}`)} · {line.quantity}{' '}
              {t(`fuel.${line.unit}`)} × {line.unit_price} ={' '}
              <strong>{line.line_total}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {['receipt', 'odometer'].map((slot) => (
          <section className="glass-card space-y-3 p-4" key={slot}>
            <h2>{t(`fuel.${slot}`)}</h2>
            {row.evidence
              .filter((e) => e.slot === slot)
              .map((e) => (
                <Evidence key={e.id} id={id} evidenceId={e.id} slot={slot} />
              ))}
            {edit && (
              <Upload
                id={id}
                slot={slot}
                busy={(value) =>
                  setBusy((old) =>
                    value ? [...old, slot] : old.filter((v) => v !== slot),
                  )
                }
              />
            )}
          </section>
        ))}
      </div>
      {(edit || reviewer) && (
        <section className="glass-card space-y-3 p-4">
          <label>
            {t('fuel.reason')}
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            {edit && row.status === 'draft' && (
              <Button
                disabled={
                  mutation.isPending ||
                  busy.length > 0 ||
                  !['receipt', 'odometer'].every((s) =>
                    row.evidence.some((e) => e.slot === s),
                  )
                }
                onClick={() => mutation.mutate({ action: 'submit', body: {} })}
              >
                {t('fuel.submit')}
              </Button>
            )}
            {reviewer &&
              row.status === 'submitted' &&
              ['approve', 'reject'].map((decision) => (
                <Button
                  key={decision}
                  disabled={mutation.isPending || !reason.trim()}
                  onClick={() =>
                    mutation.mutate({
                      action: 'review',
                      body: { decision, reason },
                    })
                  }
                >
                  {t(`fuel.${decision}`)}
                </Button>
              ))}
            {['owner', 'accountant'].includes(user?.role ?? '') &&
              row.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  disabled={mutation.isPending || !reason.trim()}
                  onClick={() =>
                    mutation.mutate({ action: 'cancel', body: { reason } })
                  }
                >
                  {t('fuel.cancel')}
                </Button>
              )}
          </div>
        </section>
      )}
      {row.expense_id &&
        ['owner', 'accountant', 'manager'].includes(user?.role ?? '') && (
          <Link to="/expenses/$id" params={{ id: row.expense_id }}>
            {t('fuel.expense_link')}
          </Link>
        )}
      {row.history?.map((review) => (
        <section key={review.id} className="glass-card space-y-2 p-3">
          <p>
            {t(`fuel.${review.action}`)} · {review.reason} ·{' '}
            {new Date(review.created_at).toLocaleString()}
          </p>
          {review.changes?.before && review.changes?.after && (
            <dl className="space-y-1">
              {(
                [
                  'odometer_km',
                  'occurred_at',
                  'funding_source',
                  'lines',
                ] as const
              ).map((field) => {
                const aliases = {
                  odometer_km: 'odometerKm',
                  occurred_at: 'occurredAt',
                  funding_source: 'fundingSource',
                  lines: 'lines',
                };
                const before = review.changes?.before?.[field];
                const after = review.changes?.after?.[aliases[field]];
                if (
                  JSON.stringify(before) === JSON.stringify(after) ||
                  after === undefined
                )
                  return null;
                const describe = (value: unknown): string =>
                  Array.isArray(value)
                    ? value
                        .map((line) =>
                          typeof line === 'object' && line
                            ? Object.values(line).join(' · ')
                            : String(line),
                        )
                        .join('; ')
                    : String(value ?? '—');
                return (
                  <div key={field}>
                    <dt>{t(`fuel.${field === 'lines' ? 'line' : field}`)}</dt>
                    <dd className="break-words">
                      {describe(before)} → {describe(after)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </section>
      ))}
    </div>
  );
}
