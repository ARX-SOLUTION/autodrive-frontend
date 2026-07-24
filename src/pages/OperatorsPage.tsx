import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearchSortFilters } from '@/hooks/useSearchSortFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  CaretUp,
  CaretDown,
  CaretUpDown,
  Headphones,
  CircleNotch,
} from '@phosphor-icons/react';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import PaginationControls from '@/components/ui/PaginationControls';
import { cn } from '@/lib/utils';
import PersonModal, {
  type PersonFormPayload,
} from '@/components/ui/PersonModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useOperatorsPage,
  useCreateOperator,
  useUpdateOperator,
  useDeleteOperator,
} from '@/services/operatorService';
import { useBranches } from '@/services/branchService';
import { toast } from 'sonner';
import { User } from '@/types/user';
import { formatPhone } from '@/lib/phoneFormater';
import { mutationErrorToast } from '@/lib/mutationErrorToast';

// Backend GetUsersQueryDto caps limit at 100 -- large enough that a single
// branch/company's operator list never needs a second server page in
// practice, while still being real pagination (not a silent truncation)
// if it ever does.
const SERVER_PAGE_SIZE = 100;

const OperatorsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // MagnifyingGlass/sort/page live in the URL so reload/back/share preserve them
  // (autodrive-b85.3 -- mirrors admin-panel's useSearchSortFilters).
  const {
    search,
    setSearch,
    sortField,
    sortDir,
    toggleSort,
    page: currentPage,
    setPage: setCurrentPage,
  } = useSearchSortFilters('name');
  const debouncedSearch = useDebounce(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const {
    data: operatorsPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useOperatorsPage(currentPage, SERVER_PAGE_SIZE, debouncedSearch);
  const operators = useMemo(() => operatorsPage?.data ?? [], [operatorsPage]);
  const total = operatorsPage?.meta.total ?? 0;
  const totalPages = Math.max(1, operatorsPage?.meta.totalPages ?? 1);
  const { data: branches } = useBranches();
  const createMut = useCreateOperator();
  const updateMut = useUpdateOperator();
  const deleteMut = useDeleteOperator();

  // MagnifyingGlass is server-side now (autodrive-b85.3) -- GET /users matches
  // name/email/phone across the whole company (autodrive-3kl), not just the
  // current page. Sort still applies client-side to the current server page
  // only -- GET /users has no sortBy param.
  const paginatedItems = useMemo(() => {
    return [...operators].sort((a, b) => {
      const va = a[sortField as keyof typeof a];
      const vb = b[sortField as keyof typeof b];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc'
        ? va < vb
          ? -1
          : va > vb
            ? 1
            : 0
        : va > vb
          ? -1
          : va < vb
            ? 1
            : 0;
    });
  }, [operators, sortField, sortDir]);

  // Out-of-range page (e.g. search narrowed results) -> reset.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages]);

  const openCreate = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const openEdit = (o: User) => {
    setEditItem(o);
    setModalOpen(true);
  };

  const handleSubmit = (data: PersonFormPayload) => {
    const payload = {
      fullName: data.fullName,
      phone: data.phone!,
      branchId: data.branchId,
    };
    if (editItem) {
      updateMut.mutate(
        { id: editItem.id, ...payload },
        {
          onSuccess: () => {
            toast.success(t('operators.updated'));
            setModalOpen(false);
          },
          onError: (err) =>
            mutationErrorToast(err, t, () =>
              updateMut.mutate({ id: editItem.id, ...payload }),
            ),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(t('operators.added'));
          setModalOpen(false);
        },
        onError: (err) =>
          mutationErrorToast(err, t, () => createMut.mutate(payload)),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMut.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t('operators.deleted'));
        setDeleteId(null);
      },
      onError: (err) =>
        mutationErrorToast(err, t, () => deleteMut.mutate(deleteId)),
    });
  };

  const getBranchName = (branchId?: string) =>
    (branches || []).find((b) => b.id === branchId)?.name ||
    branchId ||
    t('common.na');

  const startIndex = (currentPage - 1) * SERVER_PAGE_SIZE;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            {t('operators.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              t('operators.count', { count: total })
            )}
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t('operators.add')}
        </Button>
      </div>
      <div className="relative max-w-sm">
        <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('operators.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary border-border"
        />
      </div>
      <div className="relative">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
            <CircleNotch className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <div
          className={cn(
            'glass-card overflow-hidden transition-opacity duration-200',
            isFetching && !isLoading && 'opacity-50',
          )}
        >
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {t('operators.first_name')}
                      {sortField === 'name' ? (
                        sortDir === 'asc' ? (
                          <CaretUp className="h-3 w-3" />
                        ) : (
                          <CaretDown className="h-3 w-3" />
                        )
                      ) : (
                        <CaretUpDown className="h-3 w-3 text-muted-foreground/70" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('phone')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {t('operators.phone')}
                      {sortField === 'phone' ? (
                        sortDir === 'asc' ? (
                          <CaretUp className="h-3 w-3" />
                        ) : (
                          <CaretDown className="h-3 w-3" />
                        )
                      ) : (
                        <CaretUpDown className="h-3 w-3 text-muted-foreground/70" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('branch_name')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {t('operators.branch')}
                      {sortField === 'branch_name' ? (
                        sortDir === 'asc' ? (
                          <CaretUp className="h-3 w-3" />
                        ) : (
                          <CaretDown className="h-3 w-3" />
                        )
                      ) : (
                        <CaretUpDown className="h-3 w-3 text-muted-foreground/70" />
                      )}
                    </button>
                  </th>
                  {/* autodrive-sgf.4 -- lifetime counts, no date filter on this page.
                    Never labeled "conversion" -- there is no true lead-conversion
                    data, only registered-student -> has-a-payment follow-through. */}
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t('operators.registered_count')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t('operators.follow_through_rate')}
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
                {isLoading
                  ? [...Array(3)].map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td colSpan={8} className="p-4">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      </tr>
                    ))
                  : paginatedItems.map((o, idx) => (
                      <tr
                        key={o.id}
                        className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => {
                          if (window.getSelection()?.toString()) return;
                          navigate(`/users/${o.id}`);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') navigate(`/users/${o.id}`);
                          if (e.key === ' ') {
                            e.preventDefault();
                            navigate(`/users/${o.id}`);
                          }
                        }}
                      >
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {startIndex + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium">{o?.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatPhone(o?.phone)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {o?.branch_name || getBranchName(o?.branch_id)}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                          {o.registered_students_count ?? t('common.na')}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                          {o.payment_follow_through_rate != null
                            ? `${o.payment_follow_through_rate}%`
                            : t('common.na')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${o.is_active !== false ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                          >
                            {o.is_active !== false
                              ? t('common.active')
                              : t('common.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(o);
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
                                setDeleteId(o.id);
                              }}
                              aria-label={t('common.delete')}
                              title={t('common.delete')}
                              className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden grid gap-3 p-3">
            {isLoading
              ? [...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))
              : paginatedItems.map((o) => (
                  <DataCard
                    key={o.id}
                    title={o?.name || t('common.na')}
                    subtitle={formatPhone(o?.phone)}
                    onClick={() => navigate(`/users/${o.id}`)}
                    fields={[
                      {
                        label: t('operators.detail.email'),
                        value: o?.email || t('common.na'),
                      },
                      {
                        label: t('operators.detail.branch'),
                        value:
                          o?.branch_name || getBranchName(o?.branch_id || ''),
                      },
                      {
                        label: t('operators.registered_count'),
                        value: o.registered_students_count ?? t('common.na'),
                      },
                      {
                        label: t('operators.follow_through_rate'),
                        value:
                          o.payment_follow_through_rate != null
                            ? `${o.payment_follow_through_rate}%`
                            : t('common.na'),
                      },
                      {
                        label: t('operators.detail.created'),
                        value: o?.created_at
                          ? new Date(o.created_at).toLocaleDateString('uz-UZ')
                          : t('common.na'),
                      },
                      {
                        label: t('operators.detail.status'),
                        value:
                          o.is_active !== false
                            ? t('common.active')
                            : t('common.inactive'),
                      },
                    ]}
                    actions={
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(o);
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
                            setDeleteId(o.id);
                          }}
                          aria-label={t('common.delete')}
                          title={t('common.delete')}
                          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </>
                    }
                  />
                ))}
          </div>
          {isError ? (
            <EmptyState
              title={t('common.error')}
              action={{ label: t('common.retry'), onClick: () => refetch() }}
            />
          ) : (
            total === 0 &&
            !isLoading && (
              <EmptyState icon={Headphones} title={t('operators.not_found')} />
            )
          )}
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <PersonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={createMut.isPending || updateMut.isPending}
        role="operator"
        person={editItem}
        title={editItem ? t('operators.edit') : t('operators.add')}
        description={t('operators.form_desc')}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        description={
          deleteId
            ? t('operators.confirm_delete_desc', {
                name: operators?.find((o) => o.id === deleteId)?.name,
              })
            : undefined
        }
      />
    </div>
  );
};

export default OperatorsPage;
