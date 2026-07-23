import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, startOfWeek, format, parseISO, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Plus,
  Trash,
  Calendar,
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

// exec-dash 8: practice -> info to match the mock's schedule-grid tone
// (Design.md: teoriya=amber, amaliy=blue). Cell bg/border/tag share the same
// tone, kept as full static strings (not `bg-${tone}`) since Tailwind's
// scanner only picks up literal class text.
const typeCellClass: Record<LessonType, string> = {
  theory: 'bg-primary/[14%] border-primary/[32%] hover:bg-primary/[20%]',
  practice: 'bg-info/[14%] border-info/[32%] hover:bg-info/[20%]',
};
const typeTagTextClass: Record<LessonType, string> = {
  theory: 'text-primary',
  practice: 'text-info',
};

interface LessonCardProps {
  lesson: CalendarLesson;
  typeLabel: string;
  onOpen: () => void;
}

// Decluttered lesson cell for the week-strip (autodrive-38m.3): type tag,
// time, group, teacher, attendance-status chip. A native <button> gives
// Tab/Enter keyboard access for free. exec-dash 8: mock's tinted lesson-cell
// treatment -- no "room" field in CalendarLesson, so the cell shows teacher
// only (deviation from the mock's "teacher · room").
const LessonCard = ({ lesson, typeLabel, onOpen }: LessonCardProps) => {
  const { t } = useTranslation();
  const marked = lesson.total_count > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex min-h-[80px] w-full flex-col gap-0.5 rounded-[11px] border p-[10px] text-left motion-safe:transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        typeCellClass[lesson.lesson_type],
      )}
    >
      <span
        className={cn(
          'font-mono text-[9px] font-bold uppercase tracking-[0.08em]',
          typeTagTextClass[lesson.lesson_type],
        )}
      >
        {typeLabel}
      </span>
      <span className="num font-mono text-[11px] text-muted-foreground">
        {formatTime(lesson.date)}
      </span>
      <span className="truncate text-[13.5px] font-bold">
        {lesson.group_name}
      </span>
      {lesson.teacher_name && (
        <span className="truncate text-[10.5px] text-muted-foreground">
          {lesson.teacher_name}
        </span>
      )}
      <span
        className={cn(
          'mt-auto w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold',
          marked
            ? 'bg-success/[14%] text-success'
            : 'border border-dashed border-hair text-muted-foreground',
        )}
      >
        {marked ? t('schedule.status_marked') : t('schedule.status_pending')}
      </span>
    </button>
  );
};

// Two independent RHF forms on this page: create-template (dirty-guarded)
// and generate-lessons (no dirty guard, matching the original plain-state
// behavior -- autodrive-6cq.5.15 only ever guarded the template form).
const makeTemplateFormSchema = (t: (key: string) => string) =>
  z.object({
    groupId: z.string().trim().min(1, t('common.required')),
    dayOfWeek: z.string(),
    startTime: z.string().min(1, t('common.required')),
    endTime: z.string().min(1, t('common.required')),
    lessonType: z.enum(['theory', 'practice']),
  });
type TemplateFormValues = z.infer<ReturnType<typeof makeTemplateFormSchema>>;

const makeGenerateFormSchema = (t: (key: string) => string) =>
  z.object({
    weeks: z.string().refine((v) => {
      const n = parseInt(v);
      return !Number.isNaN(n) && n >= 1 && n <= 12;
    }, t('schedule.weeks_error')),
    groupId: z.string(),
  });
type GenerateFormValues = z.infer<ReturnType<typeof makeGenerateFormSchema>>;

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
  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(makeTemplateFormSchema(t)),
    defaultValues: {
      groupId: '',
      dayOfWeek: '1',
      startTime: '09:00',
      endTime: '11:00',
      lessonType: 'theory',
    },
  });

  // Generate form -- no dirty guard, matches the original plain-state page.
  const generateForm = useForm<GenerateFormValues>({
    resolver: zodResolver(makeGenerateFormSchema(t)),
    defaultValues: { weeks: '4', groupId: '' },
  });

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
    templateForm.reset({
      groupId: '',
      dayOfWeek: '1',
      startTime: '09:00',
      endTime: '11:00',
      lessonType: 'theory',
    });
    setCreateOpen(true);
  };

  const {
    attemptClose: attemptCloseCreate,
    confirmOpen: createConfirmOpen,
    confirmDiscard: confirmDiscardCreate,
    cancelDiscard: cancelDiscardCreate,
  } = useConfirmedClose(templateForm.formState.isDirty, () =>
    setCreateOpen(false),
  );

  const handleCreateTemplate = async (values: TemplateFormValues) => {
    try {
      await createTemplate.mutateAsync({
        groupId: values.groupId,
        dayOfWeek: Number(values.dayOfWeek),
        startTime: values.startTime,
        endTime: values.endTime,
        lessonType: values.lessonType,
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

  const handleGenerate = async (values: GenerateFormValues) => {
    try {
      const result = await generateLessons.mutateAsync({
        weeks: parseInt(values.weeks),
        ...(values.groupId ? { groupId: values.groupId } : {}),
      });
      // Report the real created/skipped counts (autodrive-52v.4) -- the old
      // fixed "generated" string showed the same success toast even for
      // "0 created, 12 skipped".
      toast.success(
        t('schedule.lessons_generated', {
          created: result.created,
          skipped: result.skipped,
        }),
      );
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {t('schedule.title')}
          </div>
          <h1 className="mt-1.5 font-heading text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] text-balance">
            {t('schedule.title')}
          </h1>
          <p className="num mt-1.5 font-mono text-[13px] text-muted-foreground">
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
          <div
            className="flex flex-wrap items-center justify-between gap-3 motion-safe:animate-[rise_0.4s_ease-out_both]"
            style={{ animationDelay: '40ms' }}
          >
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
            <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-[13px] w-[13px] rounded-[4px] border border-primary/[40%] bg-primary/[16%]" />
                {t('schedule.legend_theory')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[13px] w-[13px] rounded-[4px] border border-info/[40%] bg-info/[16%]" />
                {t('schedule.legend_practice')}
              </span>
            </div>
          </div>

          {/* Week strip: one column per day, decluttered lesson cards.
              exec-dash 8: mock's "grid card" shell -- day-columns already
              existed, but there's no shared time-row axis in the data model
              (lessons within a day aren't slotted to hours), so this stays a
              per-day list of cards inside a scrollable 7-col shell rather
              than a literal time x day matrix. */}
          {lessonsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <div
              className="overflow-x-auto rounded-xl border border-border bg-card p-[18px] motion-safe:animate-[rise_0.4s_ease-out_both]"
              style={{ animationDelay: '80ms' }}
            >
              <div className="grid min-w-[840px] grid-cols-7 gap-3">
                {weekDays.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayLessons = lessonsByDay.get(key) || [];
                  const isToday = isSameDay(day, today);
                  return (
                    <div key={key} className="flex flex-col gap-2">
                      <div
                        className={cn(
                          'border-b pb-1.5 text-[14px] font-bold uppercase tracking-wide',
                          isToday
                            ? 'border-primary/[32%] text-primary'
                            : 'border-hair text-muted-foreground',
                        )}
                      >
                        {format(day, 'EEE')}{' '}
                        <span
                          className={cn(
                            'num font-mono',
                            isToday ? 'text-primary' : 'text-foreground',
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                      </div>
                      {dayLessons.length === 0 ? (
                        <div className="flex min-h-[80px] items-center justify-center rounded-[11px] border border-dashed border-hair text-xs text-muted-foreground/[50%]">
                          —
                        </div>
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
                        <Trash className="h-4 w-4 text-destructive" />
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
          <Form {...templateForm}>
            <form
              onSubmit={templateForm.handleSubmit(handleCreateTemplate)}
              className="space-y-4"
            >
              <FormField
                control={templateForm.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('schedule.group_label')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('schedule.group_placeholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(groups || []).map((g) => (
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
                control={templateForm.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('schedule.day_label')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(DAY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={templateForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedule.start_time')}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={templateForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedule.end_time')}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={templateForm.control}
                name="lessonType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('schedule.template_type')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="theory">
                          {t('schedule.type_theory')}
                        </SelectItem>
                        <SelectItem value="practice">
                          {t('schedule.type_practice')}
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
          </Form>
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
          <Form {...generateForm}>
            <form
              onSubmit={generateForm.handleSubmit(handleGenerate)}
              className="space-y-4"
            >
              <FormField
                control={generateForm.control}
                name="weeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('schedule.weeks_label')}</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={12} {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('schedule.weeks_hint')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={generateForm.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('schedule.group_optional')}</FormLabel>
                    <Select
                      value={field.value || 'all'}
                      onValueChange={(v) =>
                        field.onChange(v === 'all' ? '' : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('schedule.all_groups')} />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
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
          </Form>
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
