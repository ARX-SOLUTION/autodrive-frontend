import { memo, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import {
  Phone,
  Clock,
  WarningCircle,
  User,
  CheckCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { LeadCard as LeadCardType } from '../types/leads.types';

export interface LeadCardProps {
  lead: LeadCardType;
  className?: string;
}

export const LeadCard = memo(({ lead, className }: LeadCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        id: lead.id,
        currentStageId: lead.stageId,
        version: lead.version,
      }),
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = () => {
    void navigate({ to: '/leads/$id', params: { id: lead.id } });
  };

  // Determine task urgency
  let taskStatus: 'none' | 'overdue' | 'today' | 'future' = 'none';
  if (lead.nextStepAt) {
    const nextDate = new Date(lead.nextStepAt);
    const now = new Date();
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
    );

    if (nextDate < now) {
      taskStatus = 'overdue';
    } else if (nextDate >= todayStart && nextDate <= todayEnd) {
      taskStatus = 'today';
    } else {
      taskStatus = 'future';
    }
  }

  const displayName =
    `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '-';
  const leadAriaLabel = [
    displayName,
    lead.phone,
    lead.branchName,
    lead.category ? `${lead.category} toifasi` : null,
    taskStatus === 'overdue' ? t('leads.overdue', 'Kechikkan') : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={leadAriaLabel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 shadow-xs transition-all duration-150',
        'cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        className,
      )}
      data-testid={`lead-card-${lead.id}`}
    >
      {/* Name and Category */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm leading-tight text-foreground group-hover:text-primary transition-colors">
          {displayName}
        </h4>
        {lead.category && (
          <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 font-bold text-[10px] text-secondary-foreground uppercase">
            {lead.category}
          </span>
        )}
      </div>

      {/* Phone number */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Phone className="h-3.5 w-3.5 shrink-0" />
        <span className="font-mono">{lead.phone}</span>
      </div>

      {/* Badges: Branch & Source */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {lead.branchName && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground font-medium truncate max-w-[140px]">
            {lead.branchName}
          </span>
        )}
        <span
          className={cn(
            'rounded-md px-2 py-0.5 text-[11px] capitalize',
            lead.source === 'referral'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/30'
              : 'bg-muted/80 text-muted-foreground',
          )}
        >
          {t(`leads.sources.${lead.source}`, lead.source)}
        </span>
      </div>

      {/* Footer: Next step & Assignee */}
      <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-2 text-xs">
        {taskStatus === 'overdue' && (
          <span className="inline-flex items-center gap-1 font-medium text-destructive">
            <WarningCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{t('leads.overdue', 'Kechikkan')}</span>
          </span>
        )}
        {taskStatus === 'today' && (
          <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{t('leads.due_today', 'Bugun')}</span>
          </span>
        )}
        {taskStatus === 'future' && lead.nextStepAt && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {new Date(lead.nextStepAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </span>
        )}
        {taskStatus === 'none' && (
          <span className="text-[11px] text-muted-foreground">
            {t('leads.no_tasks', 'Vazifasiz')}
          </span>
        )}

        {lead.assigneeName ? (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium truncate max-w-[100px]">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.assigneeName}</span>
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">
            {t('leads.unassigned', 'Biriktirilmagan')}
          </span>
        )}
      </div>
    </div>
  );
});

LeadCard.displayName = 'LeadCard';
