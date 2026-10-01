import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  useRestoreBranch,
} from '@/features/branches/api/branchService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import {
  Plus,
  PencilSimple,
  Trash,
  ArrowCounterClockwise,
  MapPin,
  Buildings,
} from '@phosphor-icons/react';
import { extractErrorMessage } from '@/lib/errors';
import {
  formatUzPhoneInput,
  isValidUzPhone,
  uzLocalDigits,
  uzPhoneE164,
} from '@/lib/phoneFormater';
import { Branch } from '@/features/branches/types';
import { useCan } from '@/hooks/useCan';
import { useListQueryState } from '@/hooks/useListQueryState';
import { matchesListQuery, pageCountFor, slicePage } from '@/lib/listQuery';
import { ListSearchField } from '@/components/ui/ListSearchField';
import { branchDeleteDescArgs } from '@/features/branches/lib/branchDeleteDescArgs';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataGrid, createDataGridColumnHelper } from '@/shared/ui/data-grid';

const branchColumnHelper = createDataGridColumnHelper<Branch>();

// Factory so field messages can be localized via t(), matching
// PersonModal's makePersonFormSchema convention.
const makeBranchFormSchema = (t: (key: string) => string) =>
  z
    .object({
      name: z.string().trim().min(1, t('common.required')),
      location: z.string().trim().min(1, t('common.required')),
      phone: z.string(),
    })
    .superRefine((data, ctx) => {
      if (uzLocalDigits(data.phone).length > 0 && !isValidUzPhone(data.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phone'],
          message: t('common.invalid_phone'),
        });
      }
    });

type BranchFormValues = z.infer<ReturnType<typeof makeBranchFormSchema>>;

const EMPTY_FORM: BranchFormValues = {
  name: '',
  location: '',
  phone: formatUzPhoneInput(''),
};

const BranchesPage = () => {
  const { t } = useTranslation();
  const goToBranch = useViewTransitionNavigate();
  const canManageBranches = useCan('branches.create');
  const canUpdateBranches = useCan('branches.update');
  const canDeleteBranches = useCan('branches.delete');
  const canViewDeleted = useCan('branches.restore');
  // owner-only "show deleted" toggle -- local state (not URL), defaults off.
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [editItem, setEditItem] = useState<Branch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    page,
    pageSize,
    search,
    debouncedSearch,
    setPage,
    setPageSize,
    setSearch,
  } = useListQueryState();

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

  const formSchema = useMemo(() => makeBranchFormSchema(t), [t]);

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_FORM,
  });

  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(
      form.formState.isDirty || createMut.isPending || updateMut.isPending,
      () => {
        setDialogOpen(false);
        setEditItem(null);
        form.reset(EMPTY_FORM);
      },
    );

  const openCreate = () => {
    setEditItem(null);
    form.reset(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = useCallback(
    (b: Branch) => {
      setEditItem(b);
      form.reset({
        name: b.name,
        location: b.location,
        phone: formatUzPhoneInput(b.phone || ''),
      });
      setDialogOpen(true);
    },
    [form],
  );

  // Filter branches locally based on search
  const filteredBranches = useMemo(() => {
    const list = branches || [];
    return list.filter((b) =>
      matchesListQuery(
        debouncedSearch,
        b.name,
        b.location,
        b.phone,
        b.manager_name,
      ),
    );
  }, [branches, debouncedSearch]);

  const pagedBranches = useMemo(
    () => slicePage(filteredBranches, page, pageSize),
    [filteredBranches, page, pageSize],
  );

  const searchMiss = Boolean(
    debouncedSearch &&
    (branches?.length ?? 0) > 0 &&
    filteredBranches.length === 0,
  );

  // Clamp current page if list shrunk
  useEffect(() => {
    const maxPage = pageCountFor(filteredBranches.length, pageSize);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredBranches.length, page, pageSize, setPage]);

  const onSubmit = (data: BranchFormValues) => {
    const payload = {
      name: data.name,
      location: data.location,
      phone: uzPhoneE164(data.phone),
    };

    if (editItem) {
      updateMut.mutate(
        { id: editItem.id, ...payload },
        {
          onSuccess: () => {
            toast.success(t('branches.updated'));
            setDialogOpen(false);
            setEditItem(null);
            form.reset(EMPTY_FORM);
          },
          onError: (err) =>
            toast.error(extractErrorMessage(err, t('common.error'))),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(t('branches.added'));
          setDialogOpen(false);
          form.reset(EMPTY_FORM);
        },
        onError: (err) =>
          toast.error(extractErrorMessage(err, t('common.error'))),
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
      onError: (err) =>
        toast.error(extractErrorMessage(err, t('common.error'))),
    });
  };

  const handleRestore = () => {
    if (!restoreId) return;
    restoreMut.mutate(restoreId, {
      onSuccess: () => {
        toast.success(t('branches.restored'));
        setRestoreId(null);
      },
      onError: (err) =>
        toast.error(extractErrorMessage(err, t('common.error'))),
    });
  };

  const deleteDescArgs = branchDeleteDescArgs(
    branches?.find((b) => b.id === deleteId),
  );
  const branchesTitle = t('branches.title');
  const startIndex = (page - 1) * pageSize;

  const columns = useMemo(
    () =>
      branchColumnHelper.columns([
        branchColumnHelper.display({
          id: 'rowNumber',
          header: '#',
          meta: {
            align: 'center',
            cellClassName: 'text-muted-foreground w-12',
          },
          cell: ({ row }) => startIndex + row.getDisplayIndex() + 1,
        }),
        branchColumnHelper.display({
          id: 'name',
          header: t('branches.name'),
          meta: { cellClassName: 'font-medium' },
          cell: ({ row }) => {
            const b = row.original;
            return (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) =>
                    goToBranch(
                      { to: '/branches/$id', params: { id: b.id } },
                      e.currentTarget,
                      `branch-${b.id}`,
                    )
                  }
                  className="text-left font-medium text-foreground hover:underline"
                >
                  {b.name}
                </button>
                {b.deleted_at && <DeletedBadge />}
              </div>
            );
          },
        }),
        branchColumnHelper.accessor('location', {
          header: t('branches.location'),
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ getValue }) => (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {getValue()}
            </span>
          ),
        }),
        branchColumnHelper.accessor('phone', {
          header: t('branches.phone'),
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ getValue }) => getValue() || t('common.na'),
        }),
        branchColumnHelper.accessor('manager_name', {
          header: t('branches.manager'),
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ getValue }) => getValue() || t('common.na'),
        }),
        branchColumnHelper.accessor('active_students', {
          header: t('branches.students'),
          meta: {
            align: 'center',
            cellClassName: 'tabular-nums text-muted-foreground font-medium',
          },
          cell: ({ getValue }) => getValue(),
        }),
        branchColumnHelper.display({
          id: 'status',
          header: t('common.status'),
          meta: { align: 'center' },
          cell: ({ row }) => {
            const b = row.original;
            if (b.deleted_at) {
              return (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                  {t('common.inactive')}
                </span>
              );
            }
            return (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-success/10 text-success">
                {t('common.active')}
              </span>
            );
          },
        }),
        branchColumnHelper.display({
          id: 'actions',
          header: t('common.actions'),
          meta: { align: 'center' },
          cell: ({ row }) => {
            const b = row.original;
            return (
              <div className="flex items-center justify-center gap-1">
                {b.deleted_at
                  ? canViewDeleted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRestoreId(b.id);
                        }}
                        aria-label={t('common.restore')}
                        title={t('common.restore')}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <ArrowCounterClockwise className="h-3.5 w-3.5" />
                      </button>
                    )
                  : (canUpdateBranches || canDeleteBranches) && (
                      <>
                        {canUpdateBranches && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(b);
                            }}
                            aria-label={t('common.edit')}
                            title={t('common.edit')}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <PencilSimple className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDeleteBranches && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(b.id);
                            }}
                            aria-label={t('common.delete')}
                            title={t('common.delete')}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
              </div>
            );
          },
        }),
      ]),
    [
      canUpdateBranches,
      canDeleteBranches,
      canViewDeleted,
      goToBranch,
      openEdit,
      startIndex,
      t,
    ],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={branchesTitle}
        title={branchesTitle}
        description={
          canManageBranches
            ? t('branches.subtitle')
            : t('branches.subtitle_readonly')
        }
        icon={<Buildings className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
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
        }
      />

      <ListSearchField value={search} onChange={setSearch} />

      <DataGrid
        data={pagedBranches}
        columns={columns}
        getRowId={(b) => b.id}
        getRowAriaLabel={(b) => b.name}
        onRowActivate={(b: Branch, element: HTMLTableRowElement) =>
          goToBranch(
            { to: '/branches/$id', params: { id: b.id } },
            element,
            `branch-${b.id}`,
          )
        }
        pagination={{
          pageIndex: page - 1,
          pageSize,
          rowCount: filteredBranches.length,
          pageCount: pageCountFor(filteredBranches.length, pageSize),
        }}
        onPaginationChange={({ pageIndex }) => setPage(pageIndex + 1)}
        onPageSizeChange={setPageSize}
        sorting={[]}
        onSortingChange={() => undefined}
        columnFilters={[]}
        onColumnFiltersChange={() => undefined}
        manualPagination
        manualSorting={false}
        manualFiltering
        isInitialLoading={isLoading}
        isFetching={false}
        labels={{
          table: branchesTitle,
          loading: t('common.loading'),
          fetching: t('common.loading'),
          previousPage: t('common.previous'),
          nextPage: t('common.next'),
        }}
        emptyState={
          <EmptyState
            icon={Buildings}
            title={t(searchMiss ? 'common.no_data' : 'branches.not_found')}
            description={searchMiss ? undefined : t('branches.not_found_desc')}
            action={
              canManageBranches && !searchMiss
                ? { label: t('branches.add'), onClick: openCreate }
                : undefined
            }
          />
        }
        renderMobileRow={({ row: b }) => (
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
                { to: '/branches/$id', params: { id: b.id } },
                e.currentTarget,
                `branch-${b.id}`,
              )
            }
            fields={[
              { label: t('branches.phone'), value: b.phone || t('common.na') },
              {
                label: t('branches.manager'),
                value: b.manager_name || t('common.na'),
              },
              { label: t('branches.students'), value: b.active_students },
            ]}
            actions={
              b.deleted_at
                ? canViewDeleted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRestoreId(b.id);
                      }}
                      aria-label={t('common.restore')}
                      title={t('common.restore')}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <ArrowCounterClockwise className="h-3.5 w-3.5" />
                    </button>
                  )
                : (canUpdateBranches || canDeleteBranches) && (
                    <>
                      {canUpdateBranches && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(b);
                          }}
                          aria-label={t('common.edit')}
                          title={t('common.edit')}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <PencilSimple className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDeleteBranches && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(b.id);
                          }}
                          aria-label={t('common.delete')}
                          title={t('common.delete')}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )
            }
          />
        )}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && attemptClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editItem ? t('branches.edit') : t('branches.add')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('branches.form_desc')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('branches.name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('branches.name_placeholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('branches.location')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('branches.address')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('branches.phone')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+998 90 123 45 67"
                        type="tel"
                        {...field}
                        onChange={(e) => {
                          const formatted = formatUzPhoneInput(e.target.value);
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={attemptClose}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                >
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={t('branches.delete_title')}
        description={
          deleteDescArgs
            ? t(deleteDescArgs.key, deleteDescArgs.options)
            : undefined
        }
        confirmLabel={t('common.delete')}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />

      <ConfirmDialog
        open={Boolean(restoreId)}
        title={t('common.confirm_restore_title')}
        description={t('common.confirm_restore_desc')}
        confirmLabel={t('common.restore')}
        confirmVariant="default"
        onConfirm={handleRestore}
        onClose={() => setRestoreId(null)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={t('common.discard_changes_title')}
        description={t('common.discard_changes_desc')}
        confirmLabel={t('common.discard')}
        confirmVariant="destructive"
        onConfirm={confirmDiscard}
        onClose={cancelDiscard}
      />
    </div>
  );
};

export default BranchesPage;
