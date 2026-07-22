import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCreateCourse, useUpdateCourse } from '@/services/courseService';
import { Course } from '@/types/course';
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
import { groupDigits } from '@/lib/money';

interface CourseFormDialogProps {
  open: boolean;
  editCourse: Course | null;
  branches: Branch[];
  onClose: () => void;
}

// Extracted out of CoursesPage (was inline) so CourseDetailPage's edit
// affordance can launch the same create/edit modal the list uses --
// GroupFormDialog is the precedent for this open/editX/branches/onClose
// shape (src/pages/groups/GroupFormDialog.tsx).
const CourseFormDialog = ({
  open,
  editCourse,
  branches,
  onClose,
}: CourseFormDialogProps) => {
  const { t } = useTranslation();
  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();

  const [formName, setFormName] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formCourseType, setFormCourseType] = useState<
    'tezkor' | 'avto_maktab'
  >('avto_maktab');
  const [formPrice, setFormPrice] = useState('');
  const [formDurationDays, setFormDurationDays] = useState('');

  const initialFormRef = useRef({
    name: formName,
    branchId: formBranchId,
    courseType: formCourseType,
    price: formPrice,
    durationDays: formDurationDays,
  });

  useEffect(() => {
    if (!open) return;
    const init = editCourse
      ? {
          name: editCourse.name,
          branchId: editCourse.branch_id,
          courseType: editCourse.course_type,
          price: groupDigits(String(editCourse.price)),
          durationDays: String(editCourse.duration_days),
        }
      : {
          name: '',
          branchId: '',
          courseType: 'avto_maktab' as const,
          price: '',
          durationDays: '',
        };
    setFormName(init.name);
    setFormBranchId(init.branchId);
    setFormCourseType(init.courseType);
    setFormPrice(init.price);
    setFormDurationDays(init.durationDays);
    initialFormRef.current = init;
  }, [open, editCourse]);

  const isFormDirty =
    formName !== initialFormRef.current.name ||
    formBranchId !== initialFormRef.current.branchId ||
    formCourseType !== initialFormRef.current.courseType ||
    formPrice !== initialFormRef.current.price ||
    formDurationDays !== initialFormRef.current.durationDays;
  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(
      isFormDirty || createMutation.isPending || updateMutation.isPending,
      onClose,
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(formPrice.replace(/\D/g, ''));
    const durationDays = Number(formDurationDays);
    if (!formName.trim() || !formBranchId || !price || !durationDays) {
      toast.error(t('common.fill_required'));
      return;
    }
    const payload = {
      name: formName.trim(),
      branch_id: formBranchId,
      course_type: formCourseType,
      price,
      duration_days: durationDays,
    };
    if (editCourse) {
      updateMutation.mutate(
        { id: editCourse.id, ...payload },
        {
          onSuccess: () => {
            toast.success(t('courses.updated'));
            onClose();
          },
          onError: (err) => toast.error(extractErrorMessage(err)),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(t('courses.added'));
          onClose();
        },
        onError: (err) => toast.error(extractErrorMessage(err)),
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && attemptClose()}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editCourse ? t('courses.edit') : t('courses.add')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('courses.form_desc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('courses.name')} *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.branch')} *</Label>
              <Select value={formBranchId} onValueChange={setFormBranchId}>
                <SelectTrigger className="bg-secondary border-border">
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
              <Label>{t('courses.type')} *</Label>
              <Select
                value={formCourseType}
                onValueChange={(v) =>
                  setFormCourseType(v as 'tezkor' | 'avto_maktab')
                }
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tezkor">
                    {t('courses.type_tezkor')}
                  </SelectItem>
                  <SelectItem value="avto_maktab">
                    {t('courses.type_avto_maktab')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('courses.price')} *</Label>
                <Input
                  inputMode="numeric"
                  value={formPrice}
                  onChange={(e) => setFormPrice(groupDigits(e.target.value))}
                  required
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('courses.duration')} *</Label>
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={formDurationDays}
                  onChange={(e) => setFormDurationDays(e.target.value)}
                  required
                  className="bg-secondary border-border"
                />
              </div>
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
                  : t('common.save')}
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

export default CourseFormDialog;
