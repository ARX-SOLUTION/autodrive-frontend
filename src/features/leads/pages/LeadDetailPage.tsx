import { useCan } from '@/hooks/useCan';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  ArrowLeft,
  PencilSimple,
  Trash,
  Student,
  CircleNotch,
} from '@phosphor-icons/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useLeadDetailQuery,
  useLeadActivitiesQuery,
  useLeadStagesQuery,
  useStageTransitionMutation,
  useDeleteLeadMutation,
} from '../queries/leadsQueries';
import { LeadInfoCard } from '../components/LeadInfoCard';
import { LeadActivityTimeline } from '../components/LeadActivityTimeline';
import { ConvertLeadDialog } from '../components/ConvertLeadDialog';
import { EditLeadDialog } from '../components/EditLeadDialog';
import { LeadLostDialog } from '../components/LeadLostDialog';
import type { LeadLostReason } from '../types/leads.types';

export const LeadDetailPage = () => {
  const { t } = useTranslation();
  const mayUpdate = useCan('leads.update');
  const mayDelete = useCan('leads.delete');
  const mayConvert = useCan('students.create');
  const navigate = useNavigate();
  const { id } = useParams({ strict: false }) as { id?: string };

  const { data: lead, isLoading: leadLoading } = useLeadDetailQuery(id);
  const { data: activities = [] } = useLeadActivitiesQuery(id);
  const { data: stages = [] } = useLeadStagesQuery();

  const transitionMutation = useStageTransitionMutation();
  const deleteMutation = useDeleteLeadMutation();

  // Modals state
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);
  const [targetLostStageId, setTargetLostStageId] = useState<string | null>(
    null,
  );

  if (leadLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <CircleNotch className="mr-2 h-5 w-5 animate-spin" />
        <span>{t('common.loading', 'Yuklanmoqda...')}</span>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">
          {t('leads.not_found', 'Lid topilmadi')}
        </p>
        <Button
          variant="outline"
          aria-label={t('common.back', 'Orqaga')}
          onClick={() => void navigate({ to: '/leads' })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>{t('common.back', 'Orqaga')}</span>
        </Button>
      </div>
    );
  }

  const handleStageSelect = (stageId: string) => {
    if (stageId === lead.stageId) return;

    const targetStage = stages.find((s) => s.id === stageId);
    if (targetStage?.kind === 'LOST') {
      setTargetLostStageId(stageId);
      setIsLostDialogOpen(true);
      return;
    }

    transitionMutation.mutate(
      {
        id: lead.id,
        payload: {
          stageId,
          version: lead.version,
        },
      },
      {
        onSuccess: () => {
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

  const handleConfirmLost = (reason: LeadLostReason, otherText?: string) => {
    if (!targetLostStageId) return;

    transitionMutation.mutate(
      {
        id: lead.id,
        payload: {
          stageId: targetLostStageId,
          version: lead.version,
          lostReason: reason,
          lostReasonOther: otherText,
        },
      },
      {
        onSuccess: () => {
          setIsLostDialogOpen(false);
          setTargetLostStageId(null);
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

  const handleDelete = () => {
    deleteMutation.mutate(lead.id, {
      onSuccess: () => {
        toast.success(
          t('leads.deleted_success', 'Lid muvaffaqiyatli o‘chirildi'),
        );
        void navigate({ to: '/leads' });
      },
      onError: (err) => {
        toast.error(
          (err as Error).message ||
            t('leads.delete_error', 'Lidni o‘chirishda xatolik yuz berdi'),
        );
      },
    });
  };

  const isConverted = !!lead.studentId;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={`${lead.firstName} ${lead.lastName || ''}`.trim()}
        description={[
          lead.category
            ? `${t('vehicles.category', 'Toifa')}: ${lead.category}`
            : null,
          lead.branchName,
          new Date(lead.createdAt).toLocaleDateString(),
        ]
          .filter(Boolean)
          .join(' • ')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label={t('common.back', 'Orqaga')}
              onClick={() => void navigate({ to: '/leads' })}
              className="h-8 gap-1 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t('common.back', 'Orqaga')}</span>
            </Button>

            {/* Stage Selector */}
            <div className="w-40">
              <Select
                value={lead.stageId}
                onValueChange={handleStageSelect}
                disabled={!mayUpdate || transitionMutation.isPending}
              >
                <SelectTrigger
                  aria-label={t('leads.stage', 'Bosqich')}
                  className="h-8 text-xs font-medium"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: st.color }}
                        />
                        <span>{st.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Convert to Student Button */}
            {mayConvert && mayUpdate && !isConverted && (
              <Button
                size="sm"
                aria-label={t(
                  'leads.convert_to_student',
                  'O‘quvchiga aylantirish',
                )}
                onClick={() => setIsConvertOpen(true)}
                className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Student className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {t('leads.convert_to_student', 'O‘quvchiga aylantirish')}
                </span>
              </Button>
            )}

            {/* Edit Lead Button */}
            {mayUpdate && (
              <Button
                variant="outline"
                size="icon"
                aria-label={t('leads.edit_lead', 'Lidni tahrirlash')}
                onClick={() => setIsEditOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <PencilSimple className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Delete Lead Button */}
            {mayDelete && (
              <Button
                variant="outline"
                size="icon"
                aria-label={t('leads.delete_lead', 'Lidni o‘chirish')}
                onClick={() => setIsDeleteOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        }
      />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Lead Info Card */}
        <div className="lg:col-span-1">
          <LeadInfoCard lead={lead} />
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="lg:col-span-2">
          <LeadActivityTimeline leadId={lead.id} activities={activities} />
        </div>
      </div>

      {/* Convert Lead Dialog */}
      <ConvertLeadDialog
        lead={lead}
        open={isConvertOpen}
        onOpenChange={setIsConvertOpen}
      />

      {/* Edit Lead Dialog */}
      <EditLeadDialog
        lead={lead}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      {/* Lead Lost Dialog */}
      <LeadLostDialog
        open={isLostDialogOpen}
        onOpenChange={(open) => {
          setIsLostDialogOpen(open);
          if (!open) setTargetLostStageId(null);
        }}
        onConfirm={handleConfirmLost}
        isLoading={transitionMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        title={t('leads.delete_confirm_title', 'Lidni o‘chirish')}
        description={t(
          'leads.delete_confirm_desc',
          'Haqiqatan ham bu lidni o‘chirmoqchimisiz? Bu amalni ortga qaytarib bo‘lmaydi.',
        )}
      />
    </div>
  );
};

export default LeadDetailPage;
