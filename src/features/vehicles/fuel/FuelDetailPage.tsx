import { useEffect, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Car,
  Buildings,
  Speedometer,
  Receipt,
  CheckCircle,
  Clock,
  XCircle,
  Warning,
} from '@phosphor-icons/react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; className: string }
> = {
  approved: {
    icon: CheckCircle,
    className:
      'gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  submitted: {
    icon: Clock,
    className:
      'gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  },
  rejected: {
    icon: XCircle,
    className:
      'gap-1 border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
  },
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status];
  if (config) {
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="h-3.5 w-3.5" weight="fill" />
        {t(`fuel.${status}`)}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      {t(`fuel.${status}`)}
    </Badge>
  );
}

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
      className="max-h-72 w-full rounded-lg object-contain bg-black/5 dark:bg-white/5"
    />
  ) : failed ? (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        setFailed(false);
        setAttempt((v) => v + 1);
      }}
    >
      {t('common.retry')}
    </Button>
  ) : (
    <Skeleton className="h-24 rounded-lg" />
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
          size="sm"
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
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
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

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-muted-foreground">{t('common.error')}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const row = query.data;
  const edit =
    ['draft', 'rejected'].includes(row.status) && row.author_id === user?.id;
  const reviewer = canReviewFuel(user?.role);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/vehicle-fuel"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('fuel.title')}
        </Link>
        <StatusBadge status={row.status} />
      </div>

      <div className="glass-card space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary tracking-wide">
                <Car className="h-3.5 w-3.5" />
                {row.vehicle_plate}
              </span>
              {row.source_status === 'source_verified' && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-0.5 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                >
                  <Receipt className="h-2.5 w-2.5" />
                  {t('fuel.tax_verified')}
                </Badge>
              )}
            </div>
            <h1 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
              <Buildings className="h-5 w-5 text-muted-foreground" />
              {row.station_name}
            </h1>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('fuel.occurred_at')}
            </dt>
            <dd className="font-medium tabular-nums">
              {new Date(row.occurred_at).toLocaleString('uz-UZ', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('fuel.odometer_km')}
            </dt>
            <dd className="font-medium tabular-nums flex items-center gap-1">
              <Speedometer className="h-3.5 w-3.5 text-muted-foreground" />
              {row.odometer_km?.toLocaleString()} km
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('fuel.funding_source')}
            </dt>
            <dd className="font-medium">{t(`fuel.${row.funding_source}`)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('fuel.source_status')}
            </dt>
            <dd className="font-medium">{t(`fuel.${row.source_status}`)}</dd>
          </div>
        </dl>
      </div>

      {row.source_data && (
        <section
          aria-label={t('fuel.original_receipt')}
          className="glass-card space-y-3 p-5"
        >
          <h2 className="font-heading text-base font-semibold">
            {t('fuel.original_receipt')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('fuel.source_comparison_hint')}
          </p>
          {row.source_data.seller_name && (
            <p className="text-sm font-medium">{row.source_data.seller_name}</p>
          )}
          {row.source_data.seller_tin && (
            <p className="text-sm">
              {t('fuel.tax_id')}:{' '}
              <span className="font-medium tabular-nums">
                {row.source_data.seller_tin}
              </span>
            </p>
          )}
          {row.source_data.total && (
            <p className="text-sm">
              {t('fuel.receipt_total')}:{' '}
              <strong className="tabular-nums">{row.source_data.total}</strong>
            </p>
          )}
          {row.source_data.reason && (
            <p role="status" className="text-sm">
              {t(`fuel.source_reasons.${row.source_data.reason}`, {
                defaultValue: t('fuel.manual_review'),
              })}
            </p>
          )}
          {row.source_data.warnings?.map((warning) => (
            <p
              className="text-sm font-medium text-destructive"
              role="alert"
              key={warning}
            >
              <Warning className="mr-1 inline h-3.5 w-3.5" />
              {t(`fuel.source_reasons.${warning}`, {
                defaultValue: t('fuel.manual_review'),
              })}
            </p>
          ))}
          {row.source_data.lines?.map((line) => (
            <div key={line.index} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{line.name}</p>
              <p className="text-muted-foreground">
                {t('fuel.quantity')}: {line.quantity}{' '}
                {line.unit ?? t('common.na')} · {t('fuel.line_total')}:{' '}
                <span className="tabular-nums">{line.line_total}</span>
              </p>
              <p className="text-muted-foreground">
                {t('fuel.mxik')}: {line.mxik || t('common.na')}
              </p>
            </div>
          ))}
        </section>
      )}
      {!row.source_data && (
        <div className="glass-card p-5">
          <p className="text-sm text-muted-foreground">
            {t('fuel.manual_review')}
          </p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold">
          {t('fuel.selected_fuel')}
        </h2>
        {edit ? (
          <FuelForm row={row} />
        ) : (
          <div className="grid gap-3">
            {row.lines.map((line, i) => (
              <div
                className="glass-card flex items-center justify-between p-4"
                key={i}
              >
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">
                    {line.name || t(`fuel.${line.fuel_type}`)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {t(`fuel.${line.fuel_type}`)} · {line.quantity}{' '}
                    {t(`fuel.${line.unit}`)} ×{' '}
                    {Number(line.unit_price).toLocaleString()}
                  </p>
                </div>
                <span className="font-bold tabular-nums text-foreground">
                  {Number(line.line_total).toLocaleString()}{' '}
                  {t('common.currency')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {['receipt', 'odometer'].map((slot) => (
          <section className="glass-card space-y-3 p-5" key={slot}>
            <h2 className="font-heading text-sm font-semibold">
              {t(`fuel.${slot}`)}
            </h2>
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
        <section className="glass-card space-y-4 p-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t('fuel.reason')}</span>
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
                  variant={decision === 'approve' ? 'default' : 'outline'}
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
          <Link
            to="/expenses/$id"
            params={{ id: row.expense_id }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {t('fuel.expense_link')}
          </Link>
        )}

      {row.history && row.history.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold">
            {t('fuel.history')}
          </h2>
          {row.history.map((review) => (
            <div key={review.id} className="glass-card space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">
                  {t(`fuel.${review.action}`)}
                </Badge>
                {review.reason && (
                  <span className="text-muted-foreground">{review.reason}</span>
                )}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {new Date(review.created_at).toLocaleString('uz-UZ')}
                </span>
              </div>
              {review.changes?.before && review.changes?.after && (
                <dl className="space-y-1 text-xs">
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
                        : String(value ?? 'N/A');
                    return (
                      <div key={field} className="flex gap-2">
                        <dt className="font-medium text-muted-foreground min-w-[80px]">
                          {t(`fuel.${field === 'lines' ? 'line' : field}`)}
                        </dt>
                        <dd className="break-words text-foreground">
                          <span className="text-destructive line-through">
                            {describe(before)}
                          </span>
                          {' → '}
                          <span className="text-emerald-600">
                            {describe(after)}
                          </span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
