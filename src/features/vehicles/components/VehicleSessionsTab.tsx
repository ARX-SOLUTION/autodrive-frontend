import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
  CalendarBlank,
  Clock,
  User,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { useDrivingSessionsPage } from '@/features/driving-sessions/api/drivingSessionService';
import type {
  DrivingSession,
  DrivingSessionStatus,
} from '@/features/driving-sessions/types';
import {
  formatTashkentDate,
  formatTashkentDateTime,
} from '@/lib/calendarDateTime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface VehicleSessionsTabProps {
  vehicleId: string;
}

const statusBadgeVariant = (
  status: DrivingSessionStatus,
): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (status) {
    case 'approved':
      return 'default';
    case 'submitted':
      return 'secondary';
    case 'planned':
      return 'outline';
    case 'rejected':
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

export default function VehicleSessionsTab({
  vehicleId,
}: VehicleSessionsTabProps) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, refetch } = useDrivingSessionsPage({
    vehicleId,
    page,
    limit,
  });

  const now = new Date();
  const sessions = data?.data ?? [];
  const meta = data?.meta;

  // Find currently active session (if any)
  const activeSession = sessions.find((s) => {
    if (s.status !== 'planned') return false;
    const start = new Date(s.starts_at);
    const end = new Date(s.ends_at);
    return now >= start && now <= end;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title={t('common.error')}
        action={{
          label: t('common.retry'),
          onClick: () => void refetch(),
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* GiST constraint explanation banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-foreground block">
            {t('vehicles.sessions')}
          </span>
          <p className="leading-relaxed">
            {t('vehicles.session_conflict_notice')}
          </p>
        </div>
      </div>

      {/* Prominently highlighted active session */}
      {activeSession && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              {t('vehicles.active_now')}
            </span>
            <Badge
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {t(`driving.status.${activeSession.status}`)}
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {
                  formatTashkentDateTime(
                    activeSession.starts_at,
                    i18n.language,
                  ).split(' ')[1]
                }{' '}
                -{' '}
                {
                  formatTashkentDateTime(
                    activeSession.ends_at,
                    i18n.language,
                  ).split(' ')[1]
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {t('driving.instructor')}:{' '}
                <strong className="text-foreground">
                  {activeSession.instructor.name}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>
                {activeSession.student.first_name}{' '}
                {activeSession.student.last_name}
              </span>
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs font-medium"
            >
              <Link
                to="/driving-sessions/$id"
                params={{ id: activeSession.id }}
              >
                {t('vehicles.view_session')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <EmptyState
          title={t('vehicles.no_sessions')}
          description={t('driving.schedule_desc')}
        />
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="p-3">{t('driving.starts_at')}</th>
                  <th className="p-3">{t('driving.instructor')}</th>
                  <th className="p-3">
                    {t('driving.session')} ({t('common.status')})
                  </th>
                  <th className="p-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map((session: DrivingSession) => (
                  <tr
                    key={session.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-3 space-y-0.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <CalendarBlank className="h-3.5 w-3.5 text-primary" />
                        {formatTashkentDate(session.starts_at, i18n.language)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {
                          formatTashkentDateTime(
                            session.starts_at,
                            i18n.language,
                          ).split(' ')[1]
                        }{' '}
                        -{' '}
                        {
                          formatTashkentDateTime(
                            session.ends_at,
                            i18n.language,
                          ).split(' ')[1]
                        }{' '}
                        ({session.planned_minutes} {t('driving.minutes')})
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">
                        {session.instructor?.name || '—'}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {session.student?.first_name}{' '}
                        {session.student?.last_name}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={statusBadgeVariant(session.status)}
                        className="capitalize"
                      >
                        {t(`driving.status.${session.status}`)}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        aria-label={t('vehicles.view_session')}
                      >
                        <Link
                          to="/driving-sessions/$id"
                          params={{ id: session.id }}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <span>
                {meta.page} / {meta.totalPages} ({meta.total}{' '}
                {t('vehicles.sessions')})
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label={t('common.previous')}
                >
                  <CaretLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  disabled={!meta.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label={t('common.next')}
                >
                  <CaretRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
