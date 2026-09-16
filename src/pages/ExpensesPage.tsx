import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarCheck,
  ClockCountdown,
  Plus,
  Receipt,
  Warning,
  Wallet,
  X,
} from '@phosphor-icons/react';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useCan } from '@/hooks/useCan';
import { useAuthStore } from '@/store/authStore';
import {
  expenseCategoryValues,
  expenseStatusValues,
  useExpenseBranchOptions,
  useExpensesPage,
  useExpenseTriageCounts,
  useOverdueExpenseSweep,
} from '@/services/expenseService';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { toLocalDateStr } from '@/services/studentService';
import { parseCalendarDate } from '@/lib/calendarDate';
import { tashkentTodayCalendarDate } from '@/lib/tashkentDate';
import { cn } from '@/lib/utils';
import { ExpensesFilterBar } from './expenses/ExpensesFilterBar';
import { ExpenseOverdueSweep } from './expenses/ExpenseOverdueSweep';
import { ExpensesTable } from './expenses/ExpensesTable';
import { ExpenseFormDialog } from './expenses/ExpenseFormDialog';
import { ExpenseMonthCloseDialog } from './expenses/ExpenseMonthCloseDialog';
import type {
  ExpenseCategory,
  ExpenseListFilters,
  ExpenseStatus,
  ExpenseTriageCounts,
  ExpenseTriageCountsFilters,
} from '@/types/expense';

const SERVER_PAGE_SIZE = 20;
const DISMISSED_VALUE = '1';
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

const millisecondsUntilNextTashkentDay = () => {
  const now = Date.now();
  const tashkentNow = new Date(now + TASHKENT_OFFSET_MS);
  const nextBoundary =
    Date.UTC(
      tashkentNow.getUTCFullYear(),
      tashkentNow.getUTCMonth(),
      tashkentNow.getUTCDate() + 1,
    ) - TASHKENT_OFFSET_MS;
  return Math.max(1, nextBoundary - now);
};

const readDailyBriefDismissal = (key: string | undefined) => {
  if (!key) return false;
  try {
    return window.localStorage.getItem(key) === DISMISSED_VALUE;
  } catch {
    return false;
  }
};

const useDailyBriefDismissal = (
  companyId: string | undefined,
  userId: string | undefined,
) => {
  const [day, setDay] = useState(tashkentTodayCalendarDate);
  const key =
    companyId && userId
      ? `expenses.daily_brief.dismissed:${companyId}:${userId}:${day}`
      : undefined;
  const [dismissal, setDismissal] = useState(() => ({
    key,
    dismissed: readDailyBriefDismissal(key),
  }));

  if (dismissal.key !== key) {
    setDismissal({ key, dismissed: readDailyBriefDismissal(key) });
  }

  useEffect(() => {
    let timeout: number | undefined;
    const scheduleMidnightSync = () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      timeout = window.setTimeout(syncDay, millisecondsUntilNextTashkentDay());
    };
    const syncDay = () => {
      setDay(tashkentTodayCalendarDate());
      scheduleMidnightSync();
    };
    const syncVisibleDay = () => {
      if (document.visibilityState === 'visible') syncDay();
    };

    scheduleMidnightSync();
    window.addEventListener('focus', syncDay);
    document.addEventListener('visibilitychange', syncVisibleDay);
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      window.removeEventListener('focus', syncDay);
      document.removeEventListener('visibilitychange', syncVisibleDay);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissal({ key, dismissed: true });
    if (!key) return;
    try {
      window.localStorage.setItem(key, DISMISSED_VALUE);
    } catch {
      // The current mount remains dismissed even when storage is unavailable.
    }
  }, [key]);

  return {
    dismissed: dismissal.key === key ? dismissal.dismissed : false,
    dismiss,
    hasIdentity: !!key,
    businessDay: day,
  };
};

interface ExpenseDailyBriefProps {
  counts: ExpenseTriageCounts | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onDismiss: () => void;
  onViewOverdue: () => void;
  onViewAll: () => void;
}

const ExpenseDailyBrief = ({
  counts,
  isLoading,
  isError,
  onRetry,
  onDismiss,
  onViewOverdue,
  onViewAll,
}: ExpenseDailyBriefProps) => {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterError = useRef(false);

  useEffect(() => {
    if (focusAfterError.current && !isLoading && !isError && counts) {
      headingRef.current?.focus();
      focusAfterError.current = false;
    }
  }, [counts, isError, isLoading]);

  const handleRetry = () => {
    focusAfterError.current = true;
    onRetry();
  };

  const due = (counts?.due_today ?? 0) + (counts?.due_within_three_days ?? 0);
  const overdue =
    (counts?.overdue_1_7 ?? 0) +
    (counts?.overdue_8_30 ?? 0) +
    (counts?.overdue_31_plus ?? 0);
  const metrics = [
    {
      title: t('expenses.daily_brief.due'),
      value: due,
      icon: <ClockCountdown className="h-5 w-5" aria-hidden="true" />,
    },
    {
      title: t('expenses.daily_brief.overdue'),
      value: overdue,
      icon: <Warning className="h-5 w-5" aria-hidden="true" />,
    },
    {
      title: t('expenses.daily_brief.newly_created'),
      value: counts?.created_yesterday ?? 0,
      icon: <Receipt className="h-5 w-5" aria-hidden="true" />,
    },
    {
      title: t('expenses.daily_brief.pending'),
      value: counts?.pending_total ?? 0,
      icon: <CalendarCheck className="h-5 w-5" aria-hidden="true" />,
    },
  ];
  const hasNoAttention =
    !!counts && metrics.every((metric) => metric.value === 0);

  return (
    <section aria-labelledby="expense-daily-brief-title" aria-busy={isLoading}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2
            ref={headingRef}
            id="expense-daily-brief-title"
            tabIndex={-1}
            className="font-heading text-lg font-semibold text-foreground"
          >
            {t('expenses.daily_brief.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('expenses.daily_brief.description')}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('expenses.daily_brief.dismiss')}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {isLoading
          ? t('expenses.daily_brief.loading')
          : isError
            ? t('expenses.daily_brief.load_error')
            : ''}
      </p>

      {isError ? (
        <div className="glass-card">
          <EmptyState
            icon={Warning}
            title={t('expenses.daily_brief.load_error')}
            action={{ label: t('common.retry'), onClick: handleRetry }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <SummaryCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              icon={metric.icon}
              isLoading={isLoading || !counts}
            />
          ))}
        </div>
      )}

      {!isError && hasNoAttention && (
        <p className="mt-3 text-sm text-muted-foreground">
          {t('expenses.daily_brief.no_attention')}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onViewOverdue}>
          {t('expenses.daily_brief.view_overdue')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          {t('expenses.daily_brief.view_all')}
        </Button>
      </div>
    </section>
  );
};

const ExpensesPage = () => {
  const { t } = useTranslation();
  const canViewExpenses = useCan('viewExpenses');
  const canManageFinance = useCan('manageCompanyFinance');
  const authUser = useAuthStore((state) => state.user);
  const isManager = canViewExpenses && !canManageFinance;
  const managerBranchId = isManager
    ? (authUser?.branch_id ?? undefined)
    : undefined;

  const { searchParams, setParam, setParams } = useUrlParams();

  const branchFilter = isManager
    ? (managerBranchId ?? 'all')
    : (searchParams.get('branch_id') ??
      (searchParams.get('scope') === 'company' ? 'company' : 'all'));
  const setBranchFilter = (value: string) =>
    setParams({
      branch_id: value === 'all' || value === 'company' ? undefined : value,
      scope: value === 'company' ? 'company' : undefined,
      page: undefined,
    });

  const rawCategory = searchParams.get('category');
  const categoryFilter = expenseCategoryValues.includes(
    rawCategory as ExpenseCategory,
  )
    ? (rawCategory as ExpenseCategory)
    : 'all';
  const setCategoryFilter = (value: string) =>
    setParam('category', value === 'all' ? undefined : value);

  const attentionFilter =
    searchParams.get('attention') === 'overdue'
      ? ('overdue' as const)
      : undefined;
  const rawStatus = searchParams.get('status');
  const statusFilter =
    !attentionFilter && expenseStatusValues.includes(rawStatus as ExpenseStatus)
      ? (rawStatus as ExpenseStatus)
      : 'all';
  const setStatusFilter = (value: string) =>
    setParams({
      attention: undefined,
      status: value === 'all' ? undefined : value,
      page: undefined,
    });

  const rawDateFrom = searchParams.get('date_from');
  const dateFrom = useMemo(
    () => (rawDateFrom ? parseCalendarDate(rawDateFrom) : undefined),
    [rawDateFrom],
  );
  const rawDateTo = searchParams.get('date_to');
  const dateTo = useMemo(
    () => (rawDateTo ? parseCalendarDate(rawDateTo) : undefined),
    [rawDateTo],
  );
  const setDateRange = (from: Date | undefined, to: Date | undefined) =>
    setParams({
      date_from: from ? toLocalDateStr(from) : undefined,
      date_to: to ? toLocalDateStr(to) : undefined,
      page: undefined,
    });

  const parsedPage = Number(searchParams.get('page'));
  const currentPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const setCurrentPage = useCallback(
    (page: number) => setParam('page', page > 1 ? String(page) : undefined),
    [setParam],
  );

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
  }, [
    attentionFilter,
    branchFilter,
    categoryFilter,
    statusFilter,
    dateFrom,
    dateTo,
    setCurrentPage,
  ]);

  const expenseFilters: ExpenseListFilters = {
    branchId: isManager
      ? managerBranchId
      : branchFilter !== 'all' && branchFilter !== 'company'
        ? branchFilter
        : undefined,
    scope:
      !isManager && branchFilter === 'company'
        ? ('company' as const)
        : undefined,
    category:
      categoryFilter !== 'all'
        ? (categoryFilter as ExpenseCategory)
        : undefined,
    status:
      !attentionFilter && statusFilter !== 'all'
        ? (statusFilter as ExpenseStatus)
        : undefined,
    attention: attentionFilter,
    dateFrom: dateFrom ? toLocalDateStr(dateFrom) : undefined,
    dateTo: dateTo ? toLocalDateStr(dateTo) : undefined,
    page: currentPage,
    limit: SERVER_PAGE_SIZE,
  };
  const triageFilters: ExpenseTriageCountsFilters = {
    branchId: expenseFilters.branchId,
    scope: expenseFilters.scope,
  };
  const dailyBriefDismissal = useDailyBriefDismissal(
    authUser?.company_id,
    authUser?.id,
  );
  const hasManagerScope = !isManager || !!managerBranchId;
  const showDailyBrief =
    canViewExpenses &&
    hasManagerScope &&
    dailyBriefDismissal.hasIdentity &&
    !dailyBriefDismissal.dismissed;
  const expenseListHeadingRef = useRef<HTMLHeadingElement>(null);

  const {
    data: triageCounts,
    isLoading: isTriageLoading,
    isError: isTriageError,
    refetch: refetchTriage,
  } = useExpenseTriageCounts(
    triageFilters,
    showDailyBrief,
    dailyBriefDismissal.businessDay,
  );
  const {
    data: expensesPage,
    isLoading: isPageLoading,
    isFetching: isPageFetching,
    isError: isPageError,
    refetch: refetchPage,
  } = useExpensesPage(expenseFilters, !attentionFilter && hasManagerScope);
  const {
    data: overdueExpenses = [],
    isLoading: isSweepLoading,
    isFetching: isSweepFetching,
    isError: isSweepError,
    refetch: refetchSweep,
  } = useOverdueExpenseSweep(
    expenseFilters,
    !!attentionFilter && hasManagerScope,
    dailyBriefDismissal.businessDay,
  );
  const {
    data: branches = [],
    isLoading: isBranchesLoading,
    isError: isBranchesError,
    refetch: refetchBranches,
  } = useExpenseBranchOptions();
  const [formOpen, setFormOpen] = useState(false);
  const [monthCloseOpen, setMonthCloseOpen] = useState(false);

  const hasAnyFilter =
    (!isManager && branchFilter !== 'all') ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    !!attentionFilter ||
    !!dateFrom ||
    !!dateTo;

  const clearAll = () =>
    setParams({
      branch_id: undefined,
      scope: undefined,
      category: undefined,
      status: undefined,
      attention: undefined,
      date_from: undefined,
      date_to: undefined,
      page: undefined,
    });

  const dismissDailyBrief = () => {
    dailyBriefDismissal.dismiss();
    expenseListHeadingRef.current?.focus();
  };

  const viewOverdue = () =>
    setParams({
      attention: 'overdue',
      status: undefined,
      category: undefined,
      date_from: undefined,
      date_to: undefined,
      page: undefined,
    });

  const viewAllExpenses = () =>
    setParams({
      attention: undefined,
      status: undefined,
      category: undefined,
      date_from: undefined,
      date_to: undefined,
      page: undefined,
    });

  const canRenderExpenseData = canViewExpenses && hasManagerScope;
  const visibleExpenses = canRenderExpenseData
    ? (expensesPage?.data ?? [])
    : [];
  const visibleOverdueExpenses = canRenderExpenseData ? overdueExpenses : [];
  const totalExpenses = canRenderExpenseData
    ? (expensesPage?.meta.total ?? 0)
    : 0;
  const totalPages = Math.max(1, expensesPage?.meta.totalPages ?? 1);

  useEffect(() => {
    if (!attentionFilter && currentPage > totalPages) setCurrentPage(1);
  }, [attentionFilter, currentPage, totalPages, setCurrentPage]);

  const isLoading = attentionFilter ? isSweepLoading : isPageLoading;
  const isFetching = attentionFilter ? isSweepFetching : isPageFetching;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('expenses.title')}
        title={t('expenses.title')}
        description={t('expenses.subtitle')}
        icon={<Wallet className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          <div className="flex flex-wrap gap-2">
            {canManageFinance && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setMonthCloseOpen(true)}
              >
                {t('expenses.month_close.action')}
              </Button>
            )}
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />{' '}
              {t('expenses.add')}
            </Button>
          </div>
        }
      />

      {showDailyBrief && (
        <ExpenseDailyBrief
          counts={triageCounts}
          isLoading={isTriageLoading}
          isError={isTriageError}
          onRetry={() => void refetchTriage()}
          onDismiss={dismissDailyBrief}
          onViewOverdue={viewOverdue}
          onViewAll={viewAllExpenses}
        />
      )}

      <ExpensesFilterBar
        branches={branches}
        showBranchFilter={!isManager}
        fixedBranchLabel={authUser?.branch_name}
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        attentionFilter={attentionFilter}
        onStatusFilterChange={setStatusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateRangeChange={setDateRange}
        hasAnyFilter={hasAnyFilter}
        onClearAll={clearAll}
        headingRef={expenseListHeadingRef}
      />

      <div className="relative">
        {!attentionFilter && isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <div
          className={cn(
            'glass-card overflow-hidden transition-opacity duration-200',
            !attentionFilter && isFetching && !isLoading && 'opacity-50',
          )}
        >
          {attentionFilter ? (
            <ExpenseOverdueSweep
              expenses={visibleOverdueExpenses}
              isLoading={isSweepLoading}
              isFetching={isSweepFetching}
              isError={isSweepError}
              onRetry={() => void refetchSweep()}
              returnContext={{
                return_attention: 'overdue',
                return_branch_id: expenseFilters.branchId,
                return_scope: expenseFilters.branchId
                  ? undefined
                  : expenseFilters.scope,
              }}
            />
          ) : (
            <ExpensesTable
              expenses={visibleExpenses}
              isLoading={isPageLoading}
              isFetching={isPageFetching}
              isError={isPageError}
              onRetry={() => void refetchPage()}
              currentPage={currentPage}
              pageSize={SERVER_PAGE_SIZE}
              totalExpenses={totalExpenses}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      <ExpenseFormDialog
        open={formOpen}
        branches={isManager ? [] : branches}
        onClose={() => setFormOpen(false)}
      />
      {canManageFinance && monthCloseOpen && (
        <ExpenseMonthCloseDialog
          open={monthCloseOpen}
          branches={branches}
          isBranchesLoading={isBranchesLoading}
          isBranchesError={isBranchesError}
          onRetryBranches={() => void refetchBranches()}
          onClose={() => setMonthCloseOpen(false)}
        />
      )}
    </div>
  );
};

export default ExpensesPage;
