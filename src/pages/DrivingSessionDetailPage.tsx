import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Car } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import {
  useApproveDrivingSession,
  useCancelDrivingSession,
  useCorrectDrivingSession,
  useDrivingSession,
  useRejectDrivingSession,
  useSubmitDrivingSession,
} from '@/services/drivingSessionService';
import type { DrivingSession } from '@/types/drivingSession';
import { extractErrorMessage } from '@/lib/errors';
import { formatTashkentDateTime } from '@/lib/calendarDateTime';
import { EntityDetailShell } from '@/components/ui/EntityDetailShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Action = 'submit' | 'approve' | 'reject' | 'cancel' | 'correct';

const SessionActionDialog = ({
  session,
  action,
  onClose,
}: {
  session: DrivingSession;
  action: Action | null;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const submitMutation = useSubmitDrivingSession();
  const approveMutation = useApproveDrivingSession();
  const rejectMutation = useRejectDrivingSession();
  const cancelMutation = useCancelDrivingSession();
  const correctMutation = useCorrectDrivingSession();
  const [minutes, setMinutes] = useState(
    String(session.actual_minutes ?? session.planned_minutes),
  );
  const [reason, setReason] = useState('');
  const pending =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    correctMutation.isPending;
  const needsMinutes = action === 'submit' || action === 'correct';
  const needsReason =
    action === 'approve' ||
    action === 'reject' ||
    action === 'cancel' ||
    action === 'correct';
  const validMinutes =
    !needsMinutes ||
    (Number.isInteger(Number(minutes)) &&
      Number(minutes) > 0 &&
      Number(minutes) <= 1440);
  const canSave =
    !!action &&
    validMinutes &&
    (!needsReason || reason.trim().length > 0) &&
    !pending;
  const close = () => {
    setReason('');
    setMinutes(String(session.actual_minutes ?? session.planned_minutes));
    onClose();
  };
  const callbacks = {
    onSuccess: () => {
      toast.success(t('driving.action_saved'));
      close();
    },
    onError: (error: Error) =>
      toast.error(extractErrorMessage(error, t('common.error'))),
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    switch (action) {
      case 'submit':
        submitMutation.mutate(
          { id: session.id, actual_minutes: Number(minutes) },
          callbacks,
        );
        break;
      case 'approve':
        approveMutation.mutate(
          { id: session.id, gps_exception_reason: reason.trim() },
          callbacks,
        );
        break;
      case 'reject':
        rejectMutation.mutate(
          { id: session.id, reason: reason.trim() },
          callbacks,
        );
        break;
      case 'cancel':
        cancelMutation.mutate(
          { id: session.id, reason: reason.trim() },
          callbacks,
        );
        break;
      case 'correct':
        correctMutation.mutate(
          {
            id: session.id,
            actual_minutes: Number(minutes),
            reason: reason.trim(),
          },
          callbacks,
        );
        break;
    }
  };
  return (
    <Dialog open={!!action} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(`driving.actions.${action ?? 'submit'}`)}
          </DialogTitle>
          <DialogDescription>
            {t(
              action === 'approve'
                ? 'driving.gps_exception_required'
                : action === 'submit'
                  ? 'driving.instructor_confirmation_notice'
                  : action === 'cancel' && session.status === 'approved'
                    ? 'driving.cancel_approved_warning'
                    : 'driving.action_reason_note',
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          {needsMinutes && (
            <label className="block space-y-1 text-sm">
              <span>{t('driving.actual_minutes')}</span>
              <Input
                type="number"
                min="1"
                max="1440"
                step="1"
                inputMode="numeric"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                required
              />
            </label>
          )}
          {needsReason && (
            <label className="block space-y-1 text-sm">
              <span>
                {t(
                  action === 'approve'
                    ? 'driving.gps_exception_reason'
                    : 'driving.reason',
                )}
              </span>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                required
              />
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canSave}>
              {t('common.confirm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DrivingSessionDetailPage = () => {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const canSubmit = useCan('submitDrivingSession');
  const canReview = useCan('reviewDrivingSessions');
  const canCancel = useCan('cancelDrivingSessions');
  const [action, setAction] = useState<Action | null>(null);
  const {
    data: session,
    isLoading,
    isError,
    refetch,
  } = useDrivingSession(id ?? '');
  const formatDate = (value: string) =>
    formatTashkentDateTime(value, i18n.language);

  if (isLoading || isError || !session)
    return (
      <EntityDetailShell
        onBack={() => navigate({ to: '/driving-sessions' })}
        backLabel={t('driving.title')}
        isLoading={isLoading}
        isError={isError || !session}
        errorTitle={t('common.error')}
        errorIcon={Car}
        onRetry={() => void refetch()}
        retryLabel={t('common.retry')}
      />
    );

  const maySubmit =
    canSubmit &&
    user?.id === session.instructor_id &&
    (session.status === 'planned' || session.status === 'rejected');
  const mayReview = canReview && session.status === 'submitted';
  const mayCorrect = canReview && session.status === 'approved';
  const mayCancel =
    canCancel &&
    session.status !== 'cancelled' &&
    (user?.role !== 'operator' || session.status === 'planned');
  const name = `${session.student.last_name} ${session.student.first_name}`;

  return (
    <EntityDetailShell
      onBack={() => navigate({ to: '/driving-sessions' })}
      backLabel={t('driving.title')}
      isLoading={false}
      isError={false}
      header={
        <div className="glass-card space-y-4 p-5">
          <div>
            <h1 className="font-heading text-2xl font-bold">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(session.starts_at)}–{formatDate(session.ends_at)} ·{' '}
              {session.vehicle.plate_number}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {maySubmit && (
              <Button onClick={() => setAction('submit')}>
                {t('driving.actions.submit')}
              </Button>
            )}
            {mayReview && (
              <>
                <Button onClick={() => setAction('approve')}>
                  {t('driving.actions.approve')}
                </Button>
                <Button variant="outline" onClick={() => setAction('reject')}>
                  {t('driving.actions.reject')}
                </Button>
              </>
            )}
            {mayCorrect && (
              <Button variant="outline" onClick={() => setAction('correct')}>
                {t('driving.actions.correct')}
              </Button>
            )}
            {mayCancel && (
              <Button variant="destructive" onClick={() => setAction('cancel')}>
                {t('driving.actions.cancel')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                navigate({
                  to: '/training-enrollments/$id',
                  params: { id: session.enrollment_id },
                })
              }
            >
              {t('driving.view_report')}
            </Button>
          </div>
        </div>
      }
    >
      <section className="glass-card space-y-4 p-5">
        <h2 className="font-heading text-lg font-semibold">
          {t('driving.session_details')}
        </h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ['status', t(`driving.status.${session.status}`)],
              ['planned', `${session.planned_minutes} ${t('driving.minutes')}`],
              [
                'entered',
                session.actual_minutes === null
                  ? t('common.na')
                  : `${session.actual_minutes} ${t('driving.minutes')}`,
              ],
              [
                'approved',
                `${session.approved_minutes} ${t('driving.minutes')}`,
              ],
              ['vehicle', session.vehicle.plate_number],
              ['instructor', session.instructor.name],
            ] as const
          ).map(([key, value]) => (
            <div key={key}>
              <dt className="text-muted-foreground">
                {t(key === 'status' ? 'common.status' : `driving.${key}`)}
              </dt>
              <dd className="mt-1 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">
          {t('driving.instructor_confirmation_notice')}
        </p>
        {session.gps_exception_reason && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <strong>{t('driving.gps_exception_reason')}:</strong>{' '}
            {session.gps_exception_reason}
          </p>
        )}
        {session.rejection_reason && (
          <p className="text-sm">
            <strong>{t('driving.rejection_reason')}:</strong>{' '}
            {session.rejection_reason}
          </p>
        )}
        {session.cancellation_reason && (
          <p className="text-sm">
            <strong>{t('driving.cancellation_reason')}:</strong>{' '}
            {session.cancellation_reason}
          </p>
        )}
        {session.last_correction_reason && (
          <p className="text-sm">
            <strong>{t('driving.correction_reason')}:</strong>{' '}
            {session.last_correction_reason}
          </p>
        )}
      </section>
      {action && (
        <SessionActionDialog
          key={action}
          session={session}
          action={action}
          onClose={() => setAction(null)}
        />
      )}
    </EntityDetailShell>
  );
};

export default DrivingSessionDetailPage;
