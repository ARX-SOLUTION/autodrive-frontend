import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  useLessons,
  useCreateLesson,
  useDeleteLesson,
} from '@/services/attendanceService';
import { useGroups } from '@/services/groupService';
import { Lesson, LessonType } from '@/types/attendance';
import { CalendarLesson } from '@/types/schedule';
import AttendanceDrawer from '@/components/AttendanceDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCan } from '@/hooks/useCan';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { extractErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

const formatDate = (d: string) => {
  try {
    return format(new Date(d), 'dd.MM.yyyy HH:mm');
  } catch {
    return d;
  }
};

// ponytail: mirrors SchedulePage's local typeDotClass. Kept duplicated (2
// entries) instead of extracted to a shared file, to avoid touching that
// already-shipped page for a 2-line map.
const lessonTypeDotClass: Record<LessonType, string> = {
  theory: 'bg-primary',
  practice: 'bg-success',
};

const createLessonSchema = z.object({
  title: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
  groupId: z.string().min(1, 'Required'),
  lessonType: z.enum(['theory', 'practice']),
});
type CreateLessonFormValues = z.infer<typeof createLessonSchema>;

interface LessonCardProps {
  lesson: Lesson;
  typeLabel: string;
  teacherName?: string | null;
  canDelete: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onNavigateGroup: () => void;
}

// Decluttered lesson card matching SchedulePage's glass-card visual language
// (autodrive-38m.3 / autodrive-6ef.27): date, group, teacher, lesson-type
// dot, attendance-status chip. Clicking the card opens the same
// AttendanceDrawer used by SchedulePage -- one attendance-marking UI across
// both pages instead of this page's old inline expand-to-table.
const LessonCard = ({
  lesson,
  typeLabel,
  teacherName,
  canDelete,
  onOpen,
  onDelete,
  onNavigateGroup,
}: LessonCardProps) => {
  const { t } = useTranslation();
  // Lessons only get AttendanceLog rows once someone saves attendance for
  // them (see AttendanceDrawer's ponytail note), so a non-empty array means
  // this lesson has been marked at least once.
  const marked = lesson.attendance.length > 0;
  return (
    <div className="glass-card flex flex-col gap-2 p-3 text-sm transition-colors duration-200 hover:border-primary/40">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        className="flex cursor-pointer flex-col gap-1"
      >
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {formatDate(lesson.date)}
        </span>
        <span className="font-medium">{lesson.title}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              lessonTypeDotClass[lesson.lesson_type],
            )}
          />
          {typeLabel}
          {teacherName ? ` · ${teacherName}` : ''}
        </span>
        <span
          className={cn(
            'mt-0.5 w-fit rounded-full px-2 py-0.5 text-[11px] font-medium',
            marked
              ? 'bg-success/10 text-success'
              : 'border border-dashed text-muted-foreground',
          )}
        >
          {marked ? t('schedule.status_marked') : t('schedule.status_pending')}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateGroup}
          className="text-xs text-muted-foreground hover:text-primary hover:underline"
        >
          {lesson.group_name || t('attendance.unknown_group')}
        </button>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label={t('attendance.delete_title')}
            title={t('attendance.delete_title')}
            className="h-11 w-11"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        )}
      </div>
    </div>
  );
};

const AttendancePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const { data: lessonsData, isLoading } = useLessons(currentPage, pageSize);
  const lessons = lessonsData?.data || [];
  const totalPages = lessonsData?.total
    ? Math.ceil(lessonsData.total / pageSize)
    : Math.max(1, lessons.length < pageSize ? currentPage : currentPage + 1);
  const { data: groups } = useGroups();
  const createLesson = useCreateLesson();
  const deleteLesson = useDeleteLesson();

  const lessonTypeLabel: Record<LessonType, string> = {
    theory: t('attendance.type_theory'),
    practice: t('attendance.type_practice'),
  };

  const canCreate = useCan('manageSchedule');
  // DELETE /lessons/:id is @Roles(owner, manager) only -- manageSchedule
  // also grants operator, so gate delete separately to match the backend.
  const role = useAuthStore((s) => s.user?.role);
  const canDelete = role === 'owner' || role === 'manager';
  const groupOptions = groups || [];

  // Groups already carry teacher_name (fetched for the create-dialog Select
  // below) -- reuse it for the card's teacher label instead of a new query.
  const groupTeacherMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const g of groups || []) map.set(g.id, g.teacher_name);
    return map;
  }, [groups]);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<CalendarLesson | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<CreateLessonFormValues>({
    resolver: zodResolver(createLessonSchema),
    defaultValues: { title: '', date: '', groupId: '', lessonType: 'theory' },
  });

  const openCreate = () => {
    form.reset({ title: '', date: '', groupId: '', lessonType: 'theory' });
    setCreateOpen(true);
  };

  // Adapts this page's Lesson (attendanceService) into the CalendarLesson
  // shape AttendanceDrawer expects (built for SchedulePage's calendar
  // query) -- no backend/type change needed, the fields line up.
  const openLesson = (lesson: Lesson) => {
    setSelectedLesson({
      id: lesson.id,
      title: lesson.title,
      date: lesson.date,
      lesson_type: lesson.lesson_type,
      group_id: lesson.group_id,
      group_name: lesson.group_name || '',
      branch_id: lesson.branch_id,
      teacher_name: groupTeacherMap.get(lesson.group_id) || undefined,
      present_count: lesson.attendance.filter((a) => a.status === 'present')
        .length,
      total_count: lesson.attendance.length,
    });
  };

  const handleCreate = form.handleSubmit(async (values) => {
    try {
      await createLesson.mutateAsync({
        title: values.title,
        date: new Date(values.date).toISOString(),
        lessonType: values.lessonType,
        groupId: values.groupId,
      });
      toast.success(t('attendance.created'));
      setCreateOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, t('attendance.create_error')));
    }
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteLesson.mutateAsync(deleteId);
      toast.success(t('attendance.deleted'));
      setDeleteId(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, t('attendance.delete_error')));
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !lessons?.length ? (
        <EmptyState
          title={t('attendance.not_found')}
          description={t('attendance.not_found_desc')}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                typeLabel={lessonTypeLabel[lesson.lesson_type]}
                teacherName={groupTeacherMap.get(lesson.group_id)}
                canDelete={canDelete}
                onOpen={() => openLesson(lesson)}
                onDelete={() => setDeleteId(lesson.id)}
                onNavigateGroup={() => navigate(`/groups/${lesson.group_id}`)}
              />
            ))}
          </div>
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
            <DialogDescription className="sr-only">
              {t('attendance.add_lesson_desc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleCreate} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('attendance.lesson_title')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('attendance.title_placeholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('attendance.lesson_date')}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('attendance.lesson_group')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('attendance.group_placeholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groupOptions.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} {g.branch_name ? `(${g.branch_name})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lessonType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('attendance.lesson_type')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="theory">
                          {t('attendance.type_theory')}
                        </SelectItem>
                        <SelectItem value="practice">
                          {t('attendance.type_practice')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('attendance.delete_title')}
        description={t('attendance.delete_desc')}
        loading={deleteLesson.isPending}
      />

      <AttendanceDrawer
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
      />
    </div>
  );
};

export default AttendancePage;
