import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "O'chirishni tasdiqlang",
  description = "Bu amalni ortga qaytarib bo'lmaydi. Davom etishni xohlaysizmi?",
  loading,
}: ConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="glass-card border-border sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-heading">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>
          Bekor qilish
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={loading}>
          {loading ? "O'chirilmoqda..." : "O'chirish"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
