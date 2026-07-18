import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, startOfWeek, format, parseISO, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  useScheduleTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useGenerateLessons,
  useCalendarLessons,
} from '@/services/scheduleService';
import { useGroups } from '@/services/groupService';
import { DAY_LABELS, CalendarLesson } from '@/types/schedule';
import { LessonType } from '@/types/attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  CircleNotch,
  Sparkle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useCan } from '@/hooks/useCan';
import { EmptyState } from '@/components/ui/EmptyState';
import { extractErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import AttendanceDrawer from '@/components/AttendanceDrawer';

const formatTime = (iso: string) => {
  try {
    return format(new Date(iso), 'HH:mm');
  } catch {
    return iso;
  }
};

const typeDotClass: Record<LessonType, string> = {
  theory: 'bg-primary',
  practice: 'bg-success',
};

interface LessonCardProps {
  lesson: CalendarLesson;
  typeLabel: string;
  onOpen: () => void;
}

// Decluttered lesson card for the week-strip (autodrive-38m.3): time, group,
// teacher, lesson-type dot, and an attendance-status chip. A native <button>
// gives Tab/Enter keyboard access for free.
const LessonCard = ({ lesson, typeLabel, onOpen }: LessonCardProps) => {
  const { t } = useTranslation();
  const marked = lesson.total_count > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="glass-card flex w-full flex-col gap-1 p-2.5 text-left text-sm transition-colors duration-200 hover:border-primary/40"
    >
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {formatTime(lesson.date)}
      </span>
      <span className="font-medium">{lesson.group_name}</span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            typeDotClass[lesson.lesson_type],
          )}
        />
        {typeLabel}
        {lesson.teacher_name ? ` · ${lesson.teacher_name}` : ''}
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
    </button>
  );
};

const SchedulePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const today = new Date();

  const lessonTypeLabel: Record<LessonType, string> = {
    theory: t('schedule.type_theory'),
    practice: t('schedule.type_practice'),
  };
  const [weekStart, setWeekStart] = useState(
    startOfWeek(today, { weekStartsOn: 1 }),
  );

  const weekEnd = addDays(weekStart, 6);
  const dateFrom = weekStart.toISOString();
  const dateTo = weekEnd.toISOString();

  const { data: templates, isLoading: templatesLoading } =
    useScheduleTemplates();
  const { data: lessons, isLoading: lessonsLoading } = useCalendarLessons(
    dateFrom,
    dateTo,
  );
  const { data: groups } = useGroups();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const generateLessons = useGenerateLessons();

  const canEdit = useCan('manageSchedule');

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<CalendarLesson | null>(
    null,
  );

  // Create template form
  const [formGroupId, setFormGroupId] = useState('');
  const [formDayOfWeek, setFormDayOfWeek] = useState('1');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('11:00');
  const [formLessonType, setFormLessonType] = useState<LessonType>('theory');
  // Snapshot taken whenever the create-template dialog opens, compared
  // against current fields to drive the unsaved-changes guard below
  // (autodrive-6cq.5.15) -- this form is plain useState, not
  // react-hook-form, so there's no formState.isDirty to read.
  const initialTemplateFormRef = useRef({
    groupId: formGroupId,
    dayOfWeek: formDayOfWeek,
    startTime: formStartTime,
    endTime: formEndTime,
    lessonType: formLessonType,
  });

  // Generate form
  const [genWeeks, setGenWeeks] = useState('4');
  const [genGroupId, setGenGroupId] = useState('');

  // Build week days array
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Group lessons by day
  const lessonsByDay = useMemo(() => {
    const map = new Map<string, CalendarLesson[]>();
    for (const day of weekDays) {
      const key = format(day, 'yyyy-MM-dd');
      map.set(
        key,
        (lessons || []).filter((l) => {
          try {
            return isSameDay(parseISO(l.date), day);
          } catch {
            return false;
          }
        }),
      );
    }
    return map;
  }, [lessons, weekDays]);

  const openCreate = () => {
    setFormGroupId('');
    setFormDayOfWeek('1');
    setFormStartTime('09:00');
    setFormEndTime('11:00');
    setFormLessonType('theory');
    initialTemplateFormRef.current = {
      groupId: '',
      dayOfWeek: '1',
      startTime: '09:00',
      endTime: '11:00',
      lessonType: 'theory',
    };
    setCreateOpen(true);
  };

  const isTemplateFormDirty =
    formGroupId !== initialTemplateFormRef.current.groupId ||
    formDayOfWeek !== initialTemplateFormRef.current.dayOfWeek ||
    formStartTime !== initialTemplateFormRef.current.startTime ||
    formEndTime !== initialTemplateFormRef.current.endTime ||
    formLessonType !== initialTemplateFormRef.current.lessonType;
  const {
    attemptClose: attemptCloseCreate,
    confirmOpen: createConfirmOpen,
    confirmDiscard: confirmDiscardCreate,
    cancelDiscard: cancelDiscardCreate,
  } = useConfirmedClose(isTemplateFormDirty, () => setCreateOpen(false));

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGroupId || !formStartTime || !formEndTime) {
      toast.error(t('schedule.fill_required'));
      return;
    }
    try {
      await createTemplate.mutateAsync({
        groupId: formGroupId,
        dayOfWeek: Number(formDayOfWeek),
        startTime: formStartTime,
        endTime: formEndTime,
        lessonType: formLessonType,
      });
      toast.success(t('schedule.template_created'));
      setCreateOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, t('common.error')));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTemplate.mutateAsync(deleteId);
      toast.success(t('schedule.template_deleted'));
      setDeleteId(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, t('common.error')));
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const weeks = parseInt(genWeeks);
    if (Number.isNaN(weeks) || weeks < 1 || weeks > 12) {
      toast.error(t('schedule.weeks_error'));
      return;
    }
    try {
      await generateLessons.mutateAsync({
        weeks,
        ...(genGroupId ? { groupId: genGroupId } : {}),
      });
      toast.success(t('schedule.lessons_generated'));
      setGenerateOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, t('schedule.generate_error')));
    }
  };

  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));
  const thisWeek = () => setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('schedule.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(weekStart, 'dd.MM.yyyy')} — {format(weekEnd, 'dd.MM.yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => setGenerateOpen(true)}>
                <Sparkle className="mr-2 h-4 w-4" />{' '}
                {t('schedule.generate_lessons')}
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> {t('schedule.template')}
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">
            {t('schedule.tab_calendar')}
          </TabsTrigger>
          <TabsTrigger value="templates">
            {t('schedule.tab_templates')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          {/* Calendar navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={prevWeek}
                aria-label={t('schedule.prev_week')}
                title={t('schedule.prev_week')}
                className="h-11 w-11"
              >
                <CaretLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={thisWeek}>
                <CalendarBlank className="mr-2 h-4 w-4" /> {t('schedule.today')}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextWeek}
                aria-label={t('schedule.next_week')}
                title={t('schedule.next_week')}
                className="h-11 w-11"
              >
                <CaretRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-primary" />{' '}
                {t('schedule.legend_theory')}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-success" />{' '}
                {t('schedule.legend_practice')}
              </span>
            </div>
          </div>

          {/* Week strip: one column per day, decluttered lesson cards */}
          {lessonsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {weekDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayLessons = lessonsByDay.get(key) || [];
                const isToday = isSameDay(day, today);
                return (
                  <div key={key} className="flex flex-col gap-2">
                    <div
                      className={`border-b pb-1 text-xs font-semibold uppercase tracking-wide ${
                        isToday ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {format(day, 'EEE')}{' '}
                      <span
                        className={isToday ? 'text-primary' : 'text-foreground'}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    {dayLessons.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground/50">
                        —
                      </p>
                    ) : (
                      dayLessons.map((lesson) => (
                        <LessonCard
                          key={lesson.id}
                          lesson={lesson}
                          typeLabel={lessonTypeLabel[lesson.lesson_type]}
                          onOpen={() => setSelectedLesson(lesson)}
                        />
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          {/* Templates section */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold">{t('schedule.templates')}</h2>
              <span className="text-sm text-muted-foreground">
                {t('schedule.count_label', { count: (templates || []).length })}
              </span>
            </div>
            {templatesLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !templates?.length ? (
              <EmptyState
                title={t('schedule.not_found')}
                description={t('schedule.not_found_desc')}
              />
            ) : (
              <div className="divide-y">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium text-sm">
                        {DAY_LABELS[tpl.day_of_week]}
                      </span>
                      <span className="text-sm text-foreground">
                        {tpl.start_time}—{tpl.end_time}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {lessonTypeLabel[tpl.lesson_type]}
                      </span>
                      <button
                        onClick={() => navigate(`/groups/${tpl.group_id}`)}
                        className="text-sm text-muted-foreground hover:text-primary hover:underline"
                      >
                        {tpl.group_name}
                      </button>
                      {tpl.teacher_name && (
                        <span className="text-xs text-muted-foreground">
                          {tpl.teacher_name}
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(tpl.id)}
                        aria-label={t('schedule.delete_title')}
                        title={t('schedule.delete_title')}
                        className="h-11 w-11"
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => !o && attemptCloseCreate()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('schedule.template_title')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('schedule.template_desc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div>
              <Label>{t('schedule.group_label')}</Label>
              <Select value={formGroupId} onValueChange={setFormGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('schedule.group_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(groups || []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} {g.branch_name ? `(${g.branch_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('schedule.day_label')}</Label>
              <Select value={formDayOfWeek} onValueChange={setFormDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DAY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('schedule.start_time')}</Label>
                <Input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label>{t('schedule.end_time')}</Label>
                <Input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>{t('schedule.template_type')}</Label>
              <Select
                value={formLessonType}
                onValueChange={(v: LessonType) => setFormLessonType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="theory">
                    {t('schedule.type_theory')}
                  </SelectItem>
                  <SelectItem value="practice">
                    {t('schedule.type_practice')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={attemptCloseCreate}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createTemplate.isPending}>
                {createTemplate.isPending
                  ? t('common.creating')
                  : t('common.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={createConfirmOpen}
        onClose={cancelDiscardCreate}
        onConfirm={confirmDiscardCreate}
        title={t('common.discard_changes_title')}
        description={t('common.discard_changes_desc')}
        confirmLabel={t('common.discard')}
      />

      {/* Generate Lessons Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('schedule.generate_lessons')}</DialogTitle>
            <DialogDescription>{t('schedule.generate_desc')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <Label>{t('schedule.weeks_label')}</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={genWeeks}
                onChange={(e) => setGenWeeks(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('schedule.weeks_hint')}
              </p>
            </div>
            <div>
              <Label>{t('schedule.group_optional')}</Label>
              <Select
                value={genGroupId || 'all'}
                onValueChange={(v) => setGenGroupId(v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('schedule.all_groups')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('schedule.all_groups')}
                  </SelectItem>
                  {(groups || []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGenerateOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={generateLessons.isPending}>
                {generateLessons.isPending ? (
                  <>
                    <CircleNotch className="mr-2 h-4 w-4 animate-spin" />{' '}
                    {t('common.creating')}
                  </>
                ) : (
                  t('common.create')
                )}
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
        title={t('schedule.delete_title')}
        description={t('schedule.delete_desc')}
        loading={deleteTemplate.isPending}
      />

      <AttendanceDrawer
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
      />
    </div>
  );
};

export default SchedulePage;
