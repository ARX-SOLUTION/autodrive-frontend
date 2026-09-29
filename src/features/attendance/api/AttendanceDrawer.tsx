import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import AttendanceStatusToggle from '@/features/attendance/components/AttendanceStatusToggle';
import {
  useLessonById,
  useBatchAttendance,
} from '@/features/attendance/api/attendanceService';
import { useGroup } from '@/features/groups/api/groupService';
import { useCan } from '@/hooks/useCan';
import { CalendarLesson } from '@/features/schedule/types';
import { AttendanceStatus } from '@/features/attendance/types';
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

const normalizeText = (str: string) =>
  str
    .toLowerCase()
    .replace(/['‘’ʻʼ`]/g, "'")
    .trim();

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
  const { data: group, isLoading: groupLoading } = useGroup(lesson?.group_id);
  const isLoadingRoster =
    detailLoading ||
    (Boolean(lesson?.group_id) && groupLoading && !detail?.attendance?.length);
  const batchAttendance = useBatchAttendance();
  // Explicit capability gate (was implicitly open to any role) — takeAttendance
  // includes every role incl. teacher (permissions.ts), so this keeps teacher
  // self-service working while making the authorization boundary explicit
  // rather than an accidental absence of a check.
  const canSave = useCan('takeAttendance');
  const [changes, setChanges] = useState<Record<string, AttendanceStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Was `useEffect(() => setChanges({}), [lesson?.id])`
  // (react-hooks/set-state-in-effect). React's documented render-phase
  // "reset state when a prop changes" pattern: same reset, same trigger
  // (lesson?.id changing), one render sooner.
  const [changesForLessonId, setChangesForLessonId] = useState(lesson?.id);
  if (lesson?.id !== changesForLessonId) {
    setChangesForLessonId(lesson?.id);
    setChanges({});
    setSearchQuery('');
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

  const filteredRoster = useMemo(() => {
    const q = normalizeText(searchQuery);
    if (!q) return roster;
    const tokens = q.split(/\s+/).filter(Boolean);
    return roster.filter((row) => {
      const normalizedName = normalizeText(row.studentName);
      return tokens.every((token) => normalizedName.includes(token));
    });
  }, [roster, searchQuery]);

  const lessonId = lesson?.id;
  const { statusByStudentId, markedCount, summaryCounts, saveRecords } =
    useMemo(() => {
      const statuses = new Map<string, AttendanceStatus | null>();
      const counts: Record<AttendanceStatus, number> = {
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
      };
      const records: Array<{
        lessonId: string;
        studentId: string;
        status: AttendanceStatus;
      }> = [];
      let marked = 0;

      for (const row of roster) {
        const status = changes[row.studentId] ?? row.status ?? null;
        statuses.set(row.studentId, status);
        if (!status) continue;

        marked += 1;
        counts[status] += 1;
        if (lessonId) {
          records.push({
            lessonId,
            studentId: row.studentId,
            status,
          });
        }
      }

      return {
        statusByStudentId: statuses,
        markedCount: marked,
        summaryCounts: counts,
        saveRecords: records,
      };
    }, [changes, lessonId, roster]);

  const handleSave = async () => {
    if (!lesson) return;
    try {
      await batchAttendance.mutateAsync({
        lessonId: lesson.id,
        records: saveRecords,
      });
      toast.success(t('attendance.saved'));
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, t('attendance.save_error')));
    }
  };

  return (
    <Sheet open={!!lesson} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-border p-4">
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

        {roster.length > 0 && (
          <div className="border-b border-border px-4 py-2.5">
            <div className="relative">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common.search')}
                aria-label={t('common.search')}
                className="h-9 pl-9 pr-9 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('common.clear')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 space-y-1 overflow-y-auto p-4">
          {isLoadingRoster ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : roster.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('attendance.no_students')}
            </p>
          ) : filteredRoster.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t('common.no_data')}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-primary"
              >
                {t('common.clear')}
              </Button>
            </div>
          ) : (
            filteredRoster.map((row) => (
              <div
                key={row.studentId}
                className="flex items-center justify-between gap-3 rounded-xl p-2 motion-safe:transition-colors duration-150 hover:bg-muted/[40%]"
              >
                <div className="flex flex-1 min-w-0 items-center gap-2.5">
                  <span
                    className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-lg border border-border bg-muted font-mono text-[11px] sm:text-xs font-semibold text-muted-foreground"
                    aria-hidden="true"
                  >
                    {initials(row.studentName)}
                  </span>
                  <span
                    className="break-words line-clamp-2 sm:line-clamp-1 font-semibold text-sm sm:text-[14.5px] text-foreground"
                    title={row.studentName}
                  >
                    {row.studentName}
                  </span>
                </div>
                <AttendanceStatusToggle
                  value={statusByStudentId.get(row.studentId) ?? null}
                  onChange={(status) =>
                    setChanges((prev) => ({
                      ...prev,
                      [row.studentId]: status,
                    }))
                  }
                  studentName={row.studentName}
                  className="shrink-0"
                />
              </div>
            ))
          )}
        </div>

        <SheetFooter className="flex-row flex-wrap items-center justify-between gap-3 border-t border-border p-4 sm:justify-between">
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
