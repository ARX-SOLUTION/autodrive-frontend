import { useEffect, useMemo, useState } from 'react';
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
import { CalendarLesson } from '@/types/schedule';
import { AttendanceStatus } from '@/types/attendance';
import { extractErrorMessage } from '@/lib/errors';

interface RosterRow {
  studentId: string;
  studentName: string;
  status: AttendanceStatus | null;
}

interface AttendanceDrawerProps {
  lesson: CalendarLesson | null;
  onClose: () => void;
}

// Slide-over roster + one-click attendance marking for a single lesson
// (autodrive-38m.3), opened from a SchedulePage week-strip card.
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
  const [changes, setChanges] = useState<Record<string, AttendanceStatus>>({});

  useEffect(() => {
    setChanges({});
  }, [lesson?.id]);

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
        <SheetHeader className="border-b p-5 text-left">
          <SheetTitle>{lesson?.group_name}</SheetTitle>
          <SheetDescription>
            {lesson && format(new Date(lesson.date), 'EEEE, dd.MM · HH:mm')}
            {lesson?.teacher_name ? ` · ${lesson.teacher_name}` : ''}
          </SheetDescription>
        </SheetHeader>

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
                className="flex items-center justify-between gap-3 rounded-lg p-2 transition-colors duration-150 hover:bg-accent/40"
              >
                <span className="text-sm font-medium">{row.studentName}</span>
                <AttendanceStatusToggle
                  value={statusFor(row.studentId)}
                  onChange={(status) =>
                    setChanges((prev) => ({
                      ...prev,
                      [row.studentId]: status,
                    }))
                  }
                />
              </div>
            ))
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t p-4 sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {t('attendance.marked_progress', {
              marked: markedCount,
              total: roster.length,
            })}
          </span>
          <Button onClick={handleSave} disabled={batchAttendance.isPending}>
            {batchAttendance.isPending
              ? t('common.saving')
              : t('attendance.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default AttendanceDrawer;
