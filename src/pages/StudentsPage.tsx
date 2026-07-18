/* eslint-disable react-refresh/only-export-components */

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useCan, useIsCrossTenant } from '@/hooks/useCan';
import { useDebounce } from '@/hooks/useDebounce';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import {
  fetchAllStudents,
  useStudentsPage,
  useCreateStudent,
  useCreateStudentWithPayment,
  useUpdateStudent,
  useDeleteStudent,
  toLocalDateStr,
} from '@/services/studentService';
import { useBranches } from '@/services/branchService';
import { useOperators } from '@/services/operatorService';
import { CourseType, Student, StudentStatus } from '@/types/student';
import { type CreateStudentPayload } from '@/components/ui/StudentModal';
import { type AddStudentPayload } from '@/components/ui/AddStudentDialog';
import { CircleNotch } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import PaginationControls from '@/components/ui/PaginationControls';
import { extractErrorMessage } from '@/lib/errors';
import { formatPhone } from '@/lib/phoneFormater';
import { StudentsPageHeader } from './students/StudentsPageHeader';
import { StudentsFilterBar } from './students/StudentsFilterBar';
import { StudentsTable } from './students/StudentsTable';
import { StudentsMobileList } from './students/StudentsMobileList';
import { StudentsDialogs } from './students/StudentsDialogs';

export { formatDate, formatDateTime } from './students/studentsFormat';

const StudentsPage = () => {
  const { t } = useTranslation();
  const isCrossTenant = useIsCrossTenant();
  const canManageStaff = useCan('manageStaff');
  const canManageStudents = useCan('manageStudents');
  const user = useAuthStore((s) => s.user);

  // Filter state lives in the URL so reload / share / bookmark preserves
  // it (ROADMAP §2.2). `searchParams` is the source of truth; each
  // setter rewrites the URL and React-Router re-renders. `replace: true`
  // keeps the browser-history short — every keystroke in the search box
  // would otherwise push a history entry.
  const [searchParams, setSearchParams] = useSearchParams();
  const goToStudent = useViewTransitionNavigate();
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

  const rawDateTo = searchParams.get('date_to');
  const dateTo = useMemo(
    () => (rawDateTo ? new Date(rawDateTo) : undefined),
    [rawDateTo],
  );

  // date_from/date_to must land in the same setSearchParams call — two
  // sequential calls each snapshot `prev` independently and the second
  // overwrites the first's write (autodrive-6cq.5.70).
  const setDateRange = (from: Date | undefined, to: Date | undefined) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!from) next.delete('date_from');
        else next.set('date_from', toLocalDateStr(from));
        if (!to) next.delete('date_to');
        else next.set('date_to', toLocalDateStr(to));
        return next;
      },
      { replace: true },
    );

  const operatorId = searchParams.get('operator_id') ?? undefined;
  const setOperatorId = (v: string | undefined) => setParam('operator_id', v);

  const hasGroup = searchParams.get('has_group')
    ? searchParams.get('has_group') === 'true'
    : undefined;
  const setHasGroup = (v: boolean | undefined) =>
    setParam('has_group', v === undefined ? undefined : String(v));

  // Dashboard drill-through filters (autodrive-ls5) — no UI control, just
  // consumed from the URL when navigated to with a status/debt context.
  const status = (searchParams.get('status') as StudentStatus) || undefined;
  const hasDebt = searchParams.get('has_debt')
    ? searchParams.get('has_debt') === 'true'
    : undefined;
  const referredByUserId = searchParams.get('referred_by_user_id') ?? undefined;
  const referredByStudentId =
    searchParams.get('referred_by_student_id') ?? undefined;

  // Local-only state (modal + sort UX — not worth persisting).
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  // One add flow, two modes: quick (StudentModal) vs detailed (AddStudentDialog).
  const [detailed, setDetailed] = useState(false);
  // Switching modes mid-entry unmounts the current form -- block it once
  // the user has actually typed something, instead of silently discarding.
  const [createFormDirty, setCreateFormDirty] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [isExporting, setIsExporting] = useState(false);

  // Page in the URL too (like every other filter here) so refresh/share
  // preserves it instead of silently resetting to page 1.
  const currentPage = Number(searchParams.get('page')) || 1;
  const setCurrentPage = (p: number) =>
    setParam('page', p > 1 ? String(p) : undefined);

  const debouncedSearch = useDebounce(search, 300);

  const { data: branches } = useBranches();
  const { data: operators } = useOperators();

  const SERVER_PAGE_SIZE = 50;

  const {
    data: studentsPage,
    isLoading: isStudentsLoading,
    isFetching,
    isError: isStudentsError,
    refetch: refetchStudents,
  } = useStudentsPage(
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
      status,
      hasDebt,
      hasGroup,
      referredByUserId,
      referredByStudentId,
    },
  );

  // setCurrentPage is a fresh closure each render (derived from setParam,
  // which useUrlParams doesn't memoize) -- adding it here would fire this
  // effect on every render instead of only on an actual filter change.
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    courseType,
    branchId,
    operatorId,
    debouncedSearch,
    dateFrom,
    dateTo,
    sortField,
    sortDir,
    status,
    hasDebt,
    hasGroup,
    referredByUserId,
    referredByStudentId,
  ]);

  const isLoading = isStudentsLoading;
  const sorted = studentsPage?.data ?? [];
  const totalStudents = studentsPage?.meta.total ?? sorted.length;
  const serverTotalPages = Math.max(1, studentsPage?.meta.totalPages ?? 1);

  const createMutation = useCreateStudent();
  const createWithPaymentMutation = useCreateStudentWithPayment();
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
    } catch (err) {
      toast.error(extractErrorMessage(err, t('common.error')));
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
      onError: (err) =>
        toast.error(extractErrorMessage(err, t('common.error'))),
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
          onError: (err) =>
            toast.error(extractErrorMessage(err, t('common.error'))),
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success(t('students.added'));
          closeModal();
        },
        onError: (err) =>
          toast.error(extractErrorMessage(err, t('common.error'))),
      });
    }
  };

  // ponytail: separate handler — no closeModal, so the modal stays open for next entry
  const handleSaveAndAdd = (data: CreateStudentPayload) => {
    createMutation.mutate(data, {
      onSuccess: () => toast.success(t('students.added')),
      onError: (err) =>
        toast.error(extractErrorMessage(err, t('common.error'))),
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditStudent(null);
    setCreateFormDirty(false);
  };

  const closeAddFlow = () => {
    setModalOpen(false);
    setDetailed(false);
    setCreateFormDirty(false);
  };

  const handleAddStudentDialogSubmit = (data: AddStudentPayload) => {
    createWithPaymentMutation.mutate(data, {
      onSuccess: () => {
        toast.success(t('students.added'));
        closeAddFlow();
      },
      onError: (err) =>
        toast.error(extractErrorMessage(err, t('common.error'))),
    });
  };

  const openEdit = (s: Student) => {
    setEditStudent(s);
    setDetailed(false);
    setCreateFormDirty(false);
    setModalOpen(true);
  };
  const openCreate = () => {
    setEditStudent(null);
    setDetailed(false);
    setCreateFormDirty(false);
    setModalOpen(true);
  };

  const openStudent = (s: Student, el: HTMLElement) =>
    goToStudent(`/students/${s.id}`, el, `student-${s.id}`);

  const startIndex = (currentPage - 1) * SERVER_PAGE_SIZE;

  return (
    <div className="space-y-6">
      <StudentsPageHeader
        totalStudents={totalStudents}
        isExporting={isExporting}
        onExport={exportToExcel}
        canManageStudents={canManageStudents}
        onCreate={openCreate}
      />

      <StudentsFilterBar
        courseType={courseType}
        setCourseType={setCourseType}
        isCrossTenant={isCrossTenant}
        canManageStaff={canManageStaff}
        branchId={branchId}
        setBranchId={setBranchId}
        branches={branches || []}
        operatorId={operatorId}
        setOperatorId={setOperatorId}
        operators={operators || []}
        userBranchId={user?.branch_id}
        hasGroup={hasGroup}
        setHasGroup={setHasGroup}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setDateRange={setDateRange}
        search={search}
        setSearch={setSearch}
      />

      {/* Table */}
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
          <StudentsTable
            students={sorted}
            isLoading={isLoading}
            isError={isStudentsError}
            onRetry={() => refetchStudents()}
            totalStudents={totalStudents}
            startIndex={startIndex}
            courseType={courseType}
            sortField={sortField}
            sortDir={sortDir}
            toggleSort={toggleSort}
            canManageStudents={canManageStudents}
            isCrossTenant={isCrossTenant}
            onOpenStudent={openStudent}
            onEdit={openEdit}
            onDelete={setDeleteId}
          />

          <StudentsMobileList
            students={sorted}
            isLoading={isLoading}
            isError={isStudentsError}
            onRetry={() => refetchStudents()}
            canManageStudents={canManageStudents}
            isCrossTenant={isCrossTenant}
            onOpenStudent={openStudent}
            onEdit={openEdit}
            onDelete={setDeleteId}
          />
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={serverTotalPages}
        onPageChange={setCurrentPage}
      />

      <StudentsDialogs
        students={sorted}
        courseType={courseType}
        branchId={branchId}
        operators={operators || []}
        modalOpen={modalOpen}
        detailed={detailed}
        setDetailed={setDetailed}
        editStudent={editStudent}
        createFormDirty={createFormDirty}
        setCreateFormDirty={setCreateFormDirty}
        onModalClose={closeModal}
        onModalSubmit={handleModalSubmit}
        onSaveAndAdd={handleSaveAndAdd}
        modalLoading={createMutation.isPending || updateMutation.isPending}
        onAddFlowClose={closeAddFlow}
        onAddStudentSubmit={handleAddStudentDialogSubmit}
        addFlowLoading={createWithPaymentMutation.isPending}
        deleteId={deleteId}
        onDeleteCancel={() => setDeleteId(null)}
        onDeleteConfirm={handleDelete}
        deleteLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default StudentsPage;
