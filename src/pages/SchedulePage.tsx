import { useState, useMemo } from 'react';
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
  Trash2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/ui/EmptyState';

const formatTime = (iso: string) => {
  try {
    return format(new Date(iso), 'HH:mm');
  } catch {
    return iso;
  }
};

const lessonTypeColor: Record<LessonType, string> = {
  theory: 'border-l-blue-500 bg-blue-50',
  practice: 'border-l-green-500 bg-green-50',
};

const SchedulePage = () => {
  const { t } = useTranslation();
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

  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'owner' || role === 'manager' || role === 'operator';

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  // Create template form
  const [formGroupId, setFormGroupId] = useState('');
  const [formDayOfWeek, setFormDayOfWeek] = useState('1');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('11:00');
  const [formLessonType, setFormLessonType] = useState<LessonType>('theory');

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
    setCreateOpen(true);
  };

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
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTemplate.mutateAsync(deleteId);
      toast.success(t('schedule.template_deleted'));
      setDeleteId(null);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const weeks = parseInt(genWeeks);
    if (weeks < 1 || weeks > 12) {
      toast.error(t('schedule.weeks_error'));
      return;
    }
    try {
      const result = await generateLessons.mutateAsync({
        weeks,
        ...(genGroupId ? { groupId: genGroupId } : {}),
      });
      toast.success(t('schedule.lessons_generated'));
      setGenerateOpen(false);
    } catch {
      toast.error(t('schedule.generate_error'));
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
          <p className="text-sm text-gray-500 mt-1">
            {format(weekStart, 'dd.MM.yyyy')} — {format(weekEnd, 'dd.MM.yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => setGenerateOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" />{' '}
                {t('schedule.generate_lessons')}
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> {t('schedule.template')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Calendar navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={thisWeek}>
            <CalendarDays className="mr-2 h-4 w-4" /> {t('schedule.today')}
          </Button>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-blue-500" />{' '}
            {t('schedule.legend_theory')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-green-500" />{' '}
            {t('schedule.legend_practice')}
          </span>
        </div>
      </div>

      {/* Week calendar grid */}
      {lessonsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayLessons = lessonsByDay.get(key) || [];
            const isToday = isSameDay(day, today);
            return (
              <div
                key={key}
                className={`min-h-[200px] rounded-lg border bg-white p-2 ${
                  isToday ? 'ring-2 ring-blue-200' : ''
                }`}
              >
                <div
                  className={`mb-2 text-center text-sm font-medium ${
                    isToday ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  <div>{format(day, 'EEE')}</div>
                  <div className="text-lg font-bold">{format(day, 'd')}</div>
                </div>
                <div className="space-y-1">
                  {dayLessons.length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-4">—</p>
                  ) : (
                    dayLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className={`rounded border-l-4 p-1.5 text-xs ${lessonTypeColor[lesson.lesson_type]}`}
                      >
                        <p className="font-medium truncate">{lesson.title}</p>
                        <p className="text-gray-500">
                          {formatTime(lesson.date)}
                        </p>
                        {lesson.teacher_name && (
                          <p className="text-gray-400 truncate">
                            {lesson.teacher_name}
                          </p>
                        )}
                        <p className="text-gray-400">
                          {lesson.present_count}/{lesson.total_count}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* Templates section */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">{t('schedule.templates')}</h2>
          <span className="text-sm text-gray-500">
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
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-sm">
                    {DAY_LABELS[t.day_of_week]}
                  </span>
                  <span className="text-sm text-gray-700">
                    {t.start_time}—{t.end_time}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100">
                    {lessonTypeLabel[t.lesson_type]}
                  </span>
                  <span className="text-sm text-gray-500">{t.group_name}</span>
                  {t.teacher_name && (
                    <span className="text-xs text-gray-400">
                      {t.teacher_name}
                    </span>
                  )}
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(t.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div>
              <Label>Guruh</Label>
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
              <Label>Hafta kuni</Label>
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
                <Label>Boshlanish vaqti</Label>
                <Input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label>Tugash vaqti</Label>
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
                onClick={() => setCreateOpen(false)}
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
              <p className="text-xs text-gray-400 mt-1">
                {t('schedule.weeks_hint')}
              </p>
            </div>
            <div>
              <Label>{t('schedule.group_optional')}</Label>
              <Select value={genGroupId} onValueChange={setGenGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('schedule.all_groups')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('schedule.all_groups')}</SelectItem>
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
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
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('schedule.delete_title')}
        description={t('schedule.delete_desc')}
      />
    </div>
  );
};

export default SchedulePage;
