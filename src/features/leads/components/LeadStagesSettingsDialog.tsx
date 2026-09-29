import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Gear,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash,
  CircleNotch,
  Info,
  Check,
} from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useLeadStagesQuery,
  useUpdateLeadStagesMutation,
} from '../queries/leadsQueries';

export interface LeadStagesSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditableStage {
  tempKey: string;
  id?: string;
  name: string;
  color: string;
  isActive: boolean;
  position: number;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#F97316', // Orange
];

const MAX_ACTIVE_WORK_STAGES = 8;

export const LeadStagesSettingsDialog = ({
  open,
  onOpenChange,
}: LeadStagesSettingsDialogProps) => {
  const { t } = useTranslation();
  const { data: stages = [], isLoading } = useLeadStagesQuery({
    enabled: open,
  });
  const updateStagesMutation = useUpdateLeadStagesMutation();

  const [workStages, setWorkStages] = useState<EditableStage[]>([]);
  const [moveToStageId, setMoveToStageId] = useState<string>('');
  const [prevOpen, setPrevOpen] = useState(false);
  const [syncedStagesLength, setSyncedStagesLength] = useState(0);

  // Synchronize state when dialog opens or when stages finish loading
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const initialWorkStages: EditableStage[] = stages
        .filter((s) => s.kind === 'WORK')
        .map((s, idx) => ({
          tempKey: s.id,
          id: s.id,
          name: s.name,
          color: s.color || PRESET_COLORS[idx % PRESET_COLORS.length],
          isActive: s.isActive ?? true,
          position: idx,
        }));
      setWorkStages(initialWorkStages);
      setSyncedStagesLength(stages.length);
      setMoveToStageId('');
    }
  } else if (open && stages.length > 0 && syncedStagesLength === 0) {
    const initialWorkStages: EditableStage[] = stages
      .filter((s) => s.kind === 'WORK')
      .map((s, idx) => ({
        tempKey: s.id,
        id: s.id,
        name: s.name,
        color: s.color || PRESET_COLORS[idx % PRESET_COLORS.length],
        isActive: s.isActive ?? true,
        position: idx,
      }));
    setWorkStages(initialWorkStages);
    setSyncedStagesLength(stages.length);
  }

  // Separate system stages
  const newStage = useMemo(
    () => stages.find((s) => s.kind === 'NEW'),
    [stages],
  );
  const wonStage = useMemo(
    () => stages.find((s) => s.kind === 'WON'),
    [stages],
  );
  const lostStage = useMemo(
    () => stages.find((s) => s.kind === 'LOST'),
    [stages],
  );

  // Track if any previously active existing stage is now deactivated
  const originalActiveIds = useMemo(
    () =>
      new Set(
        stages
          .filter((s) => s.kind === 'WORK' && (s.isActive ?? true))
          .map((s) => s.id),
      ),
    [stages],
  );

  const hasDeactivatedExisting = useMemo(
    () =>
      workStages.some(
        (ws) => ws.id && originalActiveIds.has(ws.id) && !ws.isActive,
      ),
    [workStages, originalActiveIds],
  );

  const activeWorkStagesWithId = useMemo(
    () => workStages.filter((ws) => ws.id && ws.isActive),
    [workStages],
  );

  const resolvedMoveToStageId =
    moveToStageId || activeWorkStagesWithId[0]?.id || '';

  const activeWorkCount = workStages.filter((s) => s.isActive).length;

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setWorkStages((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next.map((item, idx) => ({ ...item, position: idx }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= workStages.length - 1) return;
    setWorkStages((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next.map((item, idx) => ({ ...item, position: idx }));
    });
  };

  const handleUpdateName = (index: number, name: string) => {
    setWorkStages((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, name } : item)),
    );
  };

  const handleUpdateColor = (index: number, color: string) => {
    setWorkStages((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, color } : item)),
    );
  };

  const handleToggleActive = (index: number, nextActive: boolean) => {
    if (!nextActive && activeWorkCount <= 1) {
      toast.error(
        t(
          'leads.min_one_active_stage',
          'At least one active work stage is required',
        ),
      );
      return;
    }
    setWorkStages((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, isActive: nextActive } : item,
      ),
    );
  };

  const handleAddStage = () => {
    if (activeWorkCount >= MAX_ACTIVE_WORK_STAGES) {
      toast.error(
        t(
          'leads.max_stages_warning',
          'Maximum of 8 active work stages allowed',
        ),
      );
      return;
    }
    const nextColor = PRESET_COLORS[workStages.length % PRESET_COLORS.length];
    const newStageItem: EditableStage = {
      tempKey: `new-${Date.now()}-${Math.random()}`,
      name: '',
      color: nextColor,
      isActive: true,
      position: workStages.length,
    };
    setWorkStages((prev) => [...prev, newStageItem]);
  };

  const handleRemoveNewStage = (index: number) => {
    setWorkStages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((item, idx) => ({ ...item, position: idx }));
    });
  };

  const handleSave = async () => {
    // Validation: ensure active stages have valid names
    for (const stage of workStages) {
      if (stage.isActive && !stage.name.trim()) {
        toast.error(
          t('leads.stage_name_required', 'All active stages must have a name'),
        );
        return;
      }
    }

    if (activeWorkCount === 0) {
      toast.error(
        t(
          'leads.min_one_active_stage',
          'At least one active work stage is required',
        ),
      );
      return;
    }

    if (hasDeactivatedExisting && !resolvedMoveToStageId) {
      toast.error(
        t(
          'leads.delete_stage_move_leads',
          'Select a stage to move open leads into',
        ),
      );
      return;
    }

    const payload = {
      stages: workStages.map((s, idx) => ({
        id: s.id,
        name: s.name.trim(),
        color: s.color,
        position: idx,
        isActive: s.isActive,
      })),
      moveToStageId: hasDeactivatedExisting ? resolvedMoveToStageId : undefined,
    };

    try {
      await updateStagesMutation.mutateAsync(payload);
      toast.success(
        t('leads.stages_saved_success', 'Stage settings saved successfully'),
      );
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update stages';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Gear className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                {t('leads.manage_stages', 'Configure Stages')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t(
                  'leads.stages_settings_description',
                  'Configure intermediate funnel work stages, adjust order, colors, or add new stages.',
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground gap-2">
              <CircleNotch className="h-5 w-5 animate-spin" />
              <span className="text-sm">
                {t('common.loading', 'Loading...')}
              </span>
            </div>
          ) : (
            <>
              {/* System start stage */}
              {newStage ? (
                <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: newStage.color }}
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {newStage.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('leads.system_stage', 'System stage')} (NEW)
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {t('common.locked', 'Fixed')}
                  </span>
                </div>
              ) : null}

              {/* Work stages list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span>{t('leads.work_stages', 'Work stages')}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({activeWorkCount} / {MAX_ACTIVE_WORK_STAGES})
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs min-h-[36px]"
                    onClick={handleAddStage}
                    disabled={activeWorkCount >= MAX_ACTIVE_WORK_STAGES}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t('leads.add_stage', 'Add Stage')}</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {workStages.map((stage, index) => (
                    <div
                      key={stage.tempKey}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3 transition-colors ${
                        stage.isActive
                          ? 'border-border bg-card'
                          : 'border-border/60 bg-muted/20 opacity-70'
                      }`}
                      data-testid={`stage-item-${index}`}
                    >
                      {/* Drag / Ordering buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 min-h-[36px] min-w-[36px] text-muted-foreground hover:text-foreground"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                          aria-label={t('leads.move_up', 'Move up')}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 min-h-[36px] min-w-[36px] text-muted-foreground hover:text-foreground"
                          disabled={index === workStages.length - 1}
                          onClick={() => handleMoveDown(index)}
                          aria-label={t('leads.move_down', 'Move down')}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Stage Name input */}
                      <div className="flex-1 min-w-[140px]">
                        <Input
                          value={stage.name}
                          onChange={(e) =>
                            handleUpdateName(index, e.target.value)
                          }
                          placeholder={t('leads.stage_name', 'Stage Name')}
                          className="h-9 text-sm"
                          aria-label={`${t('leads.stage_name', 'Stage Name')} ${index + 1}`}
                        />
                      </div>

                      {/* Color Palette swatches */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {PRESET_COLORS.map((hex) => {
                          const isSelected =
                            stage.color.toUpperCase() === hex.toUpperCase();
                          return (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => handleUpdateColor(index, hex)}
                              aria-label={`Color ${hex}`}
                              className="h-5 w-5 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              style={{ backgroundColor: hex }}
                            >
                              {isSelected ? (
                                <Check
                                  className="h-3 w-3 text-white"
                                  weight="bold"
                                />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {/* Active toggle and Delete action */}
                      <div className="flex items-center gap-3 sm:ml-auto flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={stage.isActive}
                            onCheckedChange={(checked) =>
                              handleToggleActive(index, checked)
                            }
                            aria-label={`${t('leads.active_status', 'Active')} ${stage.name || index + 1}`}
                          />
                          <span className="text-xs text-muted-foreground select-none">
                            {stage.isActive
                              ? t('leads.active_status', 'Active')
                              : t('leads.inactive_status', 'Inactive')}
                          </span>
                        </div>

                        {!stage.id ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 min-h-[36px] min-w-[36px] text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveNewStage(index)}
                            aria-label={t('common.delete', 'Delete')}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lead reassignment fallback when deactivating existing stage */}
              {hasDeactivatedExisting ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm">
                    <Info className="h-4 w-4" />
                    <span>
                      {t(
                        'leads.target_stage_for_leads',
                        'Target stage to move leads',
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'leads.target_stage_description',
                      'Existing leads from deactivated stages will be moved to this selected stage.',
                    )}
                  </p>
                  <Select
                    value={moveToStageId}
                    onValueChange={setMoveToStageId}
                  >
                    <SelectTrigger className="h-9 w-full bg-background">
                      <SelectValue
                        placeholder={t(
                          'leads.delete_stage_move_leads',
                          'Select stage',
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWorkStagesWithId.map((st) => (
                        <SelectItem key={st.id} value={st.id!}>
                          {st.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {/* System terminal stages (WON and LOST) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {wonStage ? (
                  <div className="rounded-lg border border-dashed border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: wonStage.color }}
                      />
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {wonStage.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('leads.system_stage', 'System stage')} (WON)
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                      {t('common.locked', 'Fixed')}
                    </span>
                  </div>
                ) : null}

                {lostStage ? (
                  <div className="rounded-lg border border-dashed border-rose-500/40 bg-rose-50/30 dark:bg-rose-950/10 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: lostStage.color }}
                      />
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {lostStage.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('leads.system_stage', 'System stage')} (LOST)
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                      {t('common.locked', 'Fixed')}
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border flex flex-row items-center justify-end gap-2 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateStagesMutation.isPending}
            className="min-h-[44px]"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateStagesMutation.isPending || isLoading}
            className="min-h-[44px] gap-2"
          >
            {updateStagesMutation.isPending ? (
              <CircleNotch className="h-4 w-4 animate-spin" />
            ) : null}
            <span>{t('common.save', 'Save')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
