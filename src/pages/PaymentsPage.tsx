import { useTranslation } from 'react-i18next';
import PaginationControls from '@/components/ui/PaginationControls';
import PaymentModal, {
  CreatePaymentPayload,
} from '@/components/ui/PaymentModal';
import { useDebounce } from '@/hooks/useDebounce';
import { useCan, useIsCrossTenant } from '@/hooks/useCan';
import { useUrlParams } from '@/hooks/useUrlParams';
import { cn } from '@/lib/utils';
import { mutationErrorToast } from '@/lib/mutationErrorToast';
import { EmptyState } from '@/components/ui/EmptyState';
import { useBranches } from '@/services/branchService';
import {
  useCreatePayment,
  usePaymentsPage,
  usePaymentSnapshot,
  usePaymentSummary,
} from '@/services/paymentService';
import { toLocalDateStr } from '@/services/studentService';
import { useAuthStore } from '@/store/authStore';
import { CircleNotch } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { presetRange, type DatePreset } from './payments/dateRangePresets';
import { exportPaymentsToExcel } from './payments/exportPayments';
import { PaymentPeriodSummary } from './payments/PaymentPeriodSummary';
import { PaymentSnapshotCards } from './payments/PaymentSnapshotCards';
import { PaymentsFilterBar } from './payments/PaymentsFilterBar';
import { PaymentsMobileList } from './payments/PaymentsMobileList';
import { PaymentsPageHeader } from './payments/PaymentsPageHeader';
import { PaymentsTable } from './payments/PaymentsTable';

const PaymentsPage = () => {
  const { t } = useTranslation();
  const isCrossTenant = useIsCrossTenant();
  const canRecordPayment = useCan('recordPayment');
  const user = useAuthStore((s) => s.user);

  // Filters/sort/page live in the URL so reload / back / share preserves
  // them (autodrive-6cq.5.8) — same setParam/setParams pattern as
  // StudentsPage (src/hooks/useUrlParams.ts).
  const { searchParams, setParam, setParams } = useUrlParams();

  const defaultBranchId = isCrossTenant
    ? undefined
    : user?.branch_id || undefined;
  const branchId = searchParams.get('branch_id') ?? defaultBranchId;
  const setBranchId = (v: string | undefined) => setParam('branch_id', v);

  const search = searchParams.get('q') ?? '';
  const setSearch = (v: string) => setParam('q', v || undefined);

  const [modalOpen, setModalOpen] = useState(false);

  const paymentStatus = searchParams.get('status') ?? 'all';
  const setPaymentStatus = (v: string) =>
    setParam('status', v === 'all' ? undefined : v);

  const paymentMethodFilter = searchParams.get('method') ?? 'all';
  const setPaymentMethodFilter = (v: string) =>
    setParam('method', v === 'all' ? undefined : v);

  const courseTypeFilter = searchParams.get('course_type') ?? 'all';
  const setCourseTypeFilter = (v: string) =>
    setParam('course_type', v === 'all' ? undefined : v);

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
  // Both keys must land in the same setSearchParams call (autodrive-6cq.5.70).
  const setDateRange = (from: Date | undefined, to: Date | undefined) =>
    setParams({
      date_from: from ? toLocalDateStr(from) : undefined,
      date_to: to ? toLocalDateStr(to) : undefined,
    });

  const sortField = searchParams.get('sort_by') ?? 'date';
  const sortDir = (searchParams.get('sort_dir') as 'asc' | 'desc') ?? 'desc';
  const setSort = (field: string, dir: 'asc' | 'desc') =>
    setParams({
      sort_by: field === 'date' ? undefined : field,
      sort_dir: dir === 'desc' ? undefined : dir,
    });

  const currentPage = Number(searchParams.get('page')) || 1;
  const setCurrentPage = useCallback(
    (p: number) => setParam('page', p > 1 ? String(p) : undefined),
    [setParam],
  );

  const [isExporting, setIsExporting] = useState(false);

  const SERVER_PAGE_SIZE = 50;
  const debouncedSearch = useDebounce(search, 300);
  const activeCourseType =
    courseTypeFilter !== 'all' ? courseTypeFilter : undefined;
  const activePaymentStatus: 'paid' | 'unpaid' | undefined =
    paymentStatus === 'paid' || paymentStatus === 'unpaid'
      ? paymentStatus
      : undefined;
  const activePaymentMethod =
    paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined;
  const dateFromTime = dateFrom?.getTime();
  const dateToTime = dateTo?.getTime();

  // Reset to page 1 when a filter/sort actually changes — skip the first
  // render so a deep link with ?page=N isn't stomped on load (StudentsPage's
  // analogous effect doesn't need this guard because its page number isn't
  // URL-persisted; this one is).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
  }, [
    setCurrentPage,
    branchId,
    activeCourseType,
    dateFromTime,
    dateToTime,
    debouncedSearch,
    activePaymentStatus,
    activePaymentMethod,
    sortField,
    sortDir,
  ]);

  const effectivePage = currentPage;

  const {
    data: paymentsPage,
    isLoading,
    isFetching,
    isError: isPaymentsError,
    refetch: refetchPayments,
  } = usePaymentsPage(
    branchId,
    activeCourseType,
    dateFrom,
    dateTo,
    effectivePage,
    SERVER_PAGE_SIZE,
    {
      search: debouncedSearch,
      paymentStatus: activePaymentStatus,
      paymentMethod: activePaymentMethod,
      sortBy: sortField,
      sortOrder: sortDir,
    },
  );
  const hasDateFilter = !!dateFrom || !!dateTo;
  const { data: snapshot, isLoading: isSnapshotLoading } =
    usePaymentSnapshot(branchId);
  const { data: branches } = useBranches();
  const createPayment = useCreatePayment();

  const paymentQueryFilters = useMemo(
    () => ({
      branchId,
      courseType: activeCourseType,
      startDate: dateFrom,
      endDate: dateTo,
      search: debouncedSearch,
      paymentStatus: activePaymentStatus,
      paymentMethod: activePaymentMethod,
      sortBy: sortField,
      sortOrder: sortDir,
    }),
    [
      branchId,
      activeCourseType,
      dateFrom,
      dateTo,
      debouncedSearch,
      activePaymentStatus,
      activePaymentMethod,
      sortField,
      sortDir,
    ],
  );

  const canQueryPayments = !!branchId || isCrossTenant;

  const hasAnyFilter =
    hasDateFilter ||
    paymentStatus !== 'all' ||
    paymentMethodFilter !== 'all' ||
    courseTypeFilter !== 'all' ||
    !!debouncedSearch;

  const { data: summary } = usePaymentSummary(
    paymentQueryFilters,
    canQueryPayments && hasAnyFilter,
  );

  const visiblePayments = paymentsPage?.data ?? [];
  const totalPayments = paymentsPage?.meta.total ?? visiblePayments.length;
  const totalPages = Math.max(1, paymentsPage?.meta.totalPages ?? 1);

  // Deleting the last row of the last page leaves currentPage pointing past
  // the new totalPages -- clamp back, same fix as GroupsPage (autodrive-52v.3).
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const displayedSummary = summary ?? {
    period_collected: 0,
    period_payments_count: 0,
    period_debt: 0,
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSort(field, sortDir === 'asc' ? 'desc' : 'asc');
    else setSort(field, 'asc');
  };

  const handlePaymentSubmit = (data: CreatePaymentPayload) => {
    createPayment.mutate(data, {
      onSuccess: () => {
        toast.success(t('payments.added'));
        setModalOpen(false);
      },
      onError: (err) =>
        mutationErrorToast(err, t, () => createPayment.mutate(data)),
    });
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      await exportPaymentsToExcel(paymentQueryFilters, t);
    } catch (err) {
      mutationErrorToast(err, t, () => exportToExcel());
    } finally {
      setIsExporting(false);
    }
  };

  const startIndex = (currentPage - 1) * SERVER_PAGE_SIZE;

  const setPreset = (preset: DatePreset) => {
    const { from, to } = presetRange(preset);
    setDateRange(from, to);
  };

  const clearAllFilters = () => {
    setParams({
      date_from: undefined,
      date_to: undefined,
      status: undefined,
      method: undefined,
      course_type: undefined,
      q: undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PaymentsPageHeader
        isCrossTenant={isCrossTenant}
        canRecordPayment={canRecordPayment}
        isExporting={isExporting}
        exportDisabled={totalPayments === 0 || isExporting}
        onExport={exportToExcel}
        onAddPayment={() => setModalOpen(true)}
      />

      <PaymentSnapshotCards snapshot={snapshot} isLoading={isSnapshotLoading} />

      <PaymentsFilterBar
        isCrossTenant={isCrossTenant}
        branches={branches}
        branchId={branchId}
        onBranchChange={setBranchId}
        paymentStatus={paymentStatus}
        onStatusChange={setPaymentStatus}
        paymentMethod={paymentMethodFilter}
        onMethodChange={setPaymentMethodFilter}
        courseType={courseTypeFilter}
        onCourseTypeChange={setCourseTypeFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateRangeChange={setDateRange}
        search={search}
        onSearchChange={setSearch}
        hasAnyFilter={hasAnyFilter}
        onClearAll={clearAllFilters}
        onPreset={setPreset}
      />

      {hasAnyFilter && (
        <PaymentPeriodSummary
          summary={displayedSummary}
          totalPayments={totalPayments}
        />
      )}

      {/* SECTION 4: Table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground text-balance">
            {t('payments.payment_list')}
          </h2>
          <span className="text-xs text-muted-foreground">
            {t('payments.count_result', { count: totalPayments })}
          </span>
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
            {isPaymentsError ? (
              <EmptyState
                title={t('common.error')}
                action={{
                  label: t('common.retry'),
                  onClick: () => refetchPayments(),
                }}
              />
            ) : (
              <>
                <PaymentsTable
                  payments={visiblePayments}
                  isLoading={isLoading}
                  startIndex={startIndex}
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggleSort={toggleSort}
                />
                <PaymentsMobileList
                  payments={visiblePayments}
                  isLoading={isLoading}
                />
              </>
            )}
          </div>
        </div>

        <div className="mt-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </section>

      <PaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handlePaymentSubmit}
        loading={createPayment.isPending}
        branchId={branchId}
        courseType={
          courseTypeFilter === 'tezkor' || courseTypeFilter === 'avto_maktab'
            ? courseTypeFilter
            : undefined
        }
      />
    </div>
  );
};

export default PaymentsPage;
