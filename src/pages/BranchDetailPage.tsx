import { lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Warning, MapPin, Phone, ShieldCheck } from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { EntityDetailShell } from '@/components/ui/EntityDetailShell';
import { useBranch } from '@/services/branchService';
import { useExpensesPage } from '@/services/expenseService';
import { tashkentToday } from '@/lib/tashkentDate';
import { formatMoney } from '@/lib/money';
import { toLocalDateStr } from '@/services/studentService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExpensesTable } from './expenses/ExpensesTable';

const BranchRevenueTrendChart = lazy(
  () => import('./branches/BranchRevenueTrendChart'),
);

const BranchDetailPage = () => {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: branch, isLoading, isError } = useBranch(id);
  const [expensePage, setExpensePage] = useState(1);
  const expensesQuery = useExpensesPage({
    branchId: id,
    page: expensePage,
    limit: 5,
  });
  const today = toLocalDateStr(tashkentToday());

  if (isLoading || isError || !branch) {
    return (
      <EntityDetailShell
        onBack={() => navigate({ to: '/branches' })}
        backLabel={t('branches.title')}
        isLoading={isLoading}
        isError={isError || !branch}
        errorTitle={isError ? t('common.error') : t('common.not_found')}
        errorIcon={isError ? Warning : ShieldCheck}
      />
    );
  }

  return (
    <EntityDetailShell
      onBack={() => navigate({ to: '/branches' })}
      backLabel={t('branches.title')}
      isLoading={false}
      isError={false}
      header={
        <div className="glass-card space-y-2 p-5">
          <h1 className="font-heading text-2xl font-bold text-balance">
            {branch.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {branch.location}
            </span>
            {branch.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {branch.phone}
              </span>
            )}
            <span>
              {t('branches.manager')}: {branch.manager_name || t('common.na')}
            </span>
          </div>
        </div>
      }
    >
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">{t('common.tab_info')}</TabsTrigger>
          <TabsTrigger value="expenses">
            {t('branches.detail.expenses')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <dl className="glass-card grid grid-cols-1 gap-x-8 gap-y-3 p-5 text-sm sm:grid-cols-2">
            <Field
              label={t('branches.students')}
              value={String(branch.active_students)}
              link={{ type: 'students', branchId: branch.id }}
            />
            <Field
              label={t('branches.detail.revenue')}
              value={formatMoney(branch.revenue)}
            />
            <Field
              label={t('branches.detail.debt')}
              value={formatMoney(branch.debt)}
            />
            <Field
              label={t('branches.detail.today_payment')}
              value={formatMoney(branch.today_payment)}
              link={{ type: 'payments', branchId: branch.id, date: today }}
            />
          </dl>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass-card p-5">
              <h2 className="mb-3 text-sm font-semibold">
                {t('branches.detail.revenue_trend')}
              </h2>
              <Suspense
                fallback={<Skeleton className="h-56 w-full rounded-lg" />}
              >
                <BranchRevenueTrendChart data={branch.monthly_revenue} />
              </Suspense>
            </div>
            <div className="glass-card p-5">
              <h2 className="mb-3 text-sm font-semibold">
                {t('branches.detail.top_debtors')}
              </h2>
              <TopDebtorsList
                debtors={branch.top_debtors}
                viewAllBranchId={branch.id}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesTable
            expenses={expensesQuery.data?.data ?? []}
            isLoading={expensesQuery.isLoading}
            isFetching={expensesQuery.isFetching}
            isError={expensesQuery.isError}
            onRetry={() => void expensesQuery.refetch()}
            currentPage={expensePage}
            pageSize={5}
            totalExpenses={expensesQuery.data?.meta.total ?? 0}
            totalPages={Math.max(1, expensesQuery.data?.meta.totalPages ?? 1)}
            onPageChange={setExpensePage}
          />
        </TabsContent>
      </Tabs>
    </EntityDetailShell>
  );
};

const TopDebtorsList = ({
  debtors,
  viewAllBranchId,
}: {
  debtors?: { id: string; name: string; debt: number }[];
  viewAllBranchId: string;
}) => {
  const { t } = useTranslation();
  if (!debtors || debtors.length === 0) {
    return <EmptyState title={t('common.no_data')} />;
  }
  return (
    <div className="space-y-2">
      {debtors.map((debtor) => (
        <Link
          key={debtor.id}
          to="/students/$id"
          params={{ id: debtor.id }}
          className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate">{debtor.name}</span>
          <span className="shrink-0 font-semibold text-destructive">
            {formatMoney(debtor.debt)}
          </span>
        </Link>
      ))}
      <Link
        to="/students"
        search={{ branch_id: viewAllBranchId, has_debt: true }}
        className="block pt-1 text-xs font-semibold text-primary hover:underline"
      >
        {t('branches.detail.view_all_debtors')}
      </Link>
    </div>
  );
};

const Field = ({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?:
    | { type: 'students'; branchId: string }
    | { type: 'payments'; branchId: string; date: string };
}) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd>
      {link?.type === 'students' ? (
        <Link
          to="/students"
          search={{ branch_id: link.branchId }}
          className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {value}
        </Link>
      ) : link?.type === 'payments' ? (
        <Link
          to="/payments"
          search={{
            branch_id: link.branchId,
            date_from: link.date,
            date_to: link.date,
          }}
          className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {value}
        </Link>
      ) : (
        value
      )}
    </dd>
  </div>
);

export default BranchDetailPage;
