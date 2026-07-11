import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  useOperators,
  useCreateOperator,
  useUpdateOperator,
  useDeleteOperator,
} from '@/services/operatorService';
import { useBranches } from '@/services/branchService';
import { toast } from 'sonner';
import { User } from '@/types/user';
import { formatPhone } from '@/lib/phoneFormater';

const OperatorsPage = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: '', phone: '', branchId: '' });
  const { data: operators, isLoading, isError, refetch } = useOperators();
  const { data: branches } = useBranches();
  const createMut = useCreateOperator();
  const updateMut = useUpdateOperator();
  const deleteMut = useDeleteOperator();

  const filtered = (operators || []).filter(
    (o) =>
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.includes(search),
  );

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
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
  }, [filtered, sortField, sortDir]);

  const { currentPage, totalPages, paginatedItems, setCurrentPage } =
    usePagination(sorted);

  const openCreate = () => {
    setEditItem(null);
    setForm({ fullName: '', phone: '', branchId: '' });
    setModalOpen(true);
  };

  const openEdit = (o: User) => {
    setEditItem(o);
    setForm({
      fullName: o.name || '',
      phone: o.phone || '',
      branchId: o.branch_id || '',
    });
    setModalOpen(true);
  };

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
          onError: () => toast.error(t('common.error')),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(t('operators.added'));
          setModalOpen(false);
        },
        onError: () => toast.error(t('common.error')),
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
      onError: () => toast.error(t('common.error')),
    });
  };

  const getBranchName = (branchId?: string) =>
    (branches || []).find((b) => b.id === branchId)?.name ||
    branchId ||
    t('common.na');

  const startIndex = (currentPage - 1) * 10;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            {t('operators.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('operators.count', { count: filtered.length })}
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
                      className="table-row-striped border-b border-border/50"
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
                            onClick={() => openEdit(o)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(o.id)}
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
                        onClick={() => openEdit(o)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(o.id)}
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
          filtered.length === 0 &&
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

      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editItem ? t('operators.edit') : t('operators.add')}
            </DialogTitle>
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
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operator-phone">{t('operators.phone')} *</Label>
              <Input
                id="operator-phone"
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
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
    </div>
  );
};

export default OperatorsPage;
