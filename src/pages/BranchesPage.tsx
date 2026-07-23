import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  useRestoreBranch,
} from '@/services/branchService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { DeletedBadge } from '@/components/ui/DeletedBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus,
  PencilSimple,
  Trash,
  ArrowCounterClockwise,
  MapPin,
  Buildings,
  Phone,
} from '@phosphor-icons/react';
import { formatDate } from '@/pages/students/studentsFormat';
import { extractErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import {
  formatUzPhoneInput,
  isValidUzPhone,
  uzLocalDigits,
  uzPhoneE164,
} from '@/lib/phoneFormater';
import { Branch } from '@/types/branch';
import { useCan } from '@/hooks/useCan';
import { branchDeleteDescArgs } from './branchDeleteDescArgs';

interface FormState {
  name: string;
  location: string;
  phone: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  location: '',
  phone: formatUzPhoneInput(''),
};

const BranchesPage = () => {
  const { t } = useTranslation();
  const goToBranch = useViewTransitionNavigate();
  const canManageBranches = useCan('manageBranches');
  const canViewDeleted = useCan('viewDeleted');
  // autodrive-cg9: owner-only "show deleted" toggle -- local state (not
  // URL), defaults off.
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data: branches, isLoading } = useBranches(
    true,
    // Defensive even though the toggle only renders for an owner: never let
    // a stray true reach the request for anyone else (403 on the wire).
    canViewDeleted && includeDeleted,
  );
  const createMut = useCreateBranch();
  const updateMut = useUpdateBranch();
  const deleteMut = useDeleteBranch();
  const restoreMut = useRestoreBranch();

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Branch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // Snapshot taken whenever the dialog opens, compared against current form
  // state to drive the unsaved-changes guard below (autodrive-6cq.5.15) --
  // this form is plain useState, not react-hook-form, so there's no
  // formState.isDirty to read.
  const initialFormRef = useRef(form);

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    initialFormRef.current = EMPTY_FORM;
    setModalOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditItem(b);
    const initial = {
      name: b.name,
      location: b.location,
      phone: formatUzPhoneInput(b.phone),
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
    if (!form.name.trim() || !form.location.trim()) return;
    const phoneHasDigits = uzLocalDigits(form.phone).length > 0;
    if (phoneHasDigits && !isValidUzPhone(form.phone)) {
      toast.error(t('common.invalid_phone'));
      return;
    }
    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      phone: phoneHasDigits ? uzPhoneE164(form.phone) : undefined,
    };
    if (editItem) {
      updateMut.mutate(
        { id: editItem.id, ...payload },
        {
          onSuccess: () => {
            toast.success(t('branches.updated'));
            setModalOpen(false);
          },
          onError: (err) => toast.error(extractErrorMessage(err)),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(t('branches.added'));
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
        toast.success(t('branches.deleted'));
        setDeleteId(null);
      },
      onError: (err) => toast.error(extractErrorMessage(err)),
    });
  };

  const handleRestore = () => {
    if (!restoreId) return;
    restoreMut.mutate(restoreId, {
      onSuccess: () => {
        toast.success(t('branches.restored'));
        setRestoreId(null);
      },
      onError: (err) => toast.error(extractErrorMessage(err)),
    });
  };

  // autodrive-cg9: active_students already lives on the branch object that
  // populated the card the user clicked delete on -- no extra fetch.
  const deleteDescArgs = branchDeleteDescArgs(
    branches?.find((b) => b.id === deleteId),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            {t('branches.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {canManageBranches
              ? t('branches.subtitle')
              : t('branches.subtitle_readonly')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canViewDeleted && (
            <div className="flex items-center gap-2">
              <Label htmlFor="branches-show-deleted">
                {t('common.show_deleted')}
              </Label>
              <Switch
                id="branches-show-deleted"
                checked={includeDeleted}
                onCheckedChange={setIncludeDeleted}
              />
            </div>
          )}
          {canManageBranches && (
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('branches.add')}
            </Button>
          )}
        </div>
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))
            ) : (branches || []).length === 0 ? (
              <div className="md:col-span-2">
                <EmptyState
                  icon={Buildings}
                  title={t('branches.not_found')}
                  description={t('branches.not_found_desc')}
                  action={
                    canManageBranches
                      ? { label: t('branches.add'), onClick: openCreate }
                      : undefined
                  }
                />
              </div>
            ) : (
              (branches || []).map((b) => (
                <div
                  key={b.id}
                  onClick={(e) =>
                    goToBranch(
                      `/branches/${b.id}`,
                      e.currentTarget,
                      `branch-${b.id}`,
                    )
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToBranch(
                        `/branches/${b.id}`,
                        e.currentTarget,
                        `branch-${b.id}`,
                      );
                    }
                  }}
                  className={cn(
                    'glass-card p-5 animate-slide-in cursor-pointer hover:border-primary/40 transition-colors',
                    b.deleted_at && 'opacity-60',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-balance">
                        <span className="inline-flex items-center gap-1.5">
                          {b.name}
                          {b.deleted_at && <DeletedBadge />}
                        </span>
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {b.location}
                      </div>
                      {b.phone && (
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {b.phone}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {b.deleted_at
                        ? canViewDeleted && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRestoreId(b.id);
                              }}
                              aria-label={t('common.restore')}
                              title={t('common.restore')}
                              className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                              <ArrowCounterClockwise className="h-3.5 w-3.5" />
                            </button>
                          )
                        : canManageBranches && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(b);
                                }}
                                aria-label={t('common.edit')}
                                title={t('common.edit')}
                                className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              >
                                <PencilSimple className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(b.id);
                                }}
                                aria-label={t('common.delete')}
                                title={t('common.delete')}
                                className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {t('branches.manager')}:{' '}
                      </span>
                      <span className="text-foreground font-medium">
                        {b.manager_name || t('common.na')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t('branches.students')}:{' '}
                      </span>
                      <span className="text-foreground font-medium">
                        {b.active_students}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))
        ) : branches && branches.length > 0 ? (
          branches.map((b) => (
            <DataCard
              key={b.id}
              title={
                <span className="inline-flex items-center gap-1.5">
                  {b.name}
                  {b.deleted_at && <DeletedBadge />}
                </span>
              }
              subtitle={b.location}
              onClick={(e) =>
                goToBranch(
                  `/branches/${b.id}`,
                  e.currentTarget,
                  `branch-${b.id}`,
                )
              }
              className={b.deleted_at ? 'opacity-60' : undefined}
              fields={[
                { label: t('branches.students'), value: b.active_students },
                {
                  label: t('common.phone'),
                  value: b.phone || t('common.na'),
                },
                {
                  label: t('branches.created'),
                  value: formatDate(b.created_at),
                },
                {
                  label: t('branches.status'),
                  value: t('branches.status_active'),
                },
              ]}
              actions={
                b.deleted_at ? (
                  canViewDeleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRestoreId(b.id);
                      }}
                      aria-label={t('common.restore')}
                      title={t('common.restore')}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <ArrowCounterClockwise className="h-3.5 w-3.5" />
                    </button>
                  )
                ) : canManageBranches ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(b);
                      }}
                      aria-label={t('common.edit')}
                      title={t('common.edit')}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <PencilSimple className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(b.id);
                      }}
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : undefined
              }
            />
          ))
        ) : (
          <EmptyState
            icon={Buildings}
            title={t('branches.not_found')}
            description={t('branches.not_found_desc')}
            action={
              canManageBranches
                ? { label: t('branches.add'), onClick: openCreate }
                : undefined
            }
          />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(o) => !o && attemptClose()}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editItem ? t('branches.edit') : t('branches.add')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('branches.form_desc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">
                {t('branches.name')} <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="branch-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
                autoComplete="organization"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-address">
                {t('branches.address')} <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="branch-address"
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                required
                placeholder={t('branches.address')}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-phone">{t('common.phone')}</Label>
              <Input
                id="branch-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    phone: formatUzPhoneInput(e.target.value),
                  }))
                }
                placeholder="+998 90 123 45 67"
                className="bg-secondary border-border"
              />
              {uzLocalDigits(form.phone).length > 0 &&
                !isValidUzPhone(form.phone) && (
                  <p className="text-xs text-destructive">
                    {t('common.invalid_phone')}
                  </p>
                )}
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
          deleteDescArgs
            ? t(deleteDescArgs.key, deleteDescArgs.options)
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

      {/* autodrive-cg9: restore only un-deletes this row -- honesty
          requirement, see common.confirm_restore_desc. */}
      <ConfirmDialog
        open={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={handleRestore}
        loading={restoreMut.isPending}
        title={t('common.confirm_restore_title')}
        description={t('common.confirm_restore_desc')}
        confirmLabel={
          restoreMut.isPending ? t('common.restoring') : t('common.restore')
        }
      />
    </div>
  );
};

export default BranchesPage;
