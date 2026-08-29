import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AttendanceStatusToggle from '@/components/AttendanceStatusToggle';
import {
  useLessonById,
  useBatchAttendance,
} from '@/services/attendanceService';
import { useGroup } from '@/services/groupService';
import { useCan } from '@/hooks/useCan';
import { CalendarLesson } from '@/types/schedule';
import { AttendanceStatus } from '@/types/attendance';
import { statusTone } from '@/lib/attendanceStatus';
import { extractErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

interface RosterRow {
  studentId: string;
  studentName: string;
  status: AttendanceStatus | null;
}

interface AttendanceDrawerProps {
  lesson: CalendarLesson | null;
  onClose: () => void;
}

const SUMMARY_STATUSES: AttendanceStatus[] = [
  'present',
  'late',
  'absent',
  'excused',
];

// Roster row avatar initials -- e.g. "Valiyev Ali" -> "VA". Purely
// decorative, derived from the same studentName the row already renders.
const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

// Slide-over roster + one-click attendance marking for a single lesson
// (autodrive-38m.3), opened from a SchedulePage/AttendancePage lesson card.
// exec-dash 8: this is the mock's "roster list card" + status-summary +
// footer bar -- AttendancePage itself is a multi-lesson browser, not a
// single roster, so those mock sections land here instead. Same
// state/mutation wiring throughout.
const AttendanceDrawer = ({ lesson, onClose }: AttendanceDrawerProps) => {
  const { t } = useTranslation();
  const { data: detail, isLoading: detailLoading } = useLessonById({
    id: lesson?.id || '',
  });
  // ponytail: generated/template lessons never pre-seed AttendanceLog rows --
  // the backend only creates them on first save (see attendance.service.ts
  // batchAttendance upsert). So a never-marked lesson's `attendance` array is
  // empty; fall back to the group roster so there's someone to mark on the
  // very first save. Upgrade path: pre-seed rows server-side if this proves
  // too slow for large groups.
  const { data: group } = useGroup(lesson?.group_id);
  const batchAttendance = useBatchAttendance();
  // Explicit capability gate (was implicitly open to any role) — takeAttendance
  // includes every role incl. teacher (permissions.ts), so this keeps teacher
  // self-service working while making the authorization boundary explicit
  // rather than an accidental absence of a check.
  const canSave = useCan('takeAttendance');
  const [changes, setChanges] = useState<Record<string, AttendanceStatus>>({});

  // Was `useEffect(() => setChanges({}), [lesson?.id])`
  // (react-hooks/set-state-in-effect). React's documented render-phase
  // "reset state when a prop changes" pattern: same reset, same trigger
  // (lesson?.id changing), one render sooner.
  const [changesForLessonId, setChangesForLessonId] = useState(lesson?.id);
  if (lesson?.id !== changesForLessonId) {
    setChangesForLessonId(lesson?.id);
    setChanges({});
  }

  const roster = useMemo<RosterRow[]>(() => {
    const records = detail?.attendance ?? [];
    if (group?.students?.length) {
      const byStudent = new Map(records.map((r) => [r.student_id, r]));
      return group.students.map((s) => {
        const rec = byStudent.get(s.id);
        return {
          studentId: s.id,
          studentName: `${s.last_name} ${s.first_name}`,
          status: rec?.status ?? null,
        };
      });
    }
    return records.map((r) => ({
      studentId: r.student_id,
      studentName: r.student_name,
      status: r.status,
    }));
  }, [detail, group]);

  const statusFor = (studentId: string): AttendanceStatus | null =>
    changes[studentId] ??
    roster.find((r) => r.studentId === studentId)?.status ??
    null;

  const markedCount = roster.filter(
    (r) => statusFor(r.studentId) !== null,
  ).length;

  // exec-dash 8: per-status counts for the summary-chips row -- same
  // read-only-derive pattern as markedCount above, not a new query/mutation.
  const summaryCounts: Record<AttendanceStatus, number> = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
  };
  for (const row of roster) {
    const status = statusFor(row.studentId);
    if (status) summaryCounts[status] += 1;
  }

  const handleSave = async () => {
    if (!lesson) return;
    const records = roster
      .filter((r) => statusFor(r.studentId) !== null)
      .map((r) => ({
        lessonId: lesson.id,
        studentId: r.studentId,
        status: statusFor(r.studentId) as AttendanceStatus,
      }));
    try {
      await batchAttendance.mutateAsync({ lessonId: lesson.id, records });
      toast.success(t('attendance.saved'));
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, t('attendance.save_error')));
    }
  };

  return (
    <Sheet open={!!lesson} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5 text-left">
          <SheetTitle className="text-[17px] font-bold">
            {lesson?.group_name}
          </SheetTitle>
          <SheetDescription className="font-mono text-xs text-muted-foreground">
            {lesson && format(new Date(lesson.date), 'EEEE, dd.MM · HH:mm')}
            {lesson?.teacher_name ? ` · ${lesson.teacher_name}` : ''}
          </SheetDescription>
        </SheetHeader>

        {roster.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2 border-b border-border p-4">
            {SUMMARY_STATUSES.map((status) => (
              <div
                key={status}
                className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-2.5"
              >
                <span className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  <span
                    className={cn(
                      'h-[9px] w-[9px] shrink-0 rounded-full',
                      statusTone[status].dot,
                    )}
                    aria-hidden="true"
                  />
                  {t(`attendance.status_${status}`)}
                </span>
                <span
                  className={cn(
                    'num text-[28px] font-extrabold leading-none',
                    statusTone[status].text,
                  )}
                >
                  {summaryCounts[status]}
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {' '}
                    / {roster.length}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 space-y-1 overflow-y-auto p-4">
          {detailLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : roster.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('attendance.no_students')}
            </p>
          ) : (
            roster.map((row) => (
              <div
                key={row.studentId}
                className="flex items-center justify-between gap-3 rounded-xl p-2 motion-safe:transition-colors duration-150 hover:bg-muted/[40%]"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-muted font-mono text-xs font-semibold text-muted-foreground"
                    aria-hidden="true"
                  >
                    {initials(row.studentName)}
                  </span>
                  <span className="truncate text-[14.5px] font-semibold">
                    {row.studentName}
                  </span>
                </span>
                <AttendanceStatusToggle
                  value={statusFor(row.studentId)}
                  onChange={(status) =>
                    setChanges((prev) => ({
                      ...prev,
                      [row.studentId]: status,
                    }))
                  }
                  className="w-full max-w-[380px]"
                />
              </div>
            ))
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t border-border p-4 sm:justify-between">
          <span className="font-mono text-xs text-muted-foreground">
            {t('attendance.marked_progress', {
              marked: markedCount,
              total: roster.length,
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || batchAttendance.isPending}
              className="font-bold"
            >
              {batchAttendance.isPending
                ? t('common.saving')
                : t('attendance.save')}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default AttendanceDrawer;
