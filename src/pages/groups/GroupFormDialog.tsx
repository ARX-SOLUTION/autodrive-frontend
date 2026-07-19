import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Warning, X } from '@phosphor-icons/react';
import {
  useCreateGroup,
  useUpdateGroup,
  useGroups,
} from '@/services/groupService';
import { useTeachers } from '@/services/teacherService';
import { Group } from '@/types/group';
import { Branch } from '@/types/branch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
import { useDebounce } from '@/hooks/useDebounce';
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
  const { data: teachers } = useTeachers();

  const [formName, setFormName] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formCourseType, setFormCourseType] = useState<string>('avto_maktab');
  // '' = unassigned; Radix Select forbids an empty-string item value, so the
  // <Select> below maps '' <-> the 'none' sentinel (AddStudentDialog group_id
  // precedent).
  const [formTeacherId, setFormTeacherId] = useState('');
  // Snapshot taken whenever the dialog opens, compared against current form
  // fields to drive the unsaved-changes guard below (autodrive-6cq.5.15) --
  // this form is plain useState, not react-hook-form, so there's no
  // formState.isDirty to read.
  const initialFormRef = useRef({
    name: formName,
    branchId: formBranchId,
    courseType: formCourseType,
    teacherId: formTeacherId,
  });

  useEffect(() => {
    if (!open) return;
    const init = editGroup
      ? {
          name: editGroup.name,
          branchId: editGroup.branch_id,
          courseType: editGroup.course_type as string,
          teacherId: editGroup.teacher_id || '',
        }
      : { name: '', branchId: '', courseType: 'avto_maktab', teacherId: '' };
    setFormName(init.name);
    setFormBranchId(init.branchId);
    setFormCourseType(init.courseType);
    setFormTeacherId(init.teacherId);
    initialFormRef.current = init;
  }, [open, editGroup]);

  const isFormDirty =
    formName !== initialFormRef.current.name ||
    formBranchId !== initialFormRef.current.branchId ||
    formCourseType !== initialFormRef.current.courseType ||
    formTeacherId !== initialFormRef.current.teacherId;
  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(
      isFormDirty || createMutation.isPending || updateMutation.isPending,
      onClose,
    );

  // autodrive-553: create-time duplicate check, scoped to the selected
  // branch -- a same-named group in a DIFFERENT branch must not warn, so
  // branch_id rides along in the same GET /groups?search= call (backend
  // already intersects search + branch_id). "Close match" = normalized
  // (trim + case-insensitive) equality, not just substring contains.
  const debouncedName = useDebounce(formName, 300);
  const [dupWarningDismissed, setDupWarningDismissed] = useState(false);
  useEffect(() => {
    setDupWarningDismissed(false);
  }, [debouncedName]);

  const { data: branchGroups } = useGroups({
    search: debouncedName.trim() || undefined,
    branchId: formBranchId || undefined,
  });
  const normalizedName = debouncedName.trim().toLowerCase();
  const dupMatches =
    !editGroup && normalizedName.length >= 2 && formBranchId
      ? (branchGroups || []).filter(
          (g) => g.name.trim().toLowerCase() === normalizedName,
        )
      : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBranchId) return;

    const payload = {
      name: formName,
      branchId: formBranchId,
      courseType: formCourseType,
      teacherId: formTeacherId || null,
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
            <div className="space-y-2">
              <Label htmlFor="group-teacher">
                {t('groups.form.teacher_label')}
              </Label>
              <Select
                value={formTeacherId || 'none'}
                onValueChange={(v) => setFormTeacherId(v === 'none' ? '' : v)}
              >
                <SelectTrigger
                  id="group-teacher"
                  className="bg-secondary border-border"
                >
                  <SelectValue
                    placeholder={t('groups.form.teacher_placeholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {/* Radix SelectItem forbids an empty-string value, so "unassigned" uses a sentinel mapped back to '' above. */}
                  <SelectItem value="none">
                    {t('groups.form.teacher_none')}
                  </SelectItem>
                  {(teachers || []).map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name || teacher.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dupMatches.length > 0 && !dupWarningDismissed && (
              <div className="flex items-start justify-between gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium text-warning">
                    <Warning className="h-4 w-4 shrink-0" />
                    {t('groups.duplicate_warning.title')}
                  </div>
                  <p className="text-muted-foreground">
                    {t('groups.duplicate_warning.desc')}
                  </p>
                  <ul className="space-y-1">
                    {dupMatches.map((g) => (
                      <li key={g.id}>
                        <Link
                          to={`/groups/${g.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {g.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => setDupWarningDismissed(true)}
                  aria-label={t('common.close')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

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
