import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearchSortFilters } from '@/hooks/useSearchSortFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Headphones,
} from 'lucide-react';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import PaginationControls from '@/components/ui/PaginationControls';
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
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
import { extractErrorMessage } from '@/lib/errors';

// Backend GetUsersQueryDto caps limit at 100 -- large enough that a single
// branch/company's operator list never needs a second server page in
// practice, while still being real pagination (not a silent truncation)
// if it ever does.
const SERVER_PAGE_SIZE = 100;

const OperatorsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Search/sort/page live in the URL so reload/back/share preserve them
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
  const [form, setForm] = useState({ fullName: '', phone: '', branchId: '' });
  // Snapshot taken whenever the dialog opens, compared against current form
  // state to drive the unsaved-changes guard below (autodrive-6cq.5.15) --
  // this form is plain useState, not react-hook-form, so there's no
  // formState.isDirty to read.
  const initialFormRef = useRef(form);
  const {
    data: operatorsPage,
    isLoading,
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

  // Search is server-side now (autodrive-b85.3) -- GET /users matches
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
    const empty = { fullName: '', phone: '', branchId: '' };
    setForm(empty);
    initialFormRef.current = empty;
    setModalOpen(true);
  };

  const openEdit = (o: User) => {
    setEditItem(o);
    const initial = {
      fullName: o.name || '',
      phone: o.phone || '',
      branchId: o.branch_id || '',
    };
    setForm(initial);
    initialFormRef.current = initial;
    setModalOpen(true);
  };

  const isFormDirty =
    JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(isFormDirty, () => setModalOpen(false));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) return;
    const payload = {
      fullName: form.fullName,
      phone: form.phone,
      branchId: form.branchId || undefined,
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
            toast.error(extractErrorMessage(err, t('common.error'))),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(t('operators.added'));
          setModalOpen(false);
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
        toast.success(t('operators.deleted'));
        setDeleteId(null);
      },
      onError: (err) =>
        toast.error(extractErrorMessage(err, t('common.error'))),
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('operators.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary border-border"
        />
      </div>
      <div className="glass-card overflow-hidden">
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
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
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
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
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
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </button>
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
                      <td colSpan={6} className="p-4">
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
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(o.id);
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(o.id);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <Dialog open={modalOpen} onOpenChange={(o) => !o && attemptClose()}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editItem ? t('operators.edit') : t('operators.add')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('operators.form_desc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="operator-name">
                {t('operators.first_name')} *
              </Label>
              <Input
                id="operator-name"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                required
                autoComplete="name"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operator-phone">{t('operators.phone')} *</Label>
              <Input
                id="operator-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                required
                placeholder="+998901234567"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operator-branch">{t('operators.branch')}</Label>
              <Select
                value={form.branchId}
                onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
              >
                <SelectTrigger
                  id="operator-branch"
                  className="bg-secondary border-border"
                >
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
                  : editItem
                    ? t('common.save')
                    : t('common.add')}
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

export default OperatorsPage;
