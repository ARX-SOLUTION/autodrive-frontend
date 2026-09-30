import { useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LeadCard } from './LeadCard';
import { LeadLostDialog } from './LeadLostDialog';
import { useStageTransitionMutation } from '../queries/leadsQueries';
import type {
  LeadBoardColumn,
  LeadStage,
  LeadLostReason,
} from '../types/leads.types';

export interface LeadBoardProps {
  columns: LeadBoardColumn[];
  onAddLeadClick?: (stageId?: string) => void;
  className?: string;
}

interface PendingDropState {
  leadId: string;
  targetStageId: string;
  version: number;
}

export const LeadBoard = ({
  columns,
  onAddLeadClick,
  className,
}: LeadBoardProps) => {
  const { t } = useTranslation();
  const transitionMutation = useStageTransitionMutation();
  const boardRef = useRef<HTMLDivElement>(null);

  const [activeDropStageId, setActiveDropStageId] = useState<string | null>(
    null,
  );
  const [pendingDrop, setPendingDrop] = useState<PendingDropState | null>(null);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (stageId: string) => {
    setActiveDropStageId(stageId);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>, stageId: string) => {
    // Only reset if leaving the column element itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (activeDropStageId === stageId) {
      setActiveDropStageId(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetStage: LeadStage) => {
    e.preventDefault();
    setActiveDropStageId(null);

    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;

    try {
      const { id, currentStageId, version } = JSON.parse(rawData) as {
        id: string;
        currentStageId: string;
        version: number;
      };

      if (currentStageId === targetStage.id) {
        return; // Dropped on the same stage
      }

      // If moving to LOST stage, prompt for reason
      if (targetStage.kind === 'LOST') {
        setPendingDrop({
          leadId: id,
          targetStageId: targetStage.id,
          version,
        });
        setLostDialogOpen(true);
        return;
      }

      // Normal stage transition
      transitionMutation.mutate(
        {
          id,
          payload: {
            stageId: targetStage.id,
            version,
          },
        },
        {
          onError: (err) => {
            toast.error(
              (err as Error).message ||
                t(
                  'leads.transition_error',
                  'Bosqichni o‘zgartirishda xatolik yuz berdi',
                ),
            );
          },
        },
      );
    } catch {
      // Invalid drag data
    }
  };

  const handleConfirmLost = (reason: LeadLostReason, otherText?: string) => {
    if (!pendingDrop) return;

    transitionMutation.mutate(
      {
        id: pendingDrop.leadId,
        payload: {
          stageId: pendingDrop.targetStageId,
          version: pendingDrop.version,
          lostReason: reason,
          lostReasonOther: otherText,
        },
      },
      {
        onSuccess: () => {
          setLostDialogOpen(false);
          setPendingDrop(null);
          toast.success(t('leads.stage_updated', 'Lid holati yangilandi'));
        },
        onError: (err) => {
          toast.error(
            (err as Error).message ||
              t(
                'leads.transition_error',
                'Bosqichni o‘zgartirishda xatolik yuz berdi',
              ),
          );
        },
      },
    );
  };

  return (
    <>
      <div className={cn('flex h-full min-h-0 flex-col gap-3', className)}>
        <nav
          aria-label={t('leads.stage', 'Bosqich')}
          className="flex shrink-0 flex-wrap gap-2"
        >
          {columns.map(
            (column) =>
              column?.stage && (
                <Button
                  key={column.stage.id}
                  variant="outline"
                  size="sm"
                  className="max-w-full"
                  aria-controls={`lead-stage-${column.stage.id}`}
                  aria-label={`${column.stage.name} ${column.count}`}
                  onClick={() => {
                    const board = boardRef.current;
                    const target = board?.querySelector<HTMLDivElement>(
                      `[id="lead-stage-${column.stage.id}"]`,
                    );
                    if (!board || !target) return;
                    board.scrollTo({
                      left: target.offsetLeft,
                      behavior: window.matchMedia(
                        '(prefers-reduced-motion: reduce)',
                      ).matches
                        ? 'auto'
                        : 'smooth',
                    });
                    target.focus({ preventScroll: true });
                  }}
                >
                  <span className="truncate">{column.stage.name}</span>
                  <span className="shrink-0 rounded-full bg-secondary px-1.5 text-xs">
                    {column.count}
                  </span>
                </Button>
              ),
          )}
        </nav>
        <div
          ref={boardRef}
          className="relative flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4 pt-1 items-start"
          data-testid="leads-kanban-board"
        >
          {columns.map((column) => {
            if (!column?.stage) return null;
            const isDropActive = activeDropStageId === column.stage.id;

            return (
              <div
                key={column.stage.id}
                id={`lead-stage-${column.stage.id}`}
                role="region"
                tabIndex={-1}
                aria-label={`${column.stage.name}, ${column.count} ta lid`}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(column.stage.id)}
                onDragLeave={(e) => handleDragLeave(e, column.stage.id)}
                onDrop={(e) => handleDrop(e, column.stage)}
                className={cn(
                  'flex w-80 max-w-full shrink-0 flex-col rounded-2xl border border-border bg-card/60 p-3 transition-colors max-h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isDropActive &&
                    'border-primary ring-2 ring-primary/20 bg-primary/5',
                )}
                data-testid={`kanban-column-${column.stage.id}`}
              >
                {/* Column Header */}
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="flex items-center gap-2 font-semibold text-sm text-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: column.stage.color }}
                      aria-hidden="true"
                    />
                    <span>{column.stage.name}</span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-bold text-xs text-secondary-foreground">
                      {column.count}
                    </span>
                    {column.stage.kind === 'NEW' && onAddLeadClick && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onAddLeadClick(column.stage.id)}
                        aria-label={t(
                          'leads.create_lead',
                          'Yangi lid qo‘shish',
                        )}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Cards List */}
                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5 min-h-[140px]">
                  {column.leads.length === 0 ? (
                    <div
                      className={cn(
                        'flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground select-none',
                        isDropActive && 'border-primary text-primary',
                      )}
                    >
                      {isDropActive
                        ? t('leads.drop_here', 'Bu yerga tashlang')
                        : t('leads.empty_column', 'Lidlar yo‘q')}
                    </div>
                  ) : (
                    column.leads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <LeadLostDialog
        open={lostDialogOpen}
        onOpenChange={(open) => {
          setLostDialogOpen(open);
          if (!open) setPendingDrop(null);
        }}
        onConfirm={handleConfirmLost}
        isLoading={transitionMutation.isPending}
      />
    </>
  );
};
