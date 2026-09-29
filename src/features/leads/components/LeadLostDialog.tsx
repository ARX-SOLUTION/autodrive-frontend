import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { LeadLostReason } from '../types/leads.types';

export interface LeadLostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: LeadLostReason, otherText?: string) => void;
  isLoading?: boolean;
}

const LOST_REASONS: LeadLostReason[] = [
  'EXPENSIVE',
  'FAR_AWAY',
  'BAD_SCHEDULE',
  'COMPETITOR',
  'NOT_INTERESTED',
  'NO_ANSWER',
  'OTHER',
];

export const LeadLostDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: LeadLostDialogProps) => {
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] =
    useState<LeadLostReason>('NOT_INTERESTED');
  const [otherReason, setOtherReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(
      selectedReason,
      selectedReason === 'OTHER' ? otherReason.trim() : undefined,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {t('leads.lost_reason', 'Yo‘qotish sababi')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'leads.select_lost_reason_desc',
                'Lidni yo‘qotilgan deb belgilash uchun sababni ko‘rsating. Bu ma‘lumot voronka tahlili uchun zarur.',
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lost-reason-select">
                {t('leads.lost_reason', 'Sabab')}
              </Label>
              <Select
                value={selectedReason}
                onValueChange={(val) =>
                  setSelectedReason(val as LeadLostReason)
                }
              >
                <SelectTrigger id="lost-reason-select" className="w-full">
                  <SelectValue
                    placeholder={t(
                      'leads.select_lost_reason',
                      'Sababni tanlang',
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {LOST_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {t(`leads.lost_reasons.${reason}`, reason)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedReason === 'OTHER' && (
              <div className="space-y-2">
                <Label htmlFor="other-reason-input">
                  {t('leads.lost_reason_other', 'Boshqa sabab izohi')}
                </Label>
                <Input
                  id="other-reason-input"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder={t('leads.enter_reason', 'Sababni kiriting...')}
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t('common.cancel', 'Bekor qilish')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={
                isLoading || (selectedReason === 'OTHER' && !otherReason.trim())
              }
            >
              {t('common.confirm', 'Tasdiqlash')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
