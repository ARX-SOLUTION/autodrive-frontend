import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, Plus } from '@phosphor-icons/react';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useCan } from '@/hooks/useCan';
import { useAuthStore } from '@/store/authStore';
import {
  expenseCategoryValues,
  expenseStatusValues,
  useExpenseBranchOptions,
  useExpensesPage,
} from '@/services/expenseService';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { toLocalDateStr } from '@/services/studentService';
import { parseCalendarDate } from '@/lib/calendarDate';
import { cn } from '@/lib/utils';
import { ExpensesFilterBar } from './expenses/ExpensesFilterBar';
import { ExpensesTable } from './expenses/ExpensesTable';
import { ExpenseFormDialog } from './expenses/ExpenseFormDialog';
import type { ExpenseCategory, ExpenseStatus } from '@/types/expense';

const SERVER_PAGE_SIZE = 20;

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

  const rawStatus = searchParams.get('status');
  const statusFilter = expenseStatusValues.includes(rawStatus as ExpenseStatus)
    ? (rawStatus as ExpenseStatus)
    : 'all';
  const setStatusFilter = (value: string) =>
    setParam('status', value === 'all' ? undefined : value);

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
    branchFilter,
    categoryFilter,
    statusFilter,
    dateFrom,
    dateTo,
    setCurrentPage,
  ]);

  const expenseFilters = {
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
      statusFilter !== 'all' ? (statusFilter as ExpenseStatus) : undefined,
    dateFrom: dateFrom ? toLocalDateStr(dateFrom) : undefined,
    dateTo: dateTo ? toLocalDateStr(dateTo) : undefined,
    page: currentPage,
    limit: SERVER_PAGE_SIZE,
  };

  const {
    data: expensesPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useExpensesPage(expenseFilters);
  const { data: branches = [] } = useExpenseBranchOptions();
  const [formOpen, setFormOpen] = useState(false);

  const hasAnyFilter =
    (!isManager && branchFilter !== 'all') ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    !!dateFrom ||
    !!dateTo;

  const clearAll = () =>
    setParams({
      branch_id: undefined,
      scope: undefined,
      category: undefined,
      status: undefined,
      date_from: undefined,
      date_to: undefined,
      page: undefined,
    });

  const visibleExpenses = expensesPage?.data ?? [];
  const totalExpenses = expensesPage?.meta.total ?? 0;
  const totalPages = Math.max(1, expensesPage?.meta.totalPages ?? 1);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages, setCurrentPage]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('expenses.title')}
        title={t('expenses.title')}
        description={t('expenses.subtitle')}
        icon={<Wallet className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          <Button className="gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> {t('expenses.add')}
          </Button>
        }
      />

      <ExpensesFilterBar
        branches={branches}
        showBranchFilter={!isManager}
        fixedBranchLabel={authUser?.branch_name}
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateRangeChange={setDateRange}
        hasAnyFilter={hasAnyFilter}
        onClearAll={clearAll}
      />

      <div className="relative">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <div
          className={cn(
            'glass-card overflow-hidden transition-opacity duration-200',
            isFetching && !isLoading && 'opacity-50',
          )}
        >
          <ExpensesTable
            expenses={visibleExpenses}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
            onRetry={() => void refetch()}
            currentPage={currentPage}
            pageSize={SERVER_PAGE_SIZE}
            totalExpenses={totalExpenses}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <ExpenseFormDialog
        open={formOpen}
        branches={isManager ? [] : branches}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
};

export default ExpensesPage;
