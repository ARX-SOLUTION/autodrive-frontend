import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCourses,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
} from '@/services/courseService';
import { useBranches } from '@/services/branchService';
import { Course } from '@/types/course';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
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
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { extractErrorMessage } from '@/lib/errors';
import { formatMoney, groupDigits } from '@/lib/money';

interface FormState {
  name: string;
  branch_id: string;
  course_type: 'tezkor' | 'avto_maktab';
  price: string;
  duration_days: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  branch_id: '',
  course_type: 'avto_maktab',
  price: '',
  duration_days: '',
};

const CoursesPage = () => {
  const { t } = useTranslation();
  const { data: courses, isLoading } = useCourses();
  const { data: branches } = useBranches();
  const createMut = useCreateCourse();
  const updateMut = useUpdateCourse();
  const deleteMut = useDeleteCourse();

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Course | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const initialFormRef = useRef(form);

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    initialFormRef.current = EMPTY_FORM;
    setModalOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditItem(c);
    const initial: FormState = {
      name: c.name,
      branch_id: c.branch_id,
      course_type: c.course_type,
      price: groupDigits(String(c.price)),
      duration_days: String(c.duration_days),
    };
    setForm(initial);
    initialFormRef.current = initial;
    setModalOpen(true);
  };

  const isFormDirty =
    JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(
      isFormDirty || createMut.isPending || updateMut.isPending,
      () => setModalOpen(false),
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(form.price.replace(/\D/g, ''));
    const durationDays = Number(form.duration_days);
    if (!form.name.trim() || !form.branch_id || !price || !durationDays) {
      toast.error(t('common.fill_required'));
      return;
    }
    const payload = {
      name: form.name.trim(),
      branch_id: form.branch_id,
      course_type: form.course_type,
      price,
      duration_days: durationDays,
    };
    if (editItem) {
      updateMut.mutate(
        { id: editItem.id, ...payload },
        {
          onSuccess: () => {
            toast.success(t('courses.updated'));
            setModalOpen(false);
          },
          onError: (err) => toast.error(extractErrorMessage(err)),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(t('courses.added'));
          setModalOpen(false);
        },
        onError: (err) => toast.error(extractErrorMessage(err)),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMut.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t('courses.deleted'));
        setDeleteId(null);
      },
      onError: (err) => toast.error(extractErrorMessage(err)),
    });
  };

  const courseTypeLabel = (type: Course['course_type']) =>
    type === 'tezkor'
      ? t('courses.type_tezkor')
      : t('courses.type_avto_maktab');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            {t('courses.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('courses.subtitle')}
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t('courses.add')}
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('courses.name')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('common.branch')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  {t('courses.type')}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  {t('courses.price')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  {t('courses.duration')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  {t('common.status')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={7} className="p-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : (courses || []).length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={BookOpen}
                      title={t('courses.not_found')}
                      description={t('courses.not_found_desc')}
                      action={{ label: t('courses.add'), onClick: openCreate }}
                    />
                  </td>
                </tr>
              ) : (
                (courses || []).map((c) => (
                  <tr
                    key={c.id}
                    className="table-row-striped border-b border-border/50"
                  >
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.branch_name || t('common.na')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {courseTypeLabel(c.course_type)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(c.price)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t('courses.duration_days_value', {
                        count: c.duration_days,
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.is_active ? (
                        <span className="text-success">
                          {t('common.active')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {t('common.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          aria-label={t('common.edit')}
                          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          aria-label={t('common.delete')}
                          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))
        ) : courses && courses.length > 0 ? (
          courses.map((c) => (
            <DataCard
              key={c.id}
              title={c.name}
              subtitle={c.branch_name}
              fields={[
                {
                  label: t('courses.type'),
                  value: courseTypeLabel(c.course_type),
                },
                { label: t('courses.price'), value: formatMoney(c.price) },
                {
                  label: t('courses.duration'),
                  value: t('courses.duration_days_value', {
                    count: c.duration_days,
                  }),
                },
                {
                  label: t('common.status'),
                  value: c.is_active
                    ? t('common.active')
                    : t('common.inactive'),
                },
              ]}
              actions={
                <>
                  <button
                    onClick={() => openEdit(c)}
                    aria-label={t('common.edit')}
                    className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    aria-label={t('common.delete')}
                    className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              }
            />
          ))
        ) : (
          <EmptyState
            icon={BookOpen}
            title={t('courses.not_found')}
            description={t('courses.not_found_desc')}
            action={{ label: t('courses.add'), onClick: openCreate }}
          />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(o) => !o && attemptClose()}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editItem ? t('courses.edit') : t('courses.add')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('courses.form_desc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('courses.name')} *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.branch')} *</Label>
              <Select
                value={form.branch_id}
                onValueChange={(v) => setForm((f) => ({ ...f, branch_id: v }))}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder={t('common.select_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(branches || []).map((b) => (
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
                value={form.course_type}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    course_type: v as FormState['course_type'],
                  }))
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
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price: groupDigits(e.target.value),
                    }))
                  }
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
                  value={form.duration_days}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duration_days: e.target.value }))
                  }
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
                disabled={createMut.isPending || updateMut.isPending}
              >
                {createMut.isPending || updateMut.isPending
                  ? t('common.saving')
                  : t('common.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        description={
          deleteId
            ? t('courses.confirm_delete_desc', {
                name: courses?.find((c) => c.id === deleteId)?.name,
              })
            : undefined
        }
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={cancelDiscard}
        onConfirm={confirmDiscard}
        title={t('common.discard_changes_title')}
        description={t('common.discard_changes_desc')}
        confirmLabel={t('common.discard')}
      />
    </div>
  );
};

export default CoursesPage;
