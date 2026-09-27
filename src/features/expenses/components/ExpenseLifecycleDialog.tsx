import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export type ExpenseLifecycleAction = 'cancel' | 'delete';

interface ExpenseLifecycleDialogProps {
  open: boolean;
  action: ExpenseLifecycleAction;
  loading: boolean;
  conflict: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const ExpenseLifecycleDialog = ({
  open,
  action,
  loading,
  conflict,
  onClose,
  onConfirm,
}: ExpenseLifecycleDialogProps) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    const normalizedReason = reason.trim();
    if (!normalizedReason || loading) return;
    onConfirm(normalizedReason);
  };

  const isCancel = action === 'cancel';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onClose();
      }}
    >
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {t(
              isCancel
                ? 'expenses.lifecycle.cancel_title'
                : 'expenses.lifecycle.delete_title',
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              isCancel
                ? 'expenses.lifecycle.cancel_description'
                : 'expenses.lifecycle.delete_description',
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-lifecycle-reason" required>
              {t('expenses.lifecycle.reason')}
            </Label>
            <Textarea
              id="expense-lifecycle-reason"
              aria-label={t('expenses.lifecycle.reason')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('expenses.lifecycle.reason_placeholder')}
              disabled={loading}
              aria-invalid={attempted && !reason.trim()}
              autoFocus
            />
            {attempted && !reason.trim() && (
              <p className="text-sm text-destructive" role="alert">
                {t('expenses.lifecycle.reason_required')}
              </p>
            )}
          </div>
          {conflict && (
            <p className="text-sm text-destructive" role="alert">
              {t('expenses.lifecycle.conflict')}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading
                ? t('expenses.lifecycle.submitting')
                : t(
                    isCancel
                      ? 'expenses.lifecycle.cancel_confirm'
                      : 'expenses.lifecycle.delete_confirm',
                  )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
