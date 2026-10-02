import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  Student,
  Warning,
  CircleNotch,
  ArrowRight,
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
import { formatPhone } from '@/lib/phoneFormater';
import { useConvertLeadMutation } from '../queries/leadsQueries';
import type { Lead } from '../types/leads.types';

export interface ConvertLeadDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConvertLeadDialog = ({
  lead,
  open,
  onOpenChange,
}: ConvertLeadDialogProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const convertMutation = useConvertLeadMutation();

  const [force, setForce] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  // A duplicate decision belongs to one open dialog for one lead. Closing or
  // switching leads must not carry a ticked "link to existing" choice over.
  const dialogKey = open ? lead.id : null;
  const [decisionKey, setDecisionKey] = useState(dialogKey);
  if (decisionKey !== dialogKey) {
    setDecisionKey(dialogKey);
    setForce(false);
    setDuplicateWarning(null);
  }

  const handleConvert = () => {
    convertMutation.mutate(
      {
        id: lead.id,
        payload: { force },
      },
      {
        onSuccess: (res) => {
          toast.success(
            t(
              'leads.convert_success',
              'Lid muvaffaqiyatli o‘quvchiga aylantirildi',
            ),
          );
          onOpenChange(false);
          if (res?.studentId) {
            void navigate({
              to: '/students/$id',
              params: { id: res.studentId },
            });
          }
        },
        onError: (err: unknown) => {
          const error = err as {
            response?: {
              status?: number;
              data?: {
                message?: string;
                duplicateStudent?: { firstName: string; lastName: string };
              };
            };
            message?: string;
          };

          if (error.response?.status === 409) {
            const dup = error.response.data?.duplicateStudent;
            if (dup) {
              setDuplicateWarning(
                t('leads.duplicate_student_conflict', {
                  name: `${dup.firstName} ${dup.lastName}`,
                  defaultValue: `Ushbu telefon raqamli o‘quvchi allaqachon mavjud: ${dup.firstName} ${dup.lastName}`,
                }),
              );
            } else {
              setDuplicateWarning(
                error.response.data?.message ||
                  t(
                    'leads.duplicate_student_generic',
                    'Ushbu telefon raqamli o‘quvchi bazada allaqachon mavjud',
                  ),
              );
            }
          } else {
            toast.error(
              error.message ||
                t(
                  'leads.convert_error',
                  'O‘quvchiga aylantirishda xatolik yuz berdi',
                ),
            );
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Student className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">
            {t('leads.convert_to_student', 'O‘quvchiga aylantirish')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t(
              'leads.convert_confirm_desc',
              'Lid o‘quvchilar ro‘yxatiga ko‘chiriladi va bosqichi "Yutilgan" (WON) deb belgilanadi',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Lead Summary */}
          <div className="rounded-xl border bg-muted/40 p-3.5 text-xs space-y-1.5">
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">
                {t('common.name', 'F.I.SH')}:
              </span>
              <span className="text-foreground">
                {lead.firstName} {lead.lastName || ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('common.phone', 'Telefon')}:
              </span>
              <span className="font-mono text-foreground">
                {formatPhone(lead.phone)}
              </span>
            </div>
            {lead.branchName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('common.branch', 'Filial')}:
                </span>
                <span className="text-foreground">{lead.branchName}</span>
              </div>
            )}
            {lead.category && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('vehicles.category', 'Toifa')}:
                </span>
                <span className="font-semibold text-foreground">
                  {lead.category}
                </span>
              </div>
            )}
          </div>

          {/* Duplicate Conflict Warning */}
          {duplicateWarning && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-start gap-2">
                <Warning className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="font-medium">{duplicateWarning}</p>
              </div>
              <label
                htmlFor="force-convert-checkbox"
                className="flex items-center gap-2 cursor-pointer pt-1 font-semibold select-none"
              >
                <input
                  id="force-convert-checkbox"
                  aria-describedby="force-convert-hint"
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <span>
                  {t('leads.force_convert', 'Mavjud o‘quvchiga bog‘lash')}
                </span>
              </label>
              <p id="force-convert-hint">
                {t(
                  'leads.force_convert_hint',
                  'Yangi o‘quvchi yaratilmaydi: lid shu o‘quvchiga bog‘lanadi.',
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={convertMutation.isPending}
          >
            {t('common.cancel', 'Bekor qilish')}
          </Button>
          <Button
            type="button"
            onClick={handleConvert}
            disabled={
              convertMutation.isPending || (!!duplicateWarning && !force)
            }
            className="gap-1.5"
          >
            {convertMutation.isPending ? (
              <CircleNotch className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            <span>{t('leads.confirm_convert', 'Aylantirish')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
