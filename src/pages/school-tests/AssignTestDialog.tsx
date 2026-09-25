import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { extractErrorMessage } from '@/lib/errors';
import { useAssignTestTemplate } from '@/services/schoolTestService';
import { useGroups } from '@/services/groupService';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export const AssignTestDialog = ({
  open,
  templateId,
  branchId,
  onClose,
}: {
  open: boolean;
  templateId: string;
  branchId: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const assign = useAssignTestTemplate();
  const groups = useGroups({ branchId });
  const [groupId, setGroupId] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!groupId) {
      toast.error(t('school_tests.group_required'));
      return;
    }
    assign.mutate(
      { id: templateId, group_id: groupId },
      {
        onSuccess: () => {
          toast.success(t('school_tests.assigned'));
          onClose();
        },
        onError: (error: Error) =>
          toast.error(extractErrorMessage(error, t('common.error'))),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('school_tests.assign')}</DialogTitle>
          <DialogDescription>{t('school_tests.assign_hint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span>{t('nav.groups')}</span>
            <select
              className={selectClass}
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
            >
              <option value="">{t('common.select_placeholder')}</option>
              {(groups.data ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={assign.isPending}>
              {t('school_tests.assign')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
