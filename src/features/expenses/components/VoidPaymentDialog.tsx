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

interface VoidPaymentDialogProps {
  open: boolean;
  loading: boolean;
  conflict: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const VoidPaymentDialog = ({
  open,
  loading,
  conflict,
  onClose,
  onConfirm,
}: VoidPaymentDialogProps) => {
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
            {t('expenses.payments.void_title')}
          </DialogTitle>
          <DialogDescription>
            {t('expenses.payments.void_description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-void-payment-reason" required>
              {t('expenses.payments.void_reason')}
            </Label>
            <Textarea
              id="expense-void-payment-reason"
              aria-label={t('expenses.payments.void_reason')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('expenses.payments.void_reason_placeholder')}
              disabled={loading}
              aria-invalid={attempted && !reason.trim()}
              autoFocus
            />
            {attempted && !reason.trim() && (
              <p className="text-sm text-destructive" role="alert">
                {t('expenses.payments.void_reason_required')}
              </p>
            )}
          </div>
          {conflict && (
            <p className="text-sm text-destructive" role="alert">
              {t('expenses.payments.void_conflict')}
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
                ? t('expenses.payments.void_submitting')
                : t('expenses.payments.void_confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
