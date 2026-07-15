import { useTranslation } from 'react-i18next';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import PaginationControls from '@/components/ui/PaginationControls';
import PaymentModal, {
  CreatePaymentPayload,
} from '@/components/ui/PaymentModal';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsCrossTenant } from '@/hooks/useCan';
import { useUrlParams } from '@/hooks/useUrlParams';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { tashkentToday } from '@/lib/tashkentDate';
import { useBranches } from '@/services/branchService';
import {
  fetchAllPayments,
  useCreatePayment,
  usePaymentsPage,
  usePaymentSnapshot,
  usePaymentSummary,
} from '@/services/paymentService';
import { toLocalDateStr } from '@/services/studentService';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CalendarIcon,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  CreditCard,
  Download,
  Loader2,
  Plus,
  Receipt,
  Search,
  Sun,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const formatDate = (d: string) => {
  try {
    if (!d) return '—';
    return format(new Date(d), 'dd.MM.yyyy HH:mm:ss');
  } catch {
    return d;
  }
};

// Date preset helpers
// ponytail (L2): "today" means Tashkent's calendar day, not the device
// OS's — matches the backend's hardcoded UZ+5 day-bucket math (uzDayStart/
// uzDayEnd) so a device in another timezone can't pick a day that's off by
// one right around midnight UZ time. Returns a local-midnight Date for that
// Tashkent day, so downstream setDate()/toLocalDateStr() keep working as-is.
const weekAgo = () => {
  const d = tashkentToday();
  d.setDate(d.getDate() - 6);
  return d;
};
const monthStart = () => {
  const d = tashkentToday();
  d.setDate(1);
  return d;
};
const lastMonthStart = () => {
  const d = tashkentToday();
  d.setMonth(d.getMonth() - 1, 1);
  return d;
};
const lastMonthEnd = () => {
  const d = tashkentToday();
  d.setDate(0);
  return d;
};

const PaymentsPage = () => {
  const { t } = useTranslation();
  const goToStudent = useViewTransitionNavigate();
  const isCrossTenant = useIsCrossTenant();
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
  const setCurrentPage = (p: number) =>
    setParam('page', p > 1 ? String(p) : undefined);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
        toast.error(extractErrorMessage(err, t('common.error'))),
    });
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const exportRows = await fetchAllPayments(paymentQueryFilters);
      const rows = exportRows.map((p, idx) => ({
        '#': idx + 1,
        [t('payments.student_name')]: p.student_name,
        [t('common.branch')]: p.branch_name,
        [t('payments.course_fast')]:
          p.course_type === 'tezkor'
            ? t('payments.course_fast')
            : t('payments.course_school'),
        [t('payments.total_price')]: p.total_price,
        [t('payments.amount_paid')]: p.amount_paid,
        [t('payments.remaining_debt')]: p.remaining_debt,
        [t('payments.payment_method')]:
          p.payment_method === 'naqd'
            ? t('payments.payment_cash')
            : p.payment_method === 'karta'
              ? t('payments.payment_card')
              : t('payments.payment_transfer'),
        [t('payments.operator')]: p.recorded_by || t('common.na'),
        [t('common.date')]: formatDate(p.date),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('payments.title'));
      XLSX.writeFile(wb, `tolovlar_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    } catch (err) {
      toast.error(extractErrorMessage(err, t('common.error')));
    } finally {
      setIsExporting(false);
    }
  };

  const startIndex = (currentPage - 1) * SERVER_PAGE_SIZE;

  const setPreset = (
    preset: 'today' | 'week' | 'month' | 'lastMonth' | 'all',
  ) => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    switch (preset) {
      case 'today':
        setDateRange(tashkentToday(), now);
        break;
      case 'week':
        setDateRange(weekAgo(), now);
        break;
      case 'month':
        setDateRange(monthStart(), now);
        break;
      case 'lastMonth':
        setDateRange(lastMonthStart(), lastMonthEnd());
        break;
      case 'all':
        setDateRange(undefined, undefined);
        break;
    }
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

  const presetLabels: Record<string, string> = {
    today: t('common.today'),
    week: t('common.week'),
    month: t('common.this_month'),
    lastMonth: t('common.last_month'),
    all: t('common.all_time'),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            {t('payments.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('payments.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isCrossTenant && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950 font-semibold"
                  onClick={exportToExcel}
                  disabled={totalPayments === 0 || isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}{' '}
                  {t('payments.export_excel')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{t('payments.export_info')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('payments.export_desc')}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          <Button className="gap-2" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> {t('payments.add_payment')}
          </Button>
        </div>
      </div>

      {/* SECTION 1: Current status snapshot */}
      <section>
        <div className="flex items-center justify-between mb-3 tabular-nums">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-balance">
            {t('payments.current_status')}
          </h2>
          <span className="text-xs text-muted-foreground">
            {t('payments.not_filter_dependent')}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title={t('payments.stats.today_income')}
            value={formatMoney(snapshot?.today_income || 0)}
            icon={<Sun className="h-5 w-5" />}
            isLoading={isSnapshotLoading}
          />
          <SummaryCard
            title={t('payments.stats.month_income')}
            value={formatMoney(snapshot?.this_month_income || 0)}
            icon={<TrendingUp className="h-5 w-5" />}
            isLoading={isSnapshotLoading}
          />
          <SummaryCard
            title={t('payments.stats.total_debt')}
            value={formatMoney(snapshot?.current_total_debt || 0)}
            icon={<AlertTriangle className="h-5 w-5" />}
            isLoading={isSnapshotLoading}
          />
          <SummaryCard
            title={t('payments.stats.debtor_students')}
            value={`${snapshot?.students_with_debt || 0}${
              t('common.count_unit') ? ` ${t('common.count_unit')}` : ''
            }`}
            icon={<Users className="h-5 w-5" />}
            isLoading={isSnapshotLoading}
          />
        </div>
      </section>

      {/* SECTION 2: Filters */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-balance">
            {t('payments.filter_title')}
          </h2>
          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 gap-1 text-xs"
            >
              <X className="h-3 w-3" /> {t('payments.clear_all')}
            </Button>
          )}
        </div>

        {/* Quick date presets */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(Object.entries(presetLabels) as [string, string][]).map(
            ([key, label]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() =>
                  setPreset(
                    key as 'today' | 'week' | 'month' | 'lastMonth' | 'all',
                  )
                }
              >
                {label}
              </Button>
            ),
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          {isCrossTenant && (
            <Select
              value={branchId || 'all'}
              onValueChange={(v) => setBranchId(v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-40 bg-secondary border-border">
                <SelectValue placeholder={t('common.branch')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all_branches')}</SelectItem>
                {(branches || []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger className="w-44 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('payments.all_statuses')}</SelectItem>
              <SelectItem value="paid">{t('payments.paid')}</SelectItem>
              <SelectItem value="unpaid">{t('payments.unpaid')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={paymentMethodFilter}
            onValueChange={setPaymentMethodFilter}
          >
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('payments.all_types')}</SelectItem>
              <SelectItem value="naqd">{t('payments.payment_cash')}</SelectItem>
              <SelectItem value="karta">
                {t('payments.payment_card')}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={courseTypeFilter} onValueChange={setCourseTypeFilter}>
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('payments.all_courses')}</SelectItem>
              <SelectItem value="avto_maktab">
                {t('payments.course_school')}
              </SelectItem>
              <SelectItem value="tezkor">
                {t('payments.course_fast')}
              </SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'min-w-[200px] justify-start text-left font-normal bg-secondary border-border',
                  !dateFrom && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {!dateFrom
                  ? t('common.date')
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
                  if (!range) setDateRange(undefined, undefined);
                  else setDateRange(range.from, range.to ?? range.from);
                }}
                numberOfMonths={2}
                initialFocus
                disabled={{ after: new Date() }}
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('payments.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: Selected period results */}
      {hasAnyFilter && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-primary text-balance">
              {t('payments.selected_results')}
            </h2>
            <span className="text-xs text-muted-foreground">
              {t('payments.by_count', { count: totalPayments })}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
            <SummaryCard
              title={t('payments.total_collected')}
              value={formatMoney(displayedSummary.period_collected)}
              icon={<Wallet className="h-5 w-5" />}
            />
            <SummaryCard
              title={t('payments.payment_count')}
              value={`${displayedSummary.period_payments_count}${
                t('common.count_unit') ? ` ${t('common.count_unit')}` : ''
              }`}
              icon={<Receipt className="h-5 w-5" />}
            />
            <SummaryCard
              title={t('payments.stats.debt')}
              value={formatMoney(displayedSummary.period_debt)}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>
        </section>
      )}

      {/* SECTION 4: Table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-balance">
            {t('payments.payment_list')}
          </h2>
          <span className="text-xs text-muted-foreground">
            {t('payments.count_result', { count: totalPayments })}
          </span>
        </div>
        <div className="relative">
          {isFetching && !isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <div
            className={cn(
              'glass-card overflow-hidden transition-opacity duration-200',
              isFetching && !isLoading && 'opacity-50',
            )}
          >
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
                          onClick={() => toggleSort('student_name')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {t('payments.student_name')}
                          {sortField === 'student_name' ? (
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
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t('common.course_type')}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        {t('payments.total_price')}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        <button
                          onClick={() => toggleSort('amount_paid')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                        >
                          {t('payments.amount_paid')}
                          {sortField === 'amount_paid' ? (
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
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        <button
                          onClick={() => toggleSort('remaining_debt')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                        >
                          {t('payments.remaining_debt')}
                          {sortField === 'remaining_debt' ? (
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
                          onClick={() => toggleSort('date')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {t('common.date')}
                          {sortField === 'date' ? (
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
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      [...Array(4)].map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td colSpan={8} className="p-4">
                            <Skeleton className="h-5" />
                          </td>
                        </tr>
                      ))
                    ) : visiblePayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <EmptyState
                            icon={CreditCard}
                            title={t('payments.not_found')}
                            description={t('payments.not_found_desc')}
                          />
                        </td>
                      </tr>
                    ) : (
                      visiblePayments.map((p, idx) => (
                        <tr
                          key={p.id}
                          className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                          onClick={(e) => {
                            if (window.getSelection()?.toString()) return;
                            goToStudent(
                              `/students/${p.student_id}?tab=payments`,
                              e.currentTarget,
                              `student-${p.student_id}`,
                            );
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              goToStudent(
                                `/students/${p.student_id}?tab=payments`,
                                e.currentTarget,
                                `student-${p.student_id}`,
                              );
                            }
                          }}
                        >
                          <td className="px-4 py-3 text-center text-muted-foreground">
                            {startIndex + idx + 1}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {p.student_name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {p.branch_name}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {p.course_type === 'tezkor'
                              ? t('payments.course_fast')
                              : t('payments.course_school')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {new Intl.NumberFormat('uz-UZ').format(
                              p.total_price,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-success font-medium">
                            +
                            {new Intl.NumberFormat('uz-UZ').format(
                              p.amount_paid,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={
                                p.remaining_debt > 0
                                  ? 'text-destructive'
                                  : 'text-success'
                              }
                            >
                              {p.remaining_debt > 0
                                ? new Intl.NumberFormat('uz-UZ').format(
                                    p.remaining_debt,
                                  )
                                : t('payments.fully_paid')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground tabular-nums">
                            {formatDate(p.date)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 md:hidden p-3">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))
              ) : visiblePayments.length > 0 ? (
                visiblePayments.map((p) => (
                  <DataCard
                    key={p.id}
                    title={p.student_name}
                    subtitle={p.branch_name}
                    onClick={(e) =>
                      goToStudent(
                        `/students/${p.student_id}?tab=payments`,
                        e.currentTarget,
                        `student-${p.student_id}`,
                      )
                    }
                    fields={[
                      { label: t('common.date'), value: formatDate(p.date) },
                      {
                        label: t('payments.amount'),
                        value: formatMoney(p.amount_paid),
                      },
                      {
                        label: t('common.course_type'),
                        value:
                          p.course_type === 'tezkor'
                            ? t('payments.course_fast')
                            : t('payments.course_school'),
                      },
                    ]}
                  />
                ))
              ) : (
                <EmptyState
                  icon={CreditCard}
                  title={t('payments.not_found')}
                  description={t('payments.not_found_desc')}
                />
              )}
            </div>
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
        hasDebtOnly
      />
    </div>
  );
};

export default PaymentsPage;
