import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Printer, Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useCan } from '@/hooks/useCan';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useTrainingEnrollment,
  useTrainingProgram,
} from '@/services/trainingService';
import {
  useCreateDrivingSession,
  useDrivingSessionsForReport,
  useDrivingSummary,
  usePracticeInstructors,
} from '@/services/drivingSessionService';
import { useVehiclesPage } from '@/services/vehicleService';
import type { TrainingEnrollment } from '@/types/training';
import { extractErrorMessage } from '@/lib/errors';
import { formatTashkentDateTime } from '@/lib/calendarDateTime';
import { EntityDetailShell } from '@/components/ui/EntityDetailShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

const ScheduleDialog = ({
  enrollment,
  open,
  onClose,
}: {
  enrollment: TrainingEnrollment;
  open: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateDrivingSession();
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehiclePage, setVehiclePage] = useState(1);
  const [vehicleId, setVehicleId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [invalidTimes, setInvalidTimes] = useState(false);
  const search = useDebounce(vehicleSearch.trim(), 250);
  const vehicles = useVehiclesPage({
    branchId: enrollment.branch_id,
    category: enrollment.category ?? undefined,
    search: search || undefined,
    page: vehiclePage,
    limit: 50,
  });
  const { data: practiceTeachers = [] } = usePracticeInstructors(
    enrollment.branch_id,
    open,
  );
  const availableVehicles =
    vehicles.data?.data.filter(
      (vehicle) =>
        vehicle.available_for_booking &&
        (!enrollment.category ||
          vehicle.categories.includes(enrollment.category)),
    ) ?? [];
  const close = () => {
    setVehicleSearch('');
    setVehiclePage(1);
    setVehicleId('');
    setInstructorId('');
    setStartsAt('');
    setEndsAt('');
    setInvalidTimes(false);
    onClose();
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !vehicleId ||
      !instructorId ||
      !startsAt ||
      !endsAt ||
      new Date(endsAt).getTime() <= new Date(startsAt).getTime()
    ) {
      setInvalidTimes(true);
      return;
    }
    create.mutate(
      {
        enrollment_id: enrollment.id,
        vehicle_id: vehicleId,
        instructor_id: instructorId,
        starts_at: startsAt,
        ends_at: endsAt,
      },
      {
        onSuccess: (session) => {
          toast.success(t('driving.scheduled'));
          close();
          navigate({ to: '/driving-sessions/$id', params: { id: session.id } });
        },
        onError: (error) =>
          toast.error(extractErrorMessage(error, t('common.error'))),
      },
    );
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('driving.schedule')}</DialogTitle>
          <DialogDescription>{t('driving.schedule_desc')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span>{t('driving.vehicle_search')}</span>
            <Input
              value={vehicleSearch}
              onChange={(event) => {
                setVehicleSearch(event.target.value);
                setVehiclePage(1);
                setVehicleId('');
              }}
              placeholder={t('driving.vehicle_search_hint')}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t('driving.vehicle')}</span>
            <select
              className={selectClass}
              value={vehicleId}
              onChange={(event) => setVehicleId(event.target.value)}
              required
            >
              <option value="">{t('common.select_placeholder')}</option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate_number} · {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </label>
          {(vehicles.data?.meta.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={vehiclePage <= 1}
                onClick={() => {
                  setVehiclePage((page) => page - 1);
                  setVehicleId('');
                }}
              >
                {t('common.previous')}
              </Button>
              <span>
                {vehiclePage} / {vehicles.data?.meta.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={vehiclePage >= (vehicles.data?.meta.totalPages ?? 1)}
                onClick={() => {
                  setVehiclePage((page) => page + 1);
                  setVehicleId('');
                }}
              >
                {t('common.next')}
              </Button>
            </div>
          )}
          {vehicles.data &&
            availableVehicles.length === 0 &&
            vehicles.data.meta.totalPages <= 1 && (
              <p className="text-xs text-destructive">
                {t('driving.no_available_vehicle')}
              </p>
            )}
          <label className="block space-y-1 text-sm">
            <span>{t('driving.instructor')}</span>
            <select
              className={selectClass}
              value={instructorId}
              onChange={(event) => setInstructorId(event.target.value)}
              required
            >
              <option value="">{t('common.select_placeholder')}</option>
              {practiceTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name ?? teacher.email}
                </option>
              ))}
            </select>
          </label>
          {practiceTeachers.length === 0 && (
            <p className="text-xs text-destructive">
              {t('driving.no_practice_instructor')}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>{t('driving.starts_at')}</span>
              <DateTimePicker
                value={startsAt}
                onChange={(value) => {
                  setStartsAt(value ?? '');
                  setInvalidTimes(false);
                }}
                aria-required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>{t('driving.ends_at')}</span>
              <DateTimePicker
                value={endsAt}
                onChange={(value) => {
                  setEndsAt(value ?? '');
                  setInvalidTimes(false);
                }}
                aria-required
              />
            </label>
          </div>
          {invalidTimes && (
            <p role="alert" className="text-sm text-destructive">
              {t('driving.invalid_time')}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {t('driving.schedule')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TrainingEnrollmentDetailPage = () => {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const canSchedule = useCan('scheduleDrivingSessions');
  const canViewSummary = useCan('viewDrivingSummary');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const {
    data: enrollment,
    isLoading,
    isError,
    refetch,
  } = useTrainingEnrollment(id ?? '');
  const { data: program } = useTrainingProgram(enrollment?.program_id ?? '');
  const reportId =
    !canViewSummary ||
    enrollment?.status === 'legacy' ||
    enrollment?.required_minutes == null
      ? ''
      : (enrollment?.id ?? '');
  const summary = useDrivingSummary(reportId);
  const sessions = useDrivingSessionsForReport(reportId);
  const formatDate = (value: string) =>
    formatTashkentDateTime(value, i18n.language);
  const name = enrollment
    ? `${enrollment.student.last_name} ${enrollment.student.first_name}`
    : '';
  const reportReady = !!summary.data && !!sessions.data;

  if (isLoading || isError || !enrollment)
    return (
      <EntityDetailShell
        onBack={() => navigate({ to: '/training-enrollments' })}
        backLabel={t('training.enrollments')}
        isLoading={isLoading}
        isError={isError || !enrollment}
        errorTitle={t('common.error')}
        errorIcon={GraduationCap}
        onRetry={() => void refetch()}
        retryLabel={t('common.retry')}
      />
    );

  return (
    <EntityDetailShell
      onBack={() => navigate({ to: '/training-enrollments' })}
      backLabel={t('training.enrollments')}
      isLoading={false}
      isError={false}
      header={
        <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5 print:hidden">
          <div>
            <h1 className="font-heading text-2xl font-bold">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {program?.name ?? t('training.program')} ·{' '}
              {enrollment.category ?? t('training.legacy')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSchedule &&
              enrollment.status === 'active' &&
              enrollment.program_id && (
                <Button onClick={() => setScheduleOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('driving.schedule')}
                </Button>
              )}
            {canViewSummary && (
              <Button
                variant="outline"
                onClick={() => window.print()}
                disabled={!reportReady}
              >
                <Printer className="mr-2 h-4 w-4" />
                {t('driving.print_report')}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {reportId ? (
        <section
          className="learner-print-report glass-card space-y-5 p-5 print:border-0 print:p-0 print:shadow-none"
          aria-label={t('driving.report_title')}
        >
          <style>
            {'@media print { @page { size: A4 landscape; margin: 12mm; } }'}
          </style>
          <div>
            <h2 className="font-heading text-xl font-semibold">
              {t('driving.report_title')}
            </h2>
            <p className="text-sm">
              {name} · {program?.name ?? enrollment.category} ·{' '}
              {t('training.status.' + enrollment.status)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('driving.instructor_confirmation_notice')}
            </p>
          </div>
          {summary.isError || sessions.isError ? (
            <EmptyState
              title={t('common.error')}
              action={{
                label: t('common.retry'),
                onClick: () => {
                  void summary.refetch();
                  void sessions.refetch();
                },
              }}
            />
          ) : !reportReady ? (
            <p>{t('common.loading')}</p>
          ) : (
            <>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ['required', summary.data.required_minutes],
                    ['planned', summary.data.planned_minutes],
                    ['entered', summary.data.entered_minutes],
                    ['approved', summary.data.approved_minutes],
                    ['exception', summary.data.exception_minutes],
                    ['remaining', summary.data.remaining_minutes],
                  ] as const
                ).map(([key, minutes]) => (
                  <div key={key} className="rounded-md border p-3">
                    <dt className="text-muted-foreground">
                      {t(`driving.${key}`)}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums">
                      {minutes === null
                        ? t('common.na')
                        : `${minutes} ${t('driving.minutes')}`}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm print:min-w-0 print:text-xs">
                  <thead>
                    <tr className="border-b">
                      <th scope="col" className="p-2">
                        {t('common.date')}
                      </th>
                      <th scope="col" className="p-2">
                        {t('driving.vehicle')}
                      </th>
                      <th scope="col" className="p-2">
                        {t('driving.instructor')}
                      </th>
                      <th scope="col" className="p-2">
                        {t('common.status')}
                      </th>
                      <th scope="col" className="p-2">
                        {t('driving.planned')}
                      </th>
                      <th scope="col" className="p-2">
                        {t('driving.entered')}
                      </th>
                      <th scope="col" className="p-2">
                        {t('driving.approved')}
                      </th>
                      <th scope="col" className="p-2">
                        {t('driving.exception')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.data.map((session) => (
                      <tr key={session.id} className="border-b">
                        <td className="p-2">
                          <button
                            type="button"
                            className="text-left text-primary hover:underline print:text-foreground"
                            onClick={() =>
                              navigate({
                                to: '/driving-sessions/$id',
                                params: { id: session.id },
                              })
                            }
                          >
                            {formatDate(session.starts_at)}
                          </button>
                        </td>
                        <td className="p-2">{session.vehicle.plate_number}</td>
                        <td className="p-2">{session.instructor.name}</td>
                        <td className="p-2">
                          {t(`driving.status.${session.status}`)}
                        </td>
                        <td className="p-2 tabular-nums">
                          {session.planned_minutes}
                        </td>
                        <td className="p-2 tabular-nums">
                          {session.actual_minutes ?? '—'}
                        </td>
                        <td className="p-2 tabular-nums">
                          {session.approved_minutes}
                        </td>
                        <td className="p-2 tabular-nums">
                          {session.gps_exception_reason
                            ? session.approved_minutes
                            : 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sessions.data.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('driving.empty_sessions')}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('driving.report_disclaimer')}
              </p>
            </>
          )}
        </section>
      ) : (
        <EmptyState
          title={t(
            canViewSummary ? 'training.legacy' : 'driving.report_unavailable',
          )}
          description={t(
            canViewSummary
              ? 'training.no_attendance_conversion'
              : 'driving.report_staff_only',
          )}
        />
      )}
      {canSchedule &&
        enrollment.status === 'active' &&
        enrollment.program_id &&
        scheduleOpen && (
          <ScheduleDialog
            enrollment={enrollment}
            open={scheduleOpen}
            onClose={() => setScheduleOpen(false)}
          />
        )}
    </EntityDetailShell>
  );
};

export default TrainingEnrollmentDetailPage;
