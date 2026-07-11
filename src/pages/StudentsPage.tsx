/* eslint-disable react-refresh/only-export-components */

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useCan, useIsCrossTenant } from '@/hooks/useCan';
import { useDebounce } from '@/hooks/useDebounce';
import {
  fetchAllStudents,
  useStudentsPage,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  toLocalDateStr,
} from '@/services/studentService';
import { useBranches } from '@/services/branchService';
import { useOperators } from '@/services/operatorService';
import { CourseType, Student } from '@/types/student';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import StudentModal, {
  type CreateStudentPayload,
} from '@/components/ui/StudentModal';
import ImportStudentsModal from '@/components/ui/ImportStudentsModal';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  CalendarIcon,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  GraduationCap,
  Download,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import PaginationControls from '@/components/ui/PaginationControls';
import { formatPhone } from '@/lib/phoneFormater';

const formatMoney = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);
const capitalize = (str?: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

export const formatDate = (d?: string) => {
  try {
    if (!d) return '—';
    const date = new Date(d);
    return format(date, 'dd.MM.yyyy');
  } catch {
    return d;
  }
};

export const formatDateTime = (d: string) => {
  try {
    if (!d) return '—';
    return format(new Date(d), 'dd.MM.yyyy HH:mm:ss');
  } catch {
    return d;
  }
};

const StudentsPage = () => {
  const { t } = useTranslation();
  const isCrossTenant = useIsCrossTenant();
  const canManageStaff = useCan('manageStaff');
  const user = useAuthStore((s) => s.user);

  // Filter state lives in the URL so reload / share / bookmark preserves
  // it (ROADMAP §2.2). `searchParams` is the source of truth; each
  // setter rewrites the URL and React-Router re-renders. `replace: true`
  // keeps the browser-history short — every keystroke in the search box
  // would otherwise push a history entry.
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const setParam = (key: string, value: string | undefined) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  const courseType = (searchParams.get('course_type') ??
    'tezkor') as CourseType;
  const setCourseType = (v: CourseType) =>
    setParam('course_type', v === 'tezkor' ? undefined : v);

  const defaultBranchId = isCrossTenant
    ? undefined
    : user?.branch_id || undefined;
  const branchId = searchParams.get('branch_id') ?? defaultBranchId;
  const setBranchId = (v: string | undefined) => setParam('branch_id', v);

  const search = searchParams.get('q') ?? '';
  const setSearch = (v: string) => setParam('q', v || undefined);

  const rawDateFrom = searchParams.get('date_from');
  const dateFrom = useMemo(
    () => (rawDateFrom ? new Date(rawDateFrom) : undefined),
    [rawDateFrom],
  );
  const setDateFrom = (v: Date | undefined) =>
    setParam('date_from', v ? toLocalDateStr(v) : undefined);

  const rawDateTo = searchParams.get('date_to');
  const dateTo = useMemo(
    () => (rawDateTo ? new Date(rawDateTo) : undefined),
    [rawDateTo],
  );
  const setDateTo = (v: Date | undefined) =>
    setParam('date_to', v ? toLocalDateStr(v) : undefined);

  const operatorId = searchParams.get('operator_id') ?? undefined;
  const setOperatorId = (v: string | undefined) => setParam('operator_id', v);

  // Local-only state (modal + sort UX — not worth persisting).
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const { data: branches } = useBranches();
  const { data: operators } = useOperators();

  const SERVER_PAGE_SIZE = 50;

  const { data: studentsPage, isLoading: isStudentsLoading } = useStudentsPage(
    courseType,
    branchId,
    currentPage,
    SERVER_PAGE_SIZE,
    operatorId,
    {
      search: debouncedSearch,
      dateFrom,
      dateTo,
      sortBy: sortField,
      sortOrder: sortDir,
    },
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    courseType,
    branchId,
    operatorId,
    debouncedSearch,
    dateFrom,
    dateTo,
    sortField,
    sortDir,
  ]);

  const isLoading = isStudentsLoading;
  const sorted = studentsPage?.data ?? [];
  const totalStudents = studentsPage?.meta.total ?? sorted.length;
  const serverTotalPages = Math.max(1, studentsPage?.meta.totalPages ?? 1);

  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const exportRows = await fetchAllStudents({
        courseType,
        branchId,
        operatorId,
        search: debouncedSearch,
        dateFrom,
        dateTo,
        sortBy: sortField,
        sortOrder: sortDir,
      });
      const rows = exportRows.map((s, idx) => ({
        '#': idx + 1,
        [t('students.first_name')]: s.first_name,
        [t('students.last_name')]: s.last_name,
        [t('students.phone')]: formatPhone(s.phone),
        [t('students.course_fast')]:
          s.course_type === 'tezkor'
            ? t('students.course_fast')
            : t('students.course_school'),
        [t('common.branch')]: s.branch_name ?? t('common.na'),
        [t('students.group')]: s.group_name ?? t('common.na'),
        [t('students.total_price')]: s.total_price,
        [t('students.debt')]: s.debt,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('students.title'));
      XLSX.writeFile(wb, `talabalar_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t('students.deleted'));
        setDeleteId(null);
      },
      onError: () => toast.error(t('common.error')),
    });
  };

  const handleModalSubmit = (data: CreateStudentPayload) => {
    if (editStudent) {
      updateMutation.mutate(
        { ...data, id: editStudent.id },
        {
          onSuccess: () => {
            toast.success(t('students.updated'));
            closeModal();
          },
          onError: () => toast.error(t('common.error')),
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success(t('students.added'));
          closeModal();
        },
        onError: () => toast.error(t('common.error')),
      });
    }
  };

  // ponytail: separate handler — no closeModal, so the modal stays open for next entry
  const handleSaveAndAdd = (data: CreateStudentPayload) => {
    createMutation.mutate(data, {
      onSuccess: () => toast.success(t('students.added')),
      onError: () => toast.error(t('common.error')),
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditStudent(null);
  };

  const openEdit = (s: Student) => {
    setEditStudent(s);
    setModalOpen(true);
  };
  const openCreate = () => {
    setEditStudent(null);
    setModalOpen(true);
  };

  const startIndex = (currentPage - 1) * SERVER_PAGE_SIZE;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            {t('students.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('students.count', { count: totalStudents })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={exportToExcel}
            disabled={totalStudents === 0 || isExporting}
          >
            <Download className="h-4 w-4" /> {t('students.export_excel')}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setImportModalOpen(true)}
          >
            <UploadCloud className="h-4 w-4" />{' '}
            {t('students.import.button_label')}
          </Button>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t('students.add')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={courseType}
          onValueChange={(v) => setCourseType(v as CourseType)}
        >
          <TabsList className="bg-secondary">
            <TabsTrigger value="tezkor">
              {t('students.course_fast')}
            </TabsTrigger>
            <TabsTrigger value="avto_maktab">
              {t('students.course_school')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {isCrossTenant && (
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => setBranchId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder={t('common.branch')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {(branches || []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Operator filter — owner va manager uchun */}
        {canManageStaff && (operators || []).length > 0 && (
          <Select
            value={operatorId || 'all'}
            onValueChange={(v) => setOperatorId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-44 bg-secondary border-border">
              <SelectValue placeholder={t('students.operator')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all_operators')}</SelectItem>
              {(operators || [])
                .filter(
                  (op) => isCrossTenant || op.branch_id === user?.branch_id,
                )
                .map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.name || op.email}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}

        {/* Date filter — single or range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'min-w-[220px] justify-start text-left font-normal bg-secondary border-border',
                !dateFrom && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {!dateFrom
                ? t('students.date_range')
                : dateTo && dateTo.getTime() !== dateFrom.getTime()
                  ? `${format(dateFrom, 'dd.MM.yyyy')} \u2192 ${format(dateTo, 'dd.MM.yyyy')}`
                  : format(dateFrom, 'dd.MM.yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 max-w-[calc(100vw-2rem)] overflow-x-auto"
            align="start"
          >
            <Calendar
              mode="range"
              selected={{ from: dateFrom, to: dateTo }}
              onSelect={(range) => {
                if (!range) {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                } else {
                  setDateFrom(range.from);
                  setDateTo(range.to ?? range.from);
                }
              }}
              numberOfMonths={2}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom(undefined);
              setDateTo(undefined);
            }}
          >
            {t('students.clear_filters')}
          </Button>
        )}

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('students.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('last_name')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {t('students.last_name')}
                      {sortField === 'last_name' ? (
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
                      onClick={() => toggleSort('first_name')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {t('students.first_name')}
                      {sortField === 'first_name' ? (
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
                    {t('students.phone')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('total_price')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    >
                      {t('students.total_price')}
                      {sortField === 'total_price' ? (
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
                  {courseType === 'tezkor' ? (
                    <>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        {t('students.payment')}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        <button
                          onClick={() => toggleSort('debt')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                        >
                          {t('students.debt')}
                          {sortField === 'debt' ? (
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
                        {t('students.payment_method')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t('students.group')}
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        {t('students.document')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t('students.operator')}
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        {t('students.result')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t('students.notes')}
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        {t('students.initial_payment')}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        2-{t('students.payment').toLowerCase()}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        3-{t('students.payment').toLowerCase()}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        <button
                          onClick={() => toggleSort('debt')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                        >
                          {t('students.debt')}
                          {sortField === 'debt' ? (
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
                        {t('students.payment_method')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t('students.group')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t('students.completion_date')}
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        {t('students.o83')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t('students.contract_number')}
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        {t('students.document')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t('students.operator')}
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        {t('students.result')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t('students.notes')}
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('created_at')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {t('common.date')}
                      {sortField === 'created_at' ? (
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
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td colSpan={16} className="p-4">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      </tr>
                    ))
                  : sorted?.map((s, idx) => (
                      <tr
                        key={s.id}
                        className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => {
                          if (window.getSelection()?.toString()) return;
                          navigate(`/students/${s.id}`);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') navigate(`/students/${s.id}`);
                          if (e.key === ' ') {
                            e.preventDefault();
                            navigate(`/students/${s.id}`);
                          }
                        }}
                      >
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {startIndex + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {capitalize(s.last_name)}
                        </td>
                        <td className="px-4 py-3">
                          {capitalize(s.first_name)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatPhone(s.phone)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(s.total_price)}
                        </td>
                        {courseType === 'tezkor' ? (
                          <>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatMoney(s.amount_paid || 0)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={
                                  s.debt > 0
                                    ? 'text-destructive'
                                    : 'text-success'
                                }
                              >
                                {s.debt > 0
                                  ? formatMoney(s.debt)
                                  : t('common.na')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs">
                              {s.payment_method === 'naqd'
                                ? t('students.payment_cash')
                                : s.payment_method === 'karta'
                                  ? t('students.payment_card')
                                  : t('students.payment_transfer')}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {s.group_name || t('common.na')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={
                                  s.has_document
                                    ? 'text-success'
                                    : 'text-destructive'
                                }
                              >
                                {s.has_document ? '+' : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {s.registered_by}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {s.result}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground max-w-[120px] truncate">
                              {s.notes}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatMoney(s.initial_payment || 0)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatMoney(s.second_payment || 0)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatMoney(s.third_payment || 0)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={
                                  s.debt > 0
                                    ? 'text-destructive'
                                    : 'text-success'
                                }
                              >
                                {s.debt > 0
                                  ? formatMoney(s.debt)
                                  : t('common.na')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs">
                              {s.payment_method === 'naqd'
                                ? t('students.payment_cash')
                                : s.payment_method === 'karta'
                                  ? t('students.payment_card')
                                  : t('students.payment_transfer')}
                            </td>
                            <td className="px-4 py-3">{s.group_name}</td>
                            <td className="px-4 py-3 text-muted-foreground tabular-nums">
                              {formatDate(s.completion_date)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={
                                  s.o83 ? 'text-success' : 'text-destructive'
                                }
                              >
                                {s.o83 ? '+' : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {s.contract_number}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={
                                  s.has_document
                                    ? 'text-success'
                                    : 'text-destructive'
                                }
                              >
                                {s.has_document ? '+' : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {s.registered_by}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {s.result}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground max-w-[120px] truncate">
                              {s.notes}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                          {formatDateTime(s.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(s);
                              }}
                              aria-label={t('common.edit')}
                              title={t('common.edit')}
                              className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {isCrossTenant && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(s.id);
                                }}
                                aria-label={t('common.delete')}
                                title={t('common.delete')}
                                className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                {!isLoading && totalStudents === 0 && (
                  <tr>
                    <td colSpan={16} className="p-0">
                      <EmptyState
                        icon={GraduationCap}
                        title={t('students.not_found')}
                        description={t('students.not_found_desc')}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-3 md:hidden p-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))
          ) : sorted && sorted.length > 0 ? (
            sorted.map((s) => {
              const fields = [
                {
                  label: t('students.detail.branch'),
                  value: s.branch_name || t('common.na'),
                },
                {
                  label: t('students.detail.group'),
                  value: s.group_name ?? t('common.na'),
                },
                {
                  label: t('students.detail.course'),
                  value:
                    s.course_type === 'tezkor'
                      ? t('students.course_fast')
                      : t('students.course_school'),
                },
                {
                  label: t('students.detail.debt'),
                  value: (
                    <span
                      className={
                        s.debt > 0 ? 'text-destructive' : 'text-success'
                      }
                    >
                      {s.debt > 0 ? formatMoney(s.debt) : t('common.na')}
                    </span>
                  ),
                },
                {
                  label: t('students.detail.status'),
                  value: s.result || t('common.na'),
                },
                {
                  label: t('students.detail.date'),
                  value: formatDate(s.created_at),
                },
              ];
              return (
                <DataCard
                  key={s.id}
                  title={`${capitalize(s.first_name)} ${capitalize(s.last_name)}`}
                  subtitle={formatPhone(s.phone)}
                  fields={fields}
                  onClick={() => navigate(`/students/${s.id}`)}
                  actions={
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(s);
                        }}
                        aria-label={t('common.edit')}
                        title={t('common.edit')}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {isCrossTenant && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(s.id);
                          }}
                          aria-label={t('common.delete')}
                          title={t('common.delete')}
                          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  }
                />
              );
            })
          ) : (
            <EmptyState
              icon={GraduationCap}
              title={t('students.not_found')}
              description={t('students.not_found_desc')}
            />
          )}
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={serverTotalPages}
        onPageChange={setCurrentPage}
      />

      <StudentModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        onSaveAndAdd={!editStudent ? handleSaveAndAdd : undefined}
        loading={createMutation.isPending || updateMutation.isPending}
        student={editStudent}
        courseType={courseType}
        operators={operators || []}
        defaultBranchId={branchId}
      />

      <ImportStudentsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        branchId={branchId}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default StudentsPage;
