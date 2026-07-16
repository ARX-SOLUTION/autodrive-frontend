import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCreateGroup, useUpdateGroup } from '@/services/groupService';
import { Group } from '@/types/group';
import { Branch } from '@/types/branch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { extractErrorMessage } from '@/lib/errors';

interface GroupFormDialogProps {
  open: boolean;
  editGroup: Group | null;
  branches: Branch[];
  onClose: () => void;
}

const GroupFormDialog = ({
  open,
  editGroup,
  branches,
  onClose,
}: GroupFormDialogProps) => {
  const { t } = useTranslation();
  const createMutation = useCreateGroup();
  const updateMutation = useUpdateGroup();

  const [formName, setFormName] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formCourseType, setFormCourseType] = useState<string>('avto_maktab');
  // Snapshot taken whenever the dialog opens, compared against current form
  // fields to drive the unsaved-changes guard below (autodrive-6cq.5.15) --
  // this form is plain useState, not react-hook-form, so there's no
  // formState.isDirty to read.
  const initialFormRef = useRef({
    name: formName,
    branchId: formBranchId,
    courseType: formCourseType,
  });

  useEffect(() => {
    if (!open) return;
    const init = editGroup
      ? {
          name: editGroup.name,
          branchId: editGroup.branch_id,
          courseType: editGroup.course_type as string,
        }
      : { name: '', branchId: '', courseType: 'avto_maktab' };
    setFormName(init.name);
    setFormBranchId(init.branchId);
    setFormCourseType(init.courseType);
    initialFormRef.current = init;
  }, [open, editGroup]);

  const isFormDirty =
    formName !== initialFormRef.current.name ||
    formBranchId !== initialFormRef.current.branchId ||
    formCourseType !== initialFormRef.current.courseType;
  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(
      isFormDirty || createMutation.isPending || updateMutation.isPending,
      onClose,
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBranchId) return;

    const payload = {
      name: formName,
      branchId: formBranchId,
      courseType: formCourseType,
    };

    if (editGroup) {
      updateMutation.mutate(
        { id: editGroup.id, ...payload },
        {
          onSuccess: () => {
            toast.success(t('groups.updated'));
            onClose();
          },
          onError: (err) =>
            toast.error(extractErrorMessage(err, t('common.error'))),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(t('groups.added'));
          onClose();
        },
        onError: (err) =>
          toast.error(extractErrorMessage(err, t('common.error'))),
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && attemptClose()}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editGroup ? t('groups.edit') : t('groups.add')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('groups.form_desc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">{t('groups.name')} *</Label>
              <Input
                id="group-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="11-guruh"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-branch">{t('common.branch')} *</Label>
              <Select value={formBranchId} onValueChange={setFormBranchId}>
                <SelectTrigger
                  id="group-branch"
                  className="bg-secondary border-border"
                >
                  <SelectValue placeholder={t('common.select_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-course-type">
                {t('groups.course_type')} *
              </Label>
              <Select value={formCourseType} onValueChange={setFormCourseType}>
                <SelectTrigger
                  id="group-course-type"
                  className="bg-secondary border-border"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avto_maktab">
                    {t('groups.course_school')}
                  </SelectItem>
                  <SelectItem value="tezkor">
                    {t('groups.course_fast')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={attemptClose}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('common.saving')
                  : editGroup
                    ? t('common.save')
                    : t('common.add')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={cancelDiscard}
        onConfirm={confirmDiscard}
        title={t('common.discard_changes_title')}
        description={t('common.discard_changes_desc')}
        confirmLabel={t('common.discard')}
      />
    </>
  );
};

export default GroupFormDialog;
