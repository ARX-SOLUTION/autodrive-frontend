import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Warning, X } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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

const makeGroupFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().trim().min(1, t('common.required')),
    branchId: z.string().trim().min(1, t('common.required')),
    courseType: z.string(),
    teacherId: z.string().optional(),
  });

type GroupFormValues = z.infer<ReturnType<typeof makeGroupFormSchema>>;

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

  const groupFormSchema = makeGroupFormSchema(t);

  const defaultFormValues = (): GroupFormValues => ({
    name: '',
    branchId: '',
    courseType: 'avto_maktab',
    teacherId: '',
  });

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: defaultFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      editGroup
        ? {
            name: editGroup.name,
            branchId: editGroup.branch_id,
            courseType: editGroup.course_type as string,
            teacherId: editGroup.teacher_id || '',
          }
        : defaultFormValues(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editGroup]);

  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(
      form.formState.isDirty ||
        createMutation.isPending ||
        updateMutation.isPending,
      onClose,
    );

  // autodrive-553: create-time duplicate check, scoped to the selected
  // branch -- a same-named group in a DIFFERENT branch must not warn, so
  // branch_id rides along in the same GET /groups?search= call (backend
  // already intersects search + branch_id). "Close match" = normalized
  // (trim + case-insensitive) equality, not just substring contains.
  const nameValue = form.watch('name');
  const branchIdValue = form.watch('branchId');
  const debouncedName = useDebounce(nameValue, 300);
  const [dupWarningDismissed, setDupWarningDismissed] = useState(false);
  useEffect(() => {
    setDupWarningDismissed(false);
  }, [debouncedName]);

  const { data: branchGroups } = useGroups({
    search: debouncedName.trim() || undefined,
    branchId: branchIdValue || undefined,
  });
  const normalizedName = debouncedName.trim().toLowerCase();
  const dupMatches =
    !editGroup && normalizedName.length >= 2 && branchIdValue
      ? (branchGroups || []).filter(
          (g) => g.name.trim().toLowerCase() === normalizedName,
        )
      : [];

  const onValid = (values: GroupFormValues) => {
    const payload = {
      name: values.name,
      branchId: values.branchId,
      courseType: values.courseType,
      teacherId: values.teacherId || null,
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onValid)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('groups.name')} *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="11-guruh"
                        className="bg-secondary border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.branch')} *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue
                            placeholder={t('common.select_placeholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="courseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('groups.course_type')} *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="avto_maktab">
                          {t('groups.course_school')}
                        </SelectItem>
                        <SelectItem value="tezkor">
                          {t('groups.course_fast')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('groups.form.teacher_label')}</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(v) =>
                        field.onChange(v === 'none' ? '' : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue
                            placeholder={t('groups.form.teacher_placeholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    // ponytail: visible icon stays 16px (fits the compact
                    // warning banner) -- after:-inset-3.5 grows the invisible
                    // hit area to 44x44 (a11y minimum) without changing what's
                    // drawn. Same after:-inset-N technique as
                    // CompanyRevenueDashboard's recovery-queue row arrow /
                    // components/ui/sidebar.tsx.
                    className="relative text-muted-foreground hover:text-foreground after:absolute after:-inset-3.5"
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
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t('common.saving')
                    : editGroup
                      ? t('common.save')
                      : t('common.add')}
                </Button>
              </div>
            </form>
          </Form>
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
