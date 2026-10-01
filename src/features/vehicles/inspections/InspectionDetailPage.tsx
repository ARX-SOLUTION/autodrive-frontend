import { useCan } from '@/hooks/useCan';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from '@/api/axiosInstance';
import { useParams, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  requiredSlots,
  inspectionManager,
  canSubmitInspection,
  canReviewInspection,
} from './policy';
import {
  useInspection,
  useVehicleDefects,
  type VehicleDefect,
  useInspectionMutation,
  fetchEvidence,
  uploadEvidence,
  inspectionAction,
  type Slot,
} from './service';
function EvidenceImage({
  id,
  evidenceId,
  alt,
  defect = false,
}: {
  id: string;
  evidenceId: string;
  alt: string;
  defect?: boolean;
}) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { t } = useTranslation();
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    const request = defect
      ? axios
          .get<Blob>(`/vehicle-defects/${evidenceId}/evidence`, {
            responseType: 'blob',
            signal: controller.signal,
          })
          .then((r) => r.data)
      : fetchEvidence(id, evidenceId, controller.signal);
    void request
      .then((blob) => {
        if (!controller.signal.aborted) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, evidenceId, attempt, defect]);
  return url ? (
    <img
      className="max-h-64 w-full rounded object-contain"
      src={url}
      alt={alt}
    />
  ) : failed ? (
    <Button
      variant="outline"
      onClick={() => {
        setFailed(false);
        setAttempt((n) => n + 1);
      }}
    >
      {t('common.retry')}
    </Button>
  ) : (
    <Skeleton className="h-24" />
  );
}
function EvidenceUpload({
  id,
  slot,
  onBusy,
}: {
  id: string;
  slot: Slot;
  onBusy: (busy: boolean) => void;
}) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState(0);
  const mutation = useInspectionMutation(async () => {
    if (file) await uploadEvidence(id, slot, file, note, setProgress);
  });
  const send = async () => {
    onBusy(true);
    try {
      await mutation.mutateAsync(undefined);
      setFile(null);
    } catch {
      /* mutation reports error; retain file for retry */
    } finally {
      onBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <Input
        aria-label={t(`inspections.${slot}`)}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        disabled={mutation.isPending}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {slot === 'defect' && (
        <Input
          aria-label={t('inspections.defect_note')}
          placeholder={t('inspections.defect_note')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
      {file && (
        <Button
          disabled={mutation.isPending || (slot === 'defect' && !note.trim())}
          onClick={() => void send()}
        >
          {t(mutation.isError ? 'common.retry' : 'inspections.upload')}
        </Button>
      )}
      {mutation.isPending && (
        <progress
          aria-label={t('inspections.upload')}
          value={progress}
          max={100}
        />
      )}
    </div>
  );
}
function DraftCorrection({
  id,
  odometer,
  notes,
}: {
  id: string;
  odometer: number;
  notes: string | null;
}) {
  const { t } = useTranslation();
  const form = useForm({
    resolver: zodResolver(
      z.object({ odometer: z.string().regex(/^\d+$/), notes: z.string() }),
    ),
    defaultValues: { odometer: String(odometer), notes: notes ?? '' },
  });
  const mutation = useInspectionMutation(
    (values: { odometer: string; notes: string }) =>
      axios.patch(`/vehicle-inspections/${id}`, {
        odometer_km: Number(values.odometer),
        notes: values.notes,
      }),
  );
  return (
    <form
      className="glass-card space-y-3 p-4"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <label>
        {t('inspections.odometer_km')}
        <Input
          {...form.register('odometer')}
          inputMode="numeric"
          aria-invalid={!!form.formState.errors.odometer}
        />
      </label>
      {form.formState.errors.odometer && (
        <p role="alert">{t('common.required')}</p>
      )}
      <label>
        {t('inspections.notes')}
        <Input {...form.register('notes')} />
      </label>
      <Button disabled={mutation.isPending} type="submit">
        {t('common.save')}
      </Button>
    </form>
  );
}
function DefectCard({
  row,
  manager,
}: {
  row: VehicleDefect;
  manager: boolean;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const action = useInspectionMutation(() =>
    axios.post(`/vehicle-defects/${row.id}/resolve`, { resolution_note: note }),
  );
  return (
    <article className="glass-card space-y-3 p-4">
      <p>
        {row.description} · {t(`inspections.defect_${row.status}`)}
      </p>
      <EvidenceImage id="" evidenceId={row.id} alt={row.description} defect />
      {row.resolution_note && <p>{row.resolution_note}</p>}
      {manager && row.status === 'open' && (
        <>
          <Input
            aria-label={t('inspections.resolution_note')}
            placeholder={t('inspections.resolution_note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
          <Button
            disabled={!note.trim() || action.isPending}
            onClick={() => action.mutate(undefined)}
          >
            {t('inspections.resolve_defect')}
          </Button>
        </>
      )}
    </article>
  );
}
function VehicleDefects({
  vehicleId,
  manager,
}: {
  vehicleId: string;
  manager: boolean;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useVehicleDefects(vehicleId, page);
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t('inspections.defects_title')}</h2>
      {query.isLoading && <Skeleton className="h-24" />}
      {query.isError && (
        <Button onClick={() => void query.refetch()}>
          {t('common.retry')}
        </Button>
      )}
      {query.data?.data.length === 0 && <p>{t('inspections.no_defects')}</p>}
      {query.data?.data.map((row) => (
        <DefectCard key={row.id} row={row} manager={manager} />
      ))}
      <PaginationControls
        currentPage={page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />
    </section>
  );
}
export default function InspectionDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const mayUpdate = useCan('vehicle_inspections.update');
  const mayApprove = useCan('vehicle_inspections.approve');
  const query = useInspection(id);
  const [reason, setReason] = useState('');
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const action = useInspectionMutation(
    ({ action, body }: { action: 'submit' | 'review'; body: unknown }) =>
      inspectionAction(id, action, body),
  );
  if (query.isLoading) return <Skeleton className="h-64" />;
  if (!query.data)
    return (
      <Button onClick={() => void query.refetch()}>{t('common.retry')}</Button>
    );
  const row = query.data;
  const manager = inspectionManager(user?.role);
  const editable =
    mayUpdate && row.status === 'draft' && row.author_id === user?.id;
  const maySubmit =
    mayUpdate && row.status === 'draft' && (editable || manager);
  const send = (decision?: string) =>
    action.mutate({
      action: decision ? 'review' : 'submit',
      body: decision
        ? { decision, reason: reason || undefined }
        : { override_reason: reason || undefined },
    });
  return (
    <div className="space-y-5">
      <Link to="/vehicle-inspections">{t('inspections.title')}</Link>
      <h1 className="text-2xl font-semibold">
        {row.vehicle.plate_number} · {t(`inspections.${row.kind}`)}
      </h1>
      <p>
        {t(`inspections.${row.status}`)} · {row.odometer_km} km
      </p>
      <p>
        {row.author.name} → {row.receiver.name}
      </p>
      {row.notes && <p>{row.notes}</p>}
      {editable && (
        <DraftCorrection id={id} odometer={row.odometer_km} notes={row.notes} />
      )}
      <p className="text-sm text-muted-foreground">
        {t('inspections.camera_hint')}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {([...requiredSlots, 'defect'] as Slot[]).map((slot) => (
          <section className="glass-card space-y-3 p-4" key={slot}>
            <h2 className="font-medium">{t(`inspections.${slot}`)}</h2>
            {row.evidence
              .filter((e) => e.slot === slot)
              .map((e) => (
                <div key={e.id}>
                  <EvidenceImage
                    id={id}
                    evidenceId={e.id}
                    alt={t(`inspections.${slot}`)}
                  />
                  {e.note && <p>{e.note}</p>}
                </div>
              ))}
            {editable && (
              <EvidenceUpload
                id={id}
                slot={slot}
                onBusy={(busy) =>
                  setBusySlots((old) =>
                    busy ? [...old, slot] : old.filter((s) => s !== slot),
                  )
                }
              />
            )}
          </section>
        ))}
      </div>
      {(maySubmit ||
        (mayApprove && canReviewInspection(row, user?.role, user?.id))) && (
        <div className="glass-card space-y-3 p-4">
          <label className="block">
            {t('inspections.reason')}
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {maySubmit && (
            <>
              <p>{t('inspections.required_photos')}</p>
              <Button
                disabled={
                  busySlots.length > 0 ||
                  action.isPending ||
                  !canSubmitInspection(
                    row.evidence
                      .filter(
                        (e) =>
                          !row.reviews.some(
                            (r) =>
                              r.decision === 'retake' &&
                              r.created_at >= e.created_at,
                          ),
                      )
                      .map((e) => e.slot),
                    user?.role,
                    reason,
                  )
                }
                onClick={() => send()}
              >
                {t('inspections.submit')}
              </Button>
            </>
          )}
          {mayApprove && canReviewInspection(row, user?.role, user?.id) && (
            <div className="flex flex-wrap gap-2">
              {(manager
                ? ['approve', 'retake', 'service', 'stop']
                : ['approve']
              ).map((decision) => (
                <Button
                  key={decision}
                  variant={decision === 'approve' ? 'default' : 'outline'}
                  disabled={
                    action.isPending ||
                    (decision !== 'approve' && !reason.trim())
                  }
                  onClick={() => send(decision)}
                >
                  {t(`inspections.${decision}`)}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
      <VehicleDefects vehicleId={row.vehicle_id} manager={manager} />
      {row.override_reason && (
        <p>
          {t('inspections.reason')}: {row.override_reason}
        </p>
      )}
      {row.reviews.map((review) => (
        <p key={review.id}>
          {t(`inspections.${review.decision}`)} · {review.reason} ·{' '}
          {new Date(review.created_at).toLocaleString()}
        </p>
      ))}
    </div>
  );
}
