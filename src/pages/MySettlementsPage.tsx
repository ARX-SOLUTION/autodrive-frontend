import { Wallet, Warning } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListSearchField } from '@/components/ui/ListSearchField';
import PaginationControls from '@/components/ui/PaginationControls';
import { useListQueryState } from '@/hooks/useListQueryState';
import { matchesListQuery } from '@/lib/listQuery';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCan } from '@/hooks/useCan';
import { formatMoney } from '@/lib/money';
import { useMySettlements } from '@/services/expenseService';
import type { Expense, ExpenseStatus } from '@/types/expense';
import { MySettlementsSummaryPanel } from './my-settlements/MySettlementsSummaryPanel';

const statusVariant = (status: ExpenseStatus) => {
  if (status === 'cancelled') return 'destructive' as const;
  if (status === 'paid') return 'default' as const;
  return 'secondary' as const;
};

const SettlementRow = ({
  settlement,
  onOpen,
}: {
  settlement: Expense;
  onOpen: (id: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="flex w-full flex-col gap-2 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
      onClick={() => onOpen(settlement.id)}
    >
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium">{settlement.title}</p>
        <p className="text-sm text-muted-foreground">
          {settlement.period_month ?? settlement.expense_date}
          {settlement.branch_name ? ` · ${settlement.branch_name}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="tabular-nums font-mono">
          {formatMoney(settlement.amount)}
        </span>
        <span className="tabular-nums font-mono text-muted-foreground">
          {t('my_settlements.paid')}: {formatMoney(settlement.paid_amount)}
        </span>
        <span className="tabular-nums font-mono">
          {t('my_settlements.remaining')}:{' '}
          {formatMoney(settlement.remaining_amount)}
        </span>
        <Badge variant={statusVariant(settlement.status)}>
          {t(`expenses.status.${settlement.status}`)}
        </Badge>
      </div>
    </button>
  );
};

const MySettlementsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canViewOwn = useCan('viewOwnSettlements');
  const {
    page: currentPage,
    pageSize,
    search,
    debouncedSearch,
    setPage: setCurrentPage,
    setPageSize,
    setSearch,
  } = useListQueryState();
  const query = useMySettlements(currentPage, canViewOwn, pageSize);
  const settlements = useMemo(() => query.data?.data ?? [], [query.data]);
  const visibleSettlements = useMemo(
    () =>
      settlements.filter((settlement) =>
        matchesListQuery(
          debouncedSearch,
          settlement.title,
          settlement.branch_name,
          settlement.period_month,
          settlement.expense_date,
        ),
      ),
    [settlements, debouncedSearch],
  );
  const total = query.data?.meta.total ?? 0;
  const totalPages = Math.max(1, query.data?.meta.totalPages ?? 1);

  const openDetail = (id: string) => {
    void navigate({ to: '/my-settlements/$id', params: { id } });
  };

  if (!canViewOwn) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('my_settlements.title')}
          title={t('my_settlements.title')}
          description={t('my_settlements.subtitle')}
          icon={<Wallet className="h-3.5 w-3.5" aria-hidden="true" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('my_settlements.title')}
        title={t('my_settlements.title')}
        description={t('my_settlements.subtitle')}
        icon={<Wallet className="h-3.5 w-3.5" aria-hidden="true" />}
      />

      <ListSearchField
        value={search}
        onChange={setSearch}
        placeholder={t('expenses.title')}
      />

      <MySettlementsSummaryPanel
        settlements={settlements}
        total={total}
        isLoading={query.isLoading}
      />

      <div className="glass-card overflow-hidden">
        {query.isLoading ? (
          <div
            className="space-y-3 p-4"
            aria-busy="true"
            aria-label={t('my_settlements.loading')}
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState
            icon={Warning}
            title={t('my_settlements.load_error')}
            description={t('my_settlements.load_error_desc')}
            action={{
              label: t('common.retry'),
              onClick: () => void query.refetch(),
            }}
          />
        ) : settlements.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={t('my_settlements.empty')}
            description={t('my_settlements.empty_desc')}
          />
        ) : visibleSettlements.length === 0 ? (
          <EmptyState icon={Wallet} title={t('common.no_data')} />
        ) : (
          <div>
            {visibleSettlements.map((settlement) => (
              <SettlementRow
                key={settlement.id}
                settlement={settlement}
                onOpen={openDetail}
              />
            ))}
          </div>
        )}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};

export default MySettlementsPage;
