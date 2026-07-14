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
  Users,
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
  useTeachersPage,
  useCreateTeacher,
  useUpdateTeacher,
  useDeleteTeacher,
  Specialization,
} from '@/services/teacherService';
import { useBranches } from '@/services/branchService';
import { toast } from 'sonner';
import { User } from '@/types/user';
import { RoleGate } from '@/components/RoleGate';
import { extractErrorMessage } from '@/lib/errors';
import { isValidName } from '@/lib/validation';
import {
  formatUzPhoneInput,
  isValidUzPhone,
  uzLocalDigits,
  uzPhoneE164,
} from '@/lib/phoneFormater';

// Backend GetUsersQueryDto caps limit at 100 -- large enough that a single
// branch/company's teacher list never needs a second server page in
// practice, while still being real pagination (not a silent truncation)
// if it ever does.
const SERVER_PAGE_SIZE = 100;

const TeachersPage = () => {
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
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    branchId: '',
    specialization: 'THEORY' as Specialization,
  });
  // Snapshot taken whenever the dialog opens, compared against current form
  // state to drive the unsaved-changes guard below (autodrive-6cq.5.15) --
  // this form is plain useState, not react-hook-form, so there's no
  // formState.isDirty to read.
  const initialFormRef = useRef(form);

  const {
    data: teachersPage,
    isLoading,
    isError,
    refetch,
  } = useTeachersPage(currentPage, SERVER_PAGE_SIZE, debouncedSearch);
  const teachers = useMemo(() => teachersPage?.data ?? [], [teachersPage]);
  const total = teachersPage?.meta.total ?? 0;
  const totalPages = Math.max(1, teachersPage?.meta.totalPages ?? 1);
  const { data: branches } = useBranches();
  const createMut = useCreateTeacher();
  const updateMut = useUpdateTeacher();
  const deleteMut = useDeleteTeacher();

  const specLabels: Record<Specialization, string> = {
    THEORY: t('teachers.spec_theory'),
    PRACTICE: t('teachers.spec_practice'),
  };

  // NOTE: never name a callback param `t` here — it shadows the i18n `t`
  // and crashes the row render (the original TeachersPage production bug).
  //
  // Search is server-side now (autodrive-b85.3) -- GET /users matches
  // name/email/phone across the whole company (autodrive-3kl), not just the
  // current page. Sort still applies client-side to the current server page
  // only -- GET /users has no sortBy param.
  const paginatedItems = useMemo(() => {
    return [...teachers].sort((a, b) => {
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
  }, [teachers, sortField, sortDir]);

  // Out-of-range page (e.g. search narrowed results) -> reset.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages]);

  const openCreate = () => {
    setEditItem(null);
    const empty = {
      fullName: '',
      phone: formatUzPhoneInput(''),
      branchId: '',
      specialization: 'THEORY' as Specialization,
    };
    setForm(empty);
    initialFormRef.current = empty;
    setModalOpen(true);
  };

  const openEdit = (teacher: User) => {
    setEditItem(teacher);
    const initial = {
      fullName: teacher.name || '',
      phone: formatUzPhoneInput(teacher.phone),
      branchId: teacher.branch_id || '',
      specialization: teacher.specialization || ('THEORY' as Specialization),
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
    if (!form.fullName.trim()) return;
    if (!isValidName(form.fullName)) {
      toast.error(t('common.invalid_name'));
      return;
    }
    if (!isValidUzPhone(form.phone)) {
      toast.error(t('common.invalid_phone'));
      return;
    }
    const payload = {
      fullName: form.fullName,
      phone: uzPhoneE164(form.phone),
      branchId: form.branchId || undefined,
      specialization: form.specialization || undefined,
    };
    if (editItem) {
      updateMut.mutate(
        { id: editItem.id, ...payload },
        {
          onSuccess: () => {
            toast.success(t('teachers.updated'));
            setModalOpen(false);
          },
          onError: (err) =>
            toast.error(extractErrorMessage(err, t('common.error'))),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(t('teachers.added'));
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
        toast.success(t('teachers.deleted'));
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
            {t('teachers.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('teachers.count', { count: total })}
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t('teachers.add')}
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('teachers.search_placeholder')}
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
                    {t('teachers.first_name')}
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
                    {t('teachers.phone')}
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
                  {t('teachers.specialization')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('teachers.branch')}
                </th>
                {/* autodrive-sgf.4 -- lifetime counts, no date filter on this page */}
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  {t('teachers.lesson_count')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  {t('teachers.student_count')}
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
                      <td colSpan={9} className="p-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                : paginatedItems.map((teacher, idx) => (
                    <tr
                      key={teacher.id}
                      className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => {
                        if (window.getSelection()?.toString()) return;
                        navigate(`/users/${teacher.id}`);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/users/${teacher.id}`);
                        if (e.key === ' ') {
                          e.preventDefault();
                          navigate(`/users/${teacher.id}`);
                        }
                      }}
                    >
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {startIndex + idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium">{teacher.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {teacher.phone}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {teacher.specialization
                          ? specLabels[teacher.specialization] ||
                            teacher.specialization
                          : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {teacher.branch_name ||
                          getBranchName(teacher.branch_id)}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                        {teacher.lesson_count ?? t('common.na')}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                        {teacher.student_count ?? t('common.na')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${teacher.is_active !== false ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                        >
                          {teacher.is_active !== false
                            ? t('common.active')
                            : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(teacher);
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(teacher.id);
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
            : paginatedItems.map((teacher) => (
                <DataCard
                  key={teacher.id}
                  title={teacher.name || t('common.na')}
                  subtitle={teacher.phone}
                  onClick={() => navigate(`/users/${teacher.id}`)}
                  fields={[
                    {
                      label: t('teachers.specialization'),
                      value: teacher.specialization
                        ? specLabels[teacher.specialization] ||
                          teacher.specialization
                        : t('common.na'),
                    },
                    {
                      label: t('teachers.email'),
                      value: teacher.email || t('common.na'),
                    },
                    {
                      label: t('teachers.branch'),
                      value:
                        teacher.branch_name ||
                        getBranchName(teacher.branch_id || ''),
                    },
                    {
                      label: t('teachers.lesson_count'),
                      value: teacher.lesson_count ?? t('common.na'),
                    },
                    {
                      label: t('teachers.student_count'),
                      value: teacher.student_count ?? t('common.na'),
                    },
                    {
                      label: t('operators.detail.created'),
                      value: teacher.created_at
                        ? new Date(teacher.created_at).toLocaleDateString(
                            'uz-UZ',
                          )
                        : t('common.na'),
                    },
                  ]}
                  actions={
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(teacher);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(teacher.id);
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
            <EmptyState icon={Users} title={t('teachers.not_found')} />
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
              {editItem ? t('teachers.edit') : t('teachers.add')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('teachers.form_desc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-name">{t('teachers.first_name')} *</Label>
              <Input
                id="teacher-name"
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
              <Label htmlFor="teacher-phone">{t('teachers.phone')} *</Label>
              <Input
                id="teacher-phone"
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
                required
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
            <div className="space-y-2">
              <Label htmlFor="teacher-spec">
                {t('teachers.specialization')} *
              </Label>
              <Select
                value={form.specialization}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    specialization: v as Specialization,
                  }))
                }
              >
                <SelectTrigger
                  id="teacher-spec"
                  className="bg-secondary border-border"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THEORY">
                    {t('teachers.spec_theory')}
                  </SelectItem>
                  <SelectItem value="PRACTICE">
                    {t('teachers.spec_practice')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Only cross-branch roles pick a branch; a manager/operator's
                branch is fixed by their JWT and the backend auto-assigns it
                (assertBranchScope). GET /branches is owner/dev-only, so showing
                this Select to a manager rendered an empty, un-fillable dropdown
                that blocked adding a teacher. */}
            <RoleGate cap="assignBranch">
              <div className="space-y-2">
                <Label htmlFor="teacher-branch">{t('teachers.branch')}</Label>
                <Select
                  value={form.branchId}
                  onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
                >
                  <SelectTrigger
                    id="teacher-branch"
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
            </RoleGate>
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

export default TeachersPage;
