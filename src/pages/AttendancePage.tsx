import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from '@/app/navigation';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  useLessons,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
} from '@/services/attendanceService';
import { useGroups } from '@/services/groupService';
import { Lesson, LessonType } from '@/types/attendance';
import { CalendarLesson } from '@/types/schedule';
import AttendanceDrawer from '@/components/AttendanceDrawer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
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
import { ListChecks, Plus, PencilSimple, Trash } from '@phosphor-icons/react';
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
// already-shipped page for a 2-line map. exec-dash 8: practice -> info to
// match the schedule-grid tone (theory=primary, practice=info).
const lessonTypeDotClass: Record<LessonType, string> = {
  theory: 'bg-primary',
  practice: 'bg-info',
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
  canEdit: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNavigateGroup: () => void;
}

// Decluttered lesson card (autodrive-38m.3 / autodrive-6ef.27): date, group,
// teacher, lesson-type dot, attendance-status chip. Clicking the card opens
// the same AttendanceDrawer used by SchedulePage -- one attendance-marking
// UI across both pages instead of this page's old inline expand-to-table.
// exec-dash 8: flat mock card (border-border/bg-card, no shadow); native
// <button> for the open-area instead of a div[role=button] so it gets
// keyboard activation and the global focus-visible ring for free.
const LessonCard = ({
  lesson,
  typeLabel,
  teacherName,
  canEdit,
  canDelete,
  onOpen,
  onEdit,
  onDelete,
  onNavigateGroup,
}: LessonCardProps) => {
  const { t } = useTranslation();
  // Lessons only get AttendanceLog rows once someone saves attendance for
  // them (see AttendanceDrawer's ponytail note), so a non-empty array means
  // this lesson has been marked at least once.
  const marked = lesson.attendance.length > 0;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm motion-safe:transition-colors duration-150 hover:border-primary/[40%]">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-1 text-left"
      >
        <span className="num font-mono text-xs text-muted-foreground">
          {formatDate(lesson.date)}
        </span>
        <span className="font-semibold">{lesson.title}</span>
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
              ? 'bg-success/[14%] text-success'
              : 'border border-dashed border-hair text-muted-foreground',
          )}
        >
          {marked ? t('schedule.status_marked') : t('schedule.status_pending')}
        </span>
      </button>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={onNavigateGroup}
          className="text-xs text-muted-foreground hover:text-primary hover:underline"
        >
          {lesson.group_name || t('attendance.unknown_group')}
        </button>
        <div className="flex items-center gap-0.5">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              aria-label={t('attendance.edit_title')}
              title={t('attendance.edit_title')}
              className="h-11 w-11"
            >
              <PencilSimple className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label={t('attendance.delete_title')}
              title={t('attendance.delete_title')}
              className="h-11 w-11"
            >
              <Trash className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
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
  // Memoised so the reference is stable: the `|| []` fallback would otherwise
  // allocate a new array every render, re-firing the deep-link effect below on
  // each one (its ref guard hid the symptom, but the work was still repeated).
  const lessons = useMemo(() => lessonsData?.data || [], [lessonsData]);
  const totalPages = lessonsData?.total
    ? Math.ceil(lessonsData.total / pageSize)
    : Math.max(1, lessons.length < pageSize ? currentPage : currentPage + 1);
  const { data: groups } = useGroups();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();

  const lessonTypeLabel: Record<LessonType, string> = {
    theory: t('attendance.type_theory'),
    practice: t('attendance.type_practice'),
  };

  // manageSchedule: existing OPS create-any-group. manageOwnLesson
  // additionally lets a teacher create for their own (server-scoped) group
  // (autodrive-vh0.4) without touching SchedulePage's manageSchedule-only
  // template/generate gates. Both hooks called unconditionally (not `||`
  // short-circuited) -- react-hooks/rules-of-hooks.
  const canManageScheduleLessons = useCan('manageSchedule');
  const canManageOwnLesson = useCan('manageOwnLesson');
  const canCreate = canManageScheduleLessons || canManageOwnLesson;
  // DELETE /lessons/:id is @Roles(owner, manager) only -- manageSchedule
  // also grants operator, so gate delete separately to match the backend.
  const role = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id);
  const canDeleteAny = role === 'owner' || role === 'manager';
  // A teacher may additionally delete a lesson they personally created
  // (backend: owner/manager unconditionally, else the creator if teacher).
  // manageOwnLesson deliberately excludes operator, so an operator-created
  // lesson never shows a delete button the backend would still 403.
  const canDeleteLesson = (lesson: Lesson) =>
    canDeleteAny || (canManageOwnLesson && lesson.created_by_id === userId);
  // PATCH /lessons/:id is @Roles(teacher) ONLY on the backend -- unlike
  // manageOwnLesson above (which also grants dev/owner/manager for the
  // delete-own affordance), edit must gate on role === 'teacher' directly.
  // Gating on manageOwnLesson here would show owner/manager an edit button
  // this teacher-only endpoint would 403 on.
  const canEditLesson = (lesson: Lesson) =>
    role === 'teacher' && lesson.created_by_id === userId;
  const groupOptions = groups || [];

  // Groups already carry teacher_name (fetched for the create-dialog Select
  // below) -- reuse it for the card's teacher label instead of a new query.
  const groupTeacherMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const g of groups || []) map.set(g.id, g.teacher_name);
    return map;
  }, [groups]);

  const [createOpen, setCreateOpen] = useState(false);
  // SLICE B (autodrive-vh0.4): non-null while the create dialog above is
  // reused in edit mode -- see openEdit/handleSave. groupId is pre-filled
  // from the lesson but never user-editable (Select is disabled below).
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CalendarLesson | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const form = useForm<CreateLessonFormValues>({
    resolver: zodResolver(createLessonSchema),
    defaultValues: { title: '', date: '', groupId: '', lessonType: 'theory' },
  });

  const openCreate = () => {
    setEditingLesson(null);
    form.reset({ title: '', date: '', groupId: '', lessonType: 'theory' });
    setCreateOpen(true);
  };

  const openEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    form.reset({
      title: lesson.title,
      date: lesson.date,
      groupId: lesson.group_id,
      lessonType: lesson.lesson_type,
    });
    setCreateOpen(true);
  };

  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(form.formState.isDirty, () => setCreateOpen(false));

  // Adapts this page's Lesson (attendanceService) into the CalendarLesson
  // shape AttendanceDrawer expects (built for SchedulePage's calendar
  // query) -- no backend/type change needed, the fields line up.
  const openLesson = useCallback(
    (lesson: Lesson) => {
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
    },
    [groupTeacherMap],
  );

  // autodrive-vh0.6: deep link from the teacher dashboard's upcoming-lessons
  // list -- ?lesson=<id> opens that lesson's drawer once the list has
  // loaded, then drops the param so closing the drawer doesn't reopen it.
  // openLesson(...) (which calls setSelectedLesson) can no longer live
  // directly in an effect body (react-hooks/set-state-in-effect) -- moved to
  // a render-phase guarded call (React's "adjust state when a value
  // changes" pattern). Same one-shot guard as the ref it replaces: fires
  // exactly once, the moment `lessons` first has data while the param is
  // present, match-or-not. Stripping the URL param is a real side effect on
  // the browser history API, so it stays in an effect, gated on the same
  // one-shot flag.
  const [deepLinkOpened, setDeepLinkOpened] = useState(false);
  const deepLinkId = searchParams.get('lesson');
  if (!deepLinkOpened && deepLinkId && lessons.length > 0) {
    setDeepLinkOpened(true);
    const lesson = lessons.find((l) => l.id === deepLinkId);
    if (lesson) openLesson(lesson);
  }
  useEffect(() => {
    if (!deepLinkOpened || !searchParams.get('lesson')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('lesson');
    setSearchParams(next, { replace: true });
  }, [deepLinkOpened, searchParams, setSearchParams]);

  const handleSave = form.handleSubmit(async (values) => {
    try {
      if (editingLesson) {
        // groupId deliberately omitted -- PATCH /lessons/:id doesn't accept
        // it (backend: moving a lesson between groups is out of scope).
        await updateLesson.mutateAsync({
          id: editingLesson.id,
          title: values.title,
          date: values.date,
          lessonType: values.lessonType,
        });
        toast.success(t('attendance.updated'));
      } else {
        await createLesson.mutateAsync({
          title: values.title,
          date: values.date,
          lessonType: values.lessonType,
          groupId: values.groupId,
        });
        toast.success(t('attendance.created'));
      }
      setCreateOpen(false);
    } catch (err) {
      toast.error(
        extractErrorMessage(
          err,
          editingLesson
            ? t('attendance.update_error')
            : t('attendance.create_error'),
        ),
      );
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

  const savePending = createLesson.isPending || updateLesson.isPending;
  const saveLabel = editingLesson
    ? t(savePending ? 'common.saving' : 'attendance.save')
    : t(savePending ? 'common.creating' : 'attendance.create');

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow={t('attendance.title')}
        title={t('attendance.title')}
        icon={<ListChecks className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          canCreate ? (
            <Button onClick={openCreate} className="font-bold">
              <Plus className="mr-2 h-4 w-4" /> {t('attendance.add_lesson')}
            </Button>
          ) : undefined
        }
      />

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
                canEdit={canEditLesson(lesson)}
                canDelete={canDeleteLesson(lesson)}
                onOpen={() => openLesson(lesson)}
                onEdit={() => openEdit(lesson)}
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

      {/* Create/Edit Lesson Dialog -- edit mode reuses this same dialog and
          schema (SLICE B, autodrive-vh0.4), pre-filled via openEdit. */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && attemptClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLesson
                ? t('attendance.edit_title')
                : t('attendance.add_lesson')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingLesson
                ? t('attendance.edit_lesson_desc')
                : t('attendance.add_lesson_desc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleSave} className="space-y-4">
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
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
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
                    {/* groupId is deliberately not editable in edit mode
                        (backend: PATCH /lessons/:id rejects it) -- kept
                        visible, pre-filled, disabled for context. */}
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!editingLesson}
                    >
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
                <Button type="button" variant="outline" onClick={attemptClose}>
                  {t('attendance.cancel')}
                </Button>
                <Button type="submit" disabled={savePending}>
                  {saveLabel}
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

      <ConfirmDialog
        open={confirmOpen}
        onClose={cancelDiscard}
        onConfirm={confirmDiscard}
        title={t('common.discard_changes_title')}
        description={t('common.discard_changes_desc')}
        confirmLabel={t('common.discard')}
      />

      <AttendanceDrawer
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
      />
    </div>
  );
};

export default AttendancePage;
