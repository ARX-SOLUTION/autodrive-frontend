import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  useLessons,
  useLessonById,
  useCreateLesson,
  useBatchAttendance,
  useDeleteLesson,
} from '@/services/attendanceService';
import { useGroups } from '@/services/groupService';
import { AttendanceStatus, LessonType } from '@/types/attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCan } from '@/hooks/useCan';
import { EmptyState } from '@/components/ui/EmptyState';

const formatDate = (d: string) => {
  try {
    return format(new Date(d), 'dd.MM.yyyy HH:mm');
  } catch {
    return d;
  }
};

const statusColors: Record<AttendanceStatus, string> = {
  present:
    'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
  absent: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
  late: 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30',
  excused: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
};

const AttendancePage = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const { data: lessonsData, isLoading } = useLessons(currentPage, pageSize);
  const lessons = lessonsData?.data || [];
  const totalPages = lessonsData?.total
    ? Math.ceil(lessonsData.total / pageSize)
    : Math.max(1, lessons.length < pageSize ? currentPage : currentPage + 1);
  const { data: groups } = useGroups();
  const createLesson = useCreateLesson();
  const batchAttendance = useBatchAttendance();
  const deleteLesson = useDeleteLesson();

  const statusLabels: Record<AttendanceStatus, string> = {
    present: t('attendance.status.present'),
    absent: t('attendance.status.absent'),
    late: t('attendance.status.late'),
    excused: t('attendance.status.excused'),
  };

  const canEdit = useCan('takeAttendance');
  // teacher can mark attendance but cannot create/delete lessons
  const canCreate = useCan('manageSchedule');
  const groupOptions = groups || [];

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Create lesson form
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formLessonType, setFormLessonType] = useState<LessonType>('theory');

  // Attendance marking
  const [attendanceState, setAttendanceState] = useState<
    Record<string, AttendanceStatus>
  >({});

  const {
    data: detailLesson,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useLessonById({ id: detailId || '' });

  const openCreate = () => {
    setFormTitle('');
    setFormDate('');
    setFormGroupId('');
    setFormLessonType('theory');
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate || !formGroupId) {
      toast.error(t('common.fill_required'));
      return;
    }
    try {
      await createLesson.mutateAsync({
        title: formTitle,
        date: new Date(formDate).toISOString(),
        lessonType: formLessonType,
        groupId: formGroupId,
      });
      toast.success(t('attendance.created'));
      setCreateOpen(false);
    } catch {
      toast.error(t('attendance.create_error'));
    }
  };

  const handleStatusChange = (recordId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({ ...prev, [recordId]: status }));
  };

  const handleSaveAttendance = async (lessonId: string) => {
    if (!detailLesson) return;
    try {
      const records = detailLesson.attendance.map((rec) => ({
        lessonId,
        studentId: rec.student_id,
        status: attendanceState[rec.id] || rec.status,
      }));
      await batchAttendance.mutateAsync({ lessonId, records });
      toast.success(t('attendance.saved'));
    } catch {
      toast.error(t('attendance.save_error'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteLesson.mutateAsync(deleteId);
      toast.success(t('attendance.deleted'));
      setDeleteId(null);
    } catch {
      toast.error(t('attendance.delete_error'));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('attendance.title')}</h1>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> {t('attendance.add_lesson')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !lessons?.length ? (
        <EmptyState
          title={t('attendance.not_found')}
          description={t('attendance.not_found_desc')}
        />
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="rounded-lg border bg-card">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{lesson.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(lesson.date)} —{' '}
                      {lesson.group_name || t('attendance.unknown_group')}
                      <span className="ml-2 text-xs uppercase text-muted-foreground">
                        {lesson.lesson_type === 'theory' ? 'Teoriya' : 'Amaliy'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {
                      lesson.attendance.filter((a) => a.status === 'present')
                        .length
                    }
                    /{lesson.attendance.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDetailId(detailId === lesson.id ? null : lesson.id);
                      if (detailId !== lesson.id) {
                        setAttendanceState({});
                      }
                    }}
                    aria-label={
                      detailId === lesson.id
                        ? t('common.close')
                        : t('common.view')
                    }
                    title={
                      detailId === lesson.id
                        ? t('common.close')
                        : t('common.view')
                    }
                    className="h-11 min-w-11"
                  >
                    <Eye className="h-4 w-4" />
                    {detailId === lesson.id ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                  {canCreate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(lesson.id)}
                      aria-label={t('attendance.delete_title')}
                      title={t('attendance.delete_title')}
                      className="h-11 w-11"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>

              {detailId === lesson.id && (
                <div className="border-t px-4 pb-4 pt-2">
                  {isDetailError ? (
                    <div className="flex items-center justify-between py-4 text-sm text-destructive">
                      <span>{t('common.error')}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchDetail()}
                      >
                        {t('common.retry')}
                      </Button>
                    </div>
                  ) : (
                    detailLesson?.id === lesson.id && (
                      <>
                        {detailLesson.attendance.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">
                            {t('attendance.no_students')}
                          </p>
                        ) : (
                          <>
                            <div className="grid gap-2 md:hidden">
                              {detailLesson.attendance.map((rec) => (
                                <div
                                  key={rec.id}
                                  className="rounded-lg border bg-background p-3"
                                >
                                  <p className="mb-2 font-medium">
                                    {rec.student_name}
                                  </p>
                                  {canEdit ? (
                                    <Select
                                      value={
                                        attendanceState[rec.id] || rec.status
                                      }
                                      onValueChange={(v) =>
                                        handleStatusChange(
                                          rec.id,
                                          v as AttendanceStatus,
                                        )
                                      }
                                    >
                                      <SelectTrigger
                                        className={`h-11 w-full ${statusColors[attendanceState[rec.id] || rec.status]}`}
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(
                                          Object.entries(statusLabels) as [
                                            AttendanceStatus,
                                            string,
                                          ][]
                                        ).map(([key, label]) => (
                                          <SelectItem key={key} value={key}>
                                            {label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span
                                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[rec.status]}`}
                                    >
                                      {statusLabels[rec.status]}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="hidden overflow-x-auto md:block">
                              <table className="w-full min-w-[400px] text-sm">
                                <thead>
                                  <tr className="border-b text-left text-muted-foreground">
                                    <th className="pb-2 font-medium">
                                      {t('attendance.table_student')}
                                    </th>
                                    <th className="pb-2 font-medium">
                                      {t('attendance.table_status')}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailLesson.attendance.map((rec) => (
                                    <tr
                                      key={rec.id}
                                      className="border-b last:border-0"
                                    >
                                      <td className="py-2">
                                        {rec.student_name}
                                      </td>
                                      <td className="py-2">
                                        {canEdit ? (
                                          <Select
                                            value={
                                              attendanceState[rec.id] ||
                                              rec.status
                                            }
                                            onValueChange={(v) =>
                                              handleStatusChange(
                                                rec.id,
                                                v as AttendanceStatus,
                                              )
                                            }
                                          >
                                            <SelectTrigger
                                              className={`w-32 ${statusColors[attendanceState[rec.id] || rec.status]}`}
                                            >
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {(
                                                Object.entries(
                                                  statusLabels,
                                                ) as [
                                                  AttendanceStatus,
                                                  string,
                                                ][]
                                              ).map(([key, label]) => (
                                                <SelectItem
                                                  key={key}
                                                  value={key}
                                                >
                                                  {label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <span
                                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[rec.status]}`}
                                          >
                                            {statusLabels[rec.status]}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                        {canEdit && (
                          <div className="mt-3 flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleSaveAttendance(lesson.id)}
                              disabled={batchAttendance.isPending}
                            >
                              {batchAttendance.isPending
                                ? t('common.saving')
                                : t('attendance.save')}
                            </Button>
                          </div>
                        )}
                      </>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Create Lesson Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('attendance.add_lesson')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>{t('attendance.lesson_title')}</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t('attendance.title_placeholder')}
              />
            </div>
            <div>
              <Label>{t('attendance.lesson_date')}</Label>
              <Input
                type="datetime-local"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('attendance.lesson_group')}</Label>
              <Select value={formGroupId} onValueChange={setFormGroupId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('attendance.group_placeholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {groupOptions.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} {g.branch_name ? `(${g.branch_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('attendance.lesson_type')}</Label>
              <Select
                value={formLessonType}
                onValueChange={(v: LessonType) => setFormLessonType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="theory">
                    {t('attendance.type_theory')}
                  </SelectItem>
                  <SelectItem value="practice">
                    {t('attendance.type_practice')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                {t('attendance.cancel')}
              </Button>
              <Button type="submit" disabled={createLesson.isPending}>
                {createLesson.isPending
                  ? t('common.creating')
                  : t('attendance.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('attendance.delete_title')}
        description={t('attendance.delete_desc')}
      />
    </div>
  );
};

export default AttendancePage;
