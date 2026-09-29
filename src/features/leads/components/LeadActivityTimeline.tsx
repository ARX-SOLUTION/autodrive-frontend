import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  NotePencil,
  PhoneCall,
  CheckSquare,
  ArrowsLeftRight,
  Gear,
  Clock,
  WarningCircle,
  Trash,
  CircleNotch,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/shared/lib/studentsFormat';
import {
  useCreateActivityMutation,
  useUpdateActivityMutation,
  useDeleteActivityMutation,
} from '../queries/leadsQueries';
import type { LeadActivity, LeadActivityKind } from '../types/leads.types';

export interface LeadActivityTimelineProps {
  leadId: string;
  activities: LeadActivity[];
  className?: string;
}

const QUICK_KINDS: Array<{ kind: LeadActivityKind; icon: typeof NotePencil }> =
  [
    { kind: 'NOTE', icon: NotePencil },
    { kind: 'CALL', icon: PhoneCall },
    { kind: 'TASK', icon: CheckSquare },
  ];

export const LeadActivityTimeline = ({
  leadId,
  activities,
  className,
}: LeadActivityTimelineProps) => {
  const { t } = useTranslation();
  const createMutation = useCreateActivityMutation(leadId);
  const updateMutation = useUpdateActivityMutation(leadId);
  const deleteMutation = useDeleteActivityMutation(leadId);

  // Quick Add state
  const [selectedKind, setSelectedKind] = useState<LeadActivityKind>('NOTE');
  const [body, setBody] = useState('');
  const [dueAt, setDueAt] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim()) {
      toast.error(
        t('leads.enter_activity_text', 'Iltimos, matn yoki izohni kiriting'),
      );
      return;
    }

    createMutation.mutate(
      {
        kind: selectedKind,
        body: body.trim(),
        dueAt:
          selectedKind === 'TASK' && dueAt
            ? new Date(dueAt).toISOString()
            : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('leads.activity_added', 'Yangi faoliyat qo‘shildi'));
          setBody('');
          setDueAt('');
        },
        onError: (err) => {
          toast.error(
            (err as Error).message ||
              t(
                'leads.activity_error',
                'Faoliyat qo‘shishda xatolik yuz berdi',
              ),
          );
        },
      },
    );
  };

  const handleToggleTask = (act: LeadActivity) => {
    const isDone = !!act.doneAt;
    updateMutation.mutate(
      {
        activityId: act.id,
        payload: {
          doneAt: isDone ? null : new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast.success(
            isDone
              ? t('leads.task_reopened', 'Vazifa qayta ochildi')
              : t('leads.task_completed', 'Vazifa bajarildi'),
          );
        },
      },
    );
  };

  const handleDeleteActivity = (activityId: string) => {
    deleteMutation.mutate(activityId, {
      onSuccess: () => {
        toast.success(t('leads.activity_deleted', 'Faoliyat o‘chirildi'));
      },
    });
  };

  // Sort newest first
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Quick Add Card */}
      <div className="rounded-2xl border bg-card p-4 shadow-xs">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="flex items-center gap-1.5">
            {QUICK_KINDS.map(({ kind, icon: Icon }) => (
              <Button
                key={kind}
                type="button"
                variant={selectedKind === kind ? 'default' : 'outline'}
                size="sm"
                aria-label={t(`leads.activity_kinds.${kind}`, kind)}
                className="h-8 gap-1.5 text-xs"
                onClick={() => setSelectedKind(kind)}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t(`leads.activity_kinds.${kind}`, kind)}</span>
              </Button>
            ))}
          </div>

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              selectedKind === 'TASK'
                ? t(
                    'leads.task_placeholder',
                    'Vazifa mazmuni (masalan: ertaga soat 10 da qayta qo‘ng‘iroq qilish)...',
                  )
                : selectedKind === 'CALL'
                  ? t(
                      'leads.call_placeholder',
                      'Qo‘ng‘iroq tafsilotlari va suhbat natijasi...',
                    )
                  : t(
                      'leads.note_placeholder',
                      'Mijoz haqida qayd yoki izoh yozing...',
                    )
            }
            rows={2}
            className="text-sm resize-none"
          />

          {selectedKind === 'TASK' && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="activity-due-at"
                className="text-xs font-medium text-muted-foreground whitespace-nowrap"
              >
                {t('leads.activity_due_at', 'Bajarish muddati')}:
              </label>
              <Input
                id="activity-due-at"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="h-8 w-auto text-xs"
              />
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !body.trim()}
              className="h-8 gap-1.5 text-xs"
            >
              {createMutation.isPending && (
                <CircleNotch className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>{t('leads.add_activity', 'Qo‘shish')}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Activities Timeline */}
      <div className="rounded-2xl border bg-card p-5 shadow-xs">
        <h3 className="mb-4 font-semibold text-sm text-foreground">
          {t('leads.timeline', 'Harakatlar tarixi va vazifalar')}
        </h3>

        {sortedActivities.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {t('leads.no_activities', 'Hozircha harakatlar mavjud emas')}
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {sortedActivities.map((act) => {
              const isTask = act.kind === 'TASK';
              const isDone = !!act.doneAt;
              const isOverdue =
                isTask &&
                !isDone &&
                act.dueAt &&
                new Date(act.dueAt) < new Date();

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div
                    className={cn(
                      'absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border bg-background shadow-2xs',
                      act.kind === 'NOTE' && 'border-blue-400 text-blue-600',
                      act.kind === 'CALL' &&
                        'border-emerald-400 text-emerald-600',
                      act.kind === 'TASK' && 'border-amber-400 text-amber-600',
                      act.kind === 'STAGE_CHANGE' &&
                        'border-purple-400 text-purple-600',
                      act.kind === 'SYSTEM' &&
                        'border-slate-300 text-slate-500',
                    )}
                  >
                    {act.kind === 'NOTE' && <NotePencil className="h-3 w-3" />}
                    {act.kind === 'CALL' && <PhoneCall className="h-3 w-3" />}
                    {act.kind === 'TASK' && <CheckSquare className="h-3 w-3" />}
                    {act.kind === 'STAGE_CHANGE' && (
                      <ArrowsLeftRight className="h-3 w-3" />
                    )}
                    {act.kind === 'SYSTEM' && <Gear className="h-3 w-3" />}
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-3.5 space-y-1.5 transition hover:bg-muted/50">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="text-foreground">
                          {act.authorName || t('leads.system', 'Tizim')}
                        </span>
                        <span className="text-muted-foreground/60">•</span>
                        <span className="capitalize text-muted-foreground">
                          {t(`leads.activity_kinds.${act.kind}`, act.kind)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-[11px] tabular-nums">
                          {formatDateTime(act.createdAt)}
                        </span>
                        {act.kind !== 'SYSTEM' &&
                          act.kind !== 'STAGE_CHANGE' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                              aria-label={t('common.delete', 'O‘chirish')}
                              onClick={() => handleDeleteActivity(act.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          )}
                      </div>
                    </div>

                    {/* Task Actions and Urgency */}
                    {isTask && (
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => handleToggleTask(act)}
                            className="rounded border-input text-primary focus:ring-primary"
                          />
                          <span
                            className={cn(
                              isDone && 'line-through text-muted-foreground',
                            )}
                          >
                            {isDone
                              ? t('leads.task_done', 'Bajarildi')
                              : t('leads.mark_done', 'Bajarildi deb belgilash')}
                          </span>
                        </label>

                        {act.dueAt && (
                          <div className="flex items-center gap-1 text-[11px]">
                            {isOverdue ? (
                              <span className="flex items-center gap-1 font-medium text-destructive">
                                <WarningCircle className="h-3 w-3" />
                                <span>{formatDateTime(act.dueAt)}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatDateTime(act.dueAt)}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Body */}
                    {act.body && (
                      <p
                        className={cn(
                          'text-xs text-foreground leading-relaxed whitespace-pre-wrap',
                          isTask &&
                            isDone &&
                            'line-through text-muted-foreground',
                        )}
                      >
                        {act.body}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
