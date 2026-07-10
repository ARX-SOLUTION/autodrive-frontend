import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  useGroups,
  useGroupsOverview,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useGroupsById,
} from '@/services/groupService';
import { useUpdateStudent } from '@/services/studentService';
import { useOperators } from '@/services/operatorService';
import { useBranches } from '@/services/branchService';
import { Group } from '@/types/group';
import { Student } from '@/types/student';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import StudentModal, {
  CreateStudentPayload,
} from '@/components/ui/StudentModal';
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
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
  ChevronUp,
  ChevronsUpDown,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/ui/PaginationControls';
import { useAuthStore } from '@/store/authStore';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';

const formatDate = (d: string) => {
  try {
    return format(new Date(d), 'dd.MM.yyyy');
  } catch {
    return d;
  }
};

const formatMoney = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);

const GroupsPage = () => {
  const { t } = useTranslation();
  const {
    data: groups,
    isLoading,
    isError: isGroupsError,
    refetch: refetchGroups,
  } = useGroups();
  const { data: overview } = useGroupsOverview();
  const { data: branches } = useBranches();
  const { data: operators } = useOperators();
  const createMutation = useCreateGroup();
  const updateMutation = useUpdateGroup();
  const deleteMutation = useDeleteGroup();
  const updateStudentMutation = useUpdateStudent();
  const isOwner = useAuthStore((s) => s.isOwner);

  const [search, setSearch] = useState('');
  const [courseTypeFilter, setCourseTypeFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedBranches, setExpandedBranches] = useState<
    Record<string, boolean>
  >({});
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  const [formName, setFormName] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formCourseType, setFormCourseType] = useState<string>('avto_maktab');

  const branchList = branches || [];

  const {
    data: groupData,
    isLoading: groupsByIdLoading,
    isError: isGroupDetailError,
    refetch: refetchGroupDetail,
  } = useGroupsById({
    id: detailGroup?.id || '',
  });

  const filteredGroups = (groups || []).filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchesCourseType =
      courseTypeFilter === 'all' || g.course_type === courseTypeFilter;
    return matchesSearch && matchesCourseType;
  });

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedGroups = [...filteredGroups].sort((a, b) => {
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

  const {
    currentPage,
    totalPages,
    paginatedItems: filtered,
    setCurrentPage,
  } = usePagination(sortedGroups);

  const openCreate = () => {
    setEditGroup(null);
    setFormName('');
    setFormBranchId('');
    setFormCourseType('avto_maktab');
    setModalOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditGroup(g);
    setFormName(g.name);
    setFormBranchId(g.branch_id);
    setFormCourseType(g.course_type);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBranchId) return;

    const payload = {
      name: formName,
      branchId: formBranchId,
      courseType: formCourseType,
    };

    if (editGroup) {
      updateMutation.mutate(
        { id: editGroup.id, ...payload },
        {
          onSuccess: () => {
            toast.success(t('groups.updated'));
            setModalOpen(false);
          },
          onError: () => toast.error(t('common.error')),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(t('groups.added'));
          setModalOpen(false);
        },
        onError: () => toast.error(t('common.error')),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t('groups.deleted'));
        setDeleteId(null);
      },
      onError: () => toast.error(t('common.error')),
    });
  };

  const handleStudentEdit = (data: CreateStudentPayload) => {
    if (!editStudent) return;
    updateStudentMutation.mutate(
      { id: editStudent.id, ...data } as Parameters<
        typeof updateStudentMutation.mutate
      >[0],
      {
        onSuccess: () => {
          toast.success(t('students.updated'));
          setEditStudent(null);
        },
        onError: () => toast.error(t('common.error')),
      },
    );
  };

  const toggleBranch = (id: string) =>
    setExpandedBranches((prev) => ({ ...prev, [id]: !prev[id] }));

  const getBranchName = (branchId: string) =>
    branchList.find((b) => b.id === branchId)?.name || branchId;

  const startIndex = (currentPage - 1) * 10;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            {t('groups.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('groups.count', { count: (groups || []).length })}
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t('groups.add')}
        </Button>
      </div>

      {/* Overview */}
      {overview && overview.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-heading text-sm font-semibold text-muted-foreground text-balance">
            {t('groups.by_branch')}
          </h2>
          <div className="space-y-2">
            {overview.map((ov) => (
              <div key={ov.branch_id} className="glass-card overflow-hidden">
                <button
                  onClick={() => toggleBranch(ov.branch_id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                >
                  <span className="font-medium">
                    {ov.branch_name}{' '}
                    <span className="text-muted-foreground text-sm">
                      {t('groups.group_count', { count: ov.groups.length })}
                    </span>
                  </span>
                  {expandedBranches[ov.branch_id] ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedBranches[ov.branch_id] && (
                  <div className="border-t border-border px-4 py-2 space-y-1">
                    {ov.groups.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{g.name}</span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${g.course_type === 'avto_maktab' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'}`}
                          >
                            {g.course_type === 'avto_maktab'
                              ? t('groups.course_school')
                              : t('groups.course_fast')}
                          </span>
                          <span className="text-muted-foreground">
                            {g.active_students}{' '}
                            {t('groups.student_count').toLowerCase()}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${g.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
                        >
                          {g.is_active
                            ? t('common.active')
                            : t('common.inactive')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('groups.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <Select value={courseTypeFilter} onValueChange={setCourseTypeFilter}>
          <SelectTrigger className="w-[180px] bg-secondary border-border">
            <SelectValue placeholder={t('groups.course_type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('groups.all')}</SelectItem>
            <SelectItem value="tezkor">{t('groups.course_fast')}</SelectItem>
            <SelectItem value="avto_maktab">
              {t('groups.course_school')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
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
                    {t('groups.name')}
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
                  {t('common.branch')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  <button
                    onClick={() => toggleSort('course_type')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                  >
                    {t('groups.course_type')}
                    {sortField === 'course_type' ? (
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
                  {t('groups.student_count')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  {t('common.status')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('groups.created')}
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
                : filtered.map((g, idx) => (
                    <tr
                      key={g.id}
                      className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/10"
                      onClick={() => setDetailGroup(g)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setDetailGroup(g);
                        if (e.key === ' ') {
                          e.preventDefault();
                          setDetailGroup(g);
                        }
                      }}
                    >
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {startIndex + idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium">{g.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {g.branch_name || getBranchName(g.branch_id)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${g.course_type === 'avto_maktab' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'}`}
                        >
                          {g.course_type === 'avto_maktab'
                            ? t('groups.course_school')
                            : t('groups.course_fast')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {g.active_students}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${g.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
                        >
                          {g.is_active
                            ? t('common.active')
                            : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {formatDate(g.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            aria-label={t('groups.view')}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailGroup(g);
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            aria-label={t('common.edit')}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(g);
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {isOwner() && (
                            <button
                              aria-label={t('common.delete')}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(g.id);
                              }}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
            : filtered.map((g) => (
                <DataCard
                  key={g.id}
                  title={g.name}
                  subtitle={g.branch_name || getBranchName(g.branch_id)}
                  onClick={() => setDetailGroup(g)}
                  fields={[
                    {
                      label: t('groups.course_type'),
                      value:
                        g.course_type === 'avto_maktab'
                          ? t('groups.course_school')
                          : t('groups.course_fast'),
                    },
                    {
                      label: t('groups.student_count'),
                      value: g.active_students,
                    },
                    {
                      label: t('groups.created'),
                      value: formatDate(g.created_at),
                    },
                    {
                      label: t('common.status'),
                      value: g.is_active
                        ? t('common.active')
                        : t('common.inactive'),
                    },
                  ]}
                  actions={
                    <>
                      <button
                        aria-label={t('common.edit')}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(g);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {isOwner() && (
                        <button
                          aria-label={t('common.delete')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(g.id);
                          }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  }
                />
              ))}
        </div>
        {isGroupsError ? (
          <EmptyState
            title={t('common.error')}
            action={{
              label: t('common.retry'),
              onClick: () => refetchGroups(),
            }}
          />
        ) : (
          filteredGroups.length === 0 &&
          !isLoading && (
            <EmptyState icon={Layers} title={t('groups.not_found')} />
          )
        )}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Group Detail Modal */}
      <Dialog
        open={!!detailGroup}
        onOpenChange={(o) => !o && setDetailGroup(null)}
      >
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {detailGroup?.name} &mdash; {t('students.title')}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (
                {detailGroup?.course_type === 'avto_maktab'
                  ? t('groups.course_school')
                  : t('groups.course_fast')}{' '}
                &middot;{' '}
                {detailGroup?.branch_name ||
                  getBranchName(detailGroup?.branch_id || '')}
                )
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                    {t('students.last_name')}
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                    {t('students.first_name')}
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                    {t('students.phone')}
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-muted-foreground">
                    {t('students.total_price')}
                  </th>
                  {detailGroup?.course_type === 'tezkor' ? (
                    <th className="px-3 py-3 text-right font-medium text-muted-foreground">
                      {t('students.amount_paid')}
                    </th>
                  ) : (
                    <th className="px-3 py-3 text-right font-medium text-muted-foreground">
                      {t('students.initial_payment')}
                    </th>
                  )}
                  <th className="px-3 py-3 text-right font-medium text-muted-foreground">
                    {t('students.debt')}
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                    {t('students.payment_method')}
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                    {t('students.document')}
                  </th>
                  {detailGroup?.course_type === 'avto_maktab' && (
                    <>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                        O83
                      </th>
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                        {t('students.contract_number')}
                      </th>
                    </>
                  )}
                  <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                    {t('students.result')}
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                    {t('students.operator')}
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                    {t('common.date')}
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupsByIdLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={15} className="p-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : isGroupDetailError ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-3 text-sm text-destructive">
                        <span>{t('common.error')}</span>
                        <Button
                          variant="link"
                          className="h-auto p-0"
                          onClick={() => refetchGroupDetail()}
                        >
                          {t('common.retry')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : !groupData?.students?.length ? (
                  <tr>
                    <td
                      colSpan={15}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {t('students.not_found')}
                    </td>
                  </tr>
                ) : (
                  groupData?.students?.map((s, idx) => (
                    <tr
                      key={s.id}
                      className="table-row-striped border-b border-border/50"
                    >
                      <td className="px-3 py-3 text-center text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3 font-medium">{s?.last_name}</td>
                      <td className="px-3 py-3">{s?.first_name}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {s?.phone}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatMoney(s?.total_price)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {detailGroup?.course_type === 'tezkor'
                          ? formatMoney(s?.amount_paid || 0)
                          : formatMoney(s?.initial_payment || 0)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={
                            s?.debt > 0 ? 'text-destructive' : 'text-success'
                          }
                        >
                          {s?.debt > 0 ? formatMoney(s?.debt) : t('common.na')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">
                        {s?.payment_method === 'naqd'
                          ? t('students.payment_cash')
                          : s?.payment_method === 'karta'
                            ? t('students.payment_card')
                            : t('students.payment_transfer')}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={
                            s?.has_document
                              ? 'text-success'
                              : 'text-destructive'
                          }
                        >
                          {s?.has_document ? '+' : '-'}
                        </span>
                      </td>
                      {detailGroup?.course_type === 'avto_maktab' && (
                        <>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={
                                s?.o83 ? 'text-success' : 'text-destructive'
                              }
                            >
                              {s?.o83 ? '+' : '-'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {s?.contract_number || t('common.na')}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-3 text-center">
                        {s?.result === 'topshirdi' ? (
                          <span className="text-success">{'\u2713'}</span>
                        ) : s?.result === 'yiqildi' ? (
                          <span className="text-destructive">{'\u2717'}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {t('common.na')}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {s?.registered_by || t('common.na')}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground tabular-nums">
                        {formatDate(s?.created_at)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => setEditStudent(s)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('groups.total_students', {
              count: groupData?.active_students || 0,
            })}
          </p>
        </DialogContent>
      </Dialog>

      {/* Student Edit Modal (from group detail) */}
      <StudentModal
        open={!!editStudent}
        onClose={() => setEditStudent(null)}
        onSubmit={handleStudentEdit}
        loading={updateStudentMutation.isPending}
        student={editStudent}
        courseType={detailGroup?.course_type || 'avto_maktab'}
        operators={operators || []}
        disabledFields={[
          'total_price',
          'payment_method',
          'initial_payment',
          'debt',
        ]}
      />

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editGroup ? t('groups.edit') : t('groups.add')}
            </DialogTitle>
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
                  {branchList.map((b) => (
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
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default GroupsPage;
