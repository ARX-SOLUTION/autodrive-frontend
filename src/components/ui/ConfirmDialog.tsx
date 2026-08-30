import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, type ButtonProps } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
  // Overrides the confirm button's label (default "Delete"/"Deleting...").
  // Non-destructive reuses (e.g. the discard-unsaved-changes guard) should
  // pass their own label -- t('common.discard') -- instead of a "Delete"
  // button on a dialog that isn't deleting anything.
  confirmLabel?: string;
  confirmVariant?: ButtonProps['variant'];
}

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  loading,
  confirmLabel,
  confirmVariant = 'destructive',
}: ConfirmDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {title ?? t('common.confirm_delete_title')}
          </DialogTitle>
          <DialogDescription>
            {description ?? t('common.confirm_delete_desc')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel ??
              (loading ? t('common.deleting') : t('common.delete'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
