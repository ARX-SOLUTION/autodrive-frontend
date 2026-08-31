import { useNavigate, useParams } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Warning,
  Wallet,
  ShieldCheck,
  PencilSimple,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { EntityDetailShell } from '@/components/ui/EntityDetailShell';
import { useCan } from '@/hooks/useCan';
import {
  useCancelExpense,
  useCreateExpensePayment,
  useDeleteExpense,
  useExpense,
  useExpenseBranchOptions,
  useExpenseHistory,
} from '@/services/expenseService';
import type { ExpensePaymentMethod, ExpenseStatus } from '@/types/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseCalendarDate } from '@/lib/calendarDate';
import { mutationErrorToast } from '@/lib/mutationErrorToast';
import { useAuthStore } from '@/store/authStore';
import { ExpenseFormDialog } from './expenses/ExpenseFormDialog';
import {
  ExpenseLifecycleDialog,
  type ExpenseLifecycleAction,
} from './expenses/ExpenseLifecycleDialog';

const statusVariant = (status: ExpenseStatus) => {
  if (status === 'cancelled') return 'destructive' as const;
  if (status === 'paid') return 'default' as const;
  return 'secondary' as const;
};

const formatAmount = (amount: string, currency: string) =>
  `${amount} ${currency}`;

const MONEY_PATTERN = /^(?:0|[1-9]\d{0,9})\.\d{2}$/;

const canonicalPaymentAmount = (value: string): string | null => {
  const normalized = value.trim();
  const match = /^(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const canonical = `${match[1]}.${(match[2] ?? '').padEnd(2, '0')}`;
  return MONEY_PATTERN.test(canonical) && canonical !== '0.00'
    ? canonical
    : null;
};

const ExpenseDetailPage = () => {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { t } = useTranslation();
  const canViewExpenses = useCan('viewExpenses');
  const canManageFinance = useCan('manageCompanyFinance');
  const authUser = useAuthStore((state) => state.user);
  const isManager = canViewExpenses && !canManageFinance;
  const expenseQuery = useExpense(id);
  const historyQuery = useExpenseHistory(id);
  const branchOptionsQuery = useExpenseBranchOptions();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<ExpensePaymentMethod>('naqd');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [conflict, setConflict] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [lifecycleAction, setLifecycleAction] =
    useState<ExpenseLifecycleAction | null>(null);
  const [lifecycleConflict, setLifecycleConflict] = useState(false);
  const paymentAttempt = useRef<{
    fingerprint: string;
    idempotencyKey: string;
  } | null>(null);
  const paymentMutation = useCreateExpensePayment(id ?? '');
  const cancelMutation = useCancelExpense(id ?? '');
  const deleteMutation = useDeleteExpense(id ?? '');
  const expense = expenseQuery.data;
  const isNotFound =
    (expenseQuery.error as { response?: { status?: number } } | null)?.response
      ?.status === 404;

  if (!canViewExpenses) {
    return (
      <EntityDetailShell
        onBack={() => navigate({ to: '/dashboard' })}
        backLabel={t('expenses.detail.back')}
        isLoading
        isError={false}
      />
    );
  }

  if (expenseQuery.isLoading) {
    return (
      <EntityDetailShell
        onBack={() => navigate({ to: '/expenses' })}
        backLabel={t('expenses.detail.back')}
        isLoading
        isError={false}
      />
    );
  }

  if (expenseQuery.isError) {
    return (
      <EntityDetailShell
        onBack={() => navigate({ to: '/expenses' })}
        backLabel={t('expenses.detail.back')}
        isLoading={false}
        isError
        errorTitle={t(
          isNotFound ? 'expenses.not_found' : 'expenses.load_error',
        )}
        errorDescription={isNotFound ? t('expenses.not_found_desc') : undefined}
        errorIcon={isNotFound ? ShieldCheck : Warning}
        onRetry={isNotFound ? undefined : () => void expenseQuery.refetch()}
        retryLabel={isNotFound ? undefined : t('common.retry')}
      />
    );
  }

  const canViewPaymentHistory = canManageFinance;
  const serverExpense = canViewPaymentHistory
    ? (historyQuery.data?.expense ?? expense)
    : expense;
  if (!serverExpense) {
    return (
      <EntityDetailShell
        onBack={() => navigate({ to: '/expenses' })}
        backLabel={t('expenses.detail.back')}
        isLoading={false}
        isError
        errorTitle={t('expenses.not_found')}
        errorDescription={t('expenses.not_found_desc')}
        errorIcon={ShieldCheck}
      />
    );
  }

  const canEditManagerExpense =
    isManager &&
    serverExpense.category !== 'teacher_settlement' &&
    authUser?.id === serverExpense.created_by_id &&
    serverExpense.status === 'planned' &&
    serverExpense.paid_amount === '0.00' &&
    serverExpense.has_payment_history === false;
  const canEditFinanceExpense =
    canManageFinance &&
    serverExpense.category !== 'teacher_settlement' &&
    serverExpense.status !== 'cancelled';
  const canEditExpense = canEditFinanceExpense || canEditManagerExpense;
  const canCancelExpense =
    canManageFinance && serverExpense.status !== 'cancelled';
  const canDeleteExpense =
    canManageFinance && serverExpense.paid_amount === '0.00';
  const paidDeleteLocked =
    canManageFinance && serverExpense.paid_amount !== '0.00';
  const lifecyclePending = cancelMutation.isPending || deleteMutation.isPending;

  const openLifecycleDialog = (action: ExpenseLifecycleAction) => {
    setLifecycleConflict(false);
    setLifecycleAction(action);
  };

  const closeLifecycleDialog = () => {
    if (lifecyclePending) return;
    setLifecycleConflict(false);
    setLifecycleAction(null);
  };

  const handleLifecycleConfirm = (reason: string) => {
    if (!lifecycleAction) return;
    const payload = {
      reason,
      expected_version: serverExpense.version,
    };
    const onSuccess = () => {
      setLifecycleConflict(false);
      setLifecycleAction(null);
      if (lifecycleAction === 'delete') {
        toast.success(t('expenses.deleted'));
        void navigate({ to: '/expenses' });
        return;
      }
      toast.success(t('expenses.cancelled'));
      void Promise.all([expenseQuery.refetch(), historyQuery.refetch()]);
    };
    const onError = (error: unknown) => {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      if (status === 409) {
        setLifecycleConflict(true);
        void Promise.all([expenseQuery.refetch(), historyQuery.refetch()]);
        return;
      }
      mutationErrorToast(error, t);
    };

    if (lifecycleAction === 'cancel') {
      cancelMutation.mutate(payload, { onSuccess, onError });
    } else {
      deleteMutation.mutate(payload, { onSuccess, onError });
    }
  };

  return (
    <EntityDetailShell
      onBack={() => navigate({ to: '/expenses' })}
      backLabel={t('expenses.detail.back')}
      isLoading={false}
      isError={false}
      header={
        <div className="glass-card space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
              <h1 className="font-heading text-2xl font-bold text-balance">
                {serverExpense.title}
              </h1>
            </div>
            {(canEditExpense ||
              canCancelExpense ||
              canDeleteExpense ||
              paidDeleteLocked) && (
              <div className="flex flex-wrap items-center gap-2">
                {canEditExpense && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setEditOpen(true)}
                    disabled={lifecyclePending}
                  >
                    <PencilSimple className="h-4 w-4" aria-hidden="true" />
                    {t('common.edit')}
                  </Button>
                )}
                {canCancelExpense && (
                  <Button
                    variant="outline"
                    onClick={() => openLifecycleDialog('cancel')}
                    disabled={lifecyclePending}
                  >
                    {t('expenses.lifecycle.cancel_action')}
                  </Button>
                )}
                {canDeleteExpense ? (
                  <Button
                    variant="destructive"
                    onClick={() => openLifecycleDialog('delete')}
                    disabled={lifecyclePending}
                  >
                    {t('expenses.lifecycle.delete_action')}
                  </Button>
                ) : paidDeleteLocked ? (
                  <Button
                    variant="destructive"
                    disabled
                    title={t('expenses.lifecycle.paid_delete_locked')}
                  >
                    {t('expenses.lifecycle.delete_action')}
                  </Button>
                ) : null}
              </div>
            )}
            <Badge variant={statusVariant(serverExpense.status)}>
              {t(`expenses.status.${serverExpense.status}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(`expenses.category.${serverExpense.category}`)}
          </p>
          {paidDeleteLocked && (
            <p className="text-sm text-muted-foreground" role="note">
              {t('expenses.lifecycle.paid_delete_locked')}
            </p>
          )}
        </div>
      }
    >
      <dl className="glass-card grid grid-cols-1 gap-x-8 gap-y-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <DetailField
          label={t('expenses.detail.amount')}
          value={formatAmount(serverExpense.amount, t('expenses.currency'))}
        />
        <DetailField
          label={t('expenses.detail.paid')}
          value={formatAmount(
            serverExpense.paid_amount,
            t('expenses.currency'),
          )}
        />
        <DetailField
          label={t('expenses.detail.remaining')}
          value={formatAmount(
            serverExpense.remaining_amount,
            t('expenses.currency'),
          )}
        />
        <DetailField
          label={t('expenses.detail.expense_date')}
          value={serverExpense.expense_date}
        />
        <DetailField
          label={t('expenses.detail.due_date')}
          value={serverExpense.due_date ?? t('common.na')}
        />
        <DetailField
          label={t('expenses.detail.branch')}
          value={serverExpense.branch_name ?? t('expenses.form.company_wide')}
        />
        <DetailField
          label={t('expenses.detail.payee')}
          value={serverExpense.payee ?? t('common.na')}
        />
        <DetailField
          label={t('expenses.detail.created_by')}
          value={serverExpense.created_by_id}
        />
        <DetailField
          label={t('expenses.detail.version')}
          value={String(serverExpense.version)}
        />
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('expenses.detail.note')}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm">
            {serverExpense.note ?? t('common.na')}
          </dd>
        </div>
      </dl>
      {canViewPaymentHistory && (
        <section className="glass-card space-y-4 p-5">
          <h2 className="font-heading text-lg font-semibold">
            {t('expenses.payments.title')}
          </h2>
          {historyQuery.isLoading && (
            <p className="text-sm text-muted-foreground">
              {t('expenses.payments.loading')}
            </p>
          )}
          {historyQuery.isError && (
            <div className="flex items-center gap-3 text-sm">
              <span>{t('expenses.payments.error')}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void historyQuery.refetch()}
              >
                {t('common.retry')}
              </Button>
            </div>
          )}
          {!historyQuery.isLoading &&
            !historyQuery.isError &&
            historyQuery.data?.payments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('expenses.payments.empty')}
              </p>
            )}
          {historyQuery.data?.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-wrap justify-between gap-2 border-b border-border py-2 text-sm"
            >
              <span>
                {formatAmount(payment.amount, t('expenses.currency'))} ·{' '}
                {t(`expenses.payments.methods.${payment.payment_method}`)} ·{' '}
                {payment.date}
              </span>
              <span>
                {payment.voided_at
                  ? t('expenses.payments.voided')
                  : t('expenses.payments.active')}
              </span>
            </div>
          ))}
          {canManageFinance &&
            serverExpense.status !== 'cancelled' &&
            serverExpense.status !== 'paid' && (
              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setConflict(false);
                  setPaymentError(null);
                  const canonicalAmount = canonicalPaymentAmount(amount);
                  const normalizedDate = date.trim();
                  const normalizedNote = note.trim() || null;
                  if (!canonicalAmount) {
                    setPaymentError('expenses.payments.invalid_amount');
                    return;
                  }
                  if (!parseCalendarDate(normalizedDate)) {
                    setPaymentError('expenses.payments.invalid_date');
                    return;
                  }
                  const fingerprint = JSON.stringify([
                    canonicalAmount,
                    method,
                    normalizedDate,
                    normalizedNote,
                  ]);
                  if (paymentAttempt.current?.fingerprint !== fingerprint) {
                    paymentAttempt.current = {
                      fingerprint,
                      idempotencyKey: crypto.randomUUID(),
                    };
                  }
                  paymentMutation.mutate(
                    {
                      amount: canonicalAmount,
                      payment_method: method,
                      date: normalizedDate,
                      note: normalizedNote,
                      idempotency_key: paymentAttempt.current.idempotencyKey,
                      expected_version: serverExpense.version,
                    },
                    {
                      onSuccess: () => {
                        setAmount('');
                        setDate('');
                        setNote('');
                        paymentAttempt.current = null;
                      },
                      onError: (error) => {
                        if (
                          (error as { response?: { status?: number } }).response
                            ?.status === 409
                        ) {
                          setConflict(true);
                          void Promise.all([
                            expenseQuery.refetch(),
                            historyQuery.refetch(),
                          ]);
                        }
                      },
                    },
                  );
                }}
              >
                <Input
                  aria-label={t('expenses.payments.amount')}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={paymentMutation.isPending}
                  required
                />
                <select
                  aria-label={t('expenses.payments.method')}
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as ExpensePaymentMethod)
                  }
                  disabled={paymentMutation.isPending}
                  className="rounded-md border border-border bg-secondary px-3 text-sm"
                >
                  <option value="naqd">
                    {t('expenses.payments.methods.naqd')}
                  </option>
                  <option value="karta">
                    {t('expenses.payments.methods.karta')}
                  </option>
                  <option value="perechisleniya">
                    {t('expenses.payments.methods.perechisleniya')}
                  </option>
                </select>
                <Input
                  aria-label={t('expenses.payments.date')}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={paymentMutation.isPending}
                  required
                />
                <Input
                  aria-label={t('expenses.payments.note')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={paymentMutation.isPending}
                />
                <Button type="submit" disabled={paymentMutation.isPending}>
                  {paymentMutation.isPending
                    ? t('expenses.payments.saving')
                    : t('expenses.payments.submit')}
                </Button>
                {conflict && (
                  <p className="text-sm text-destructive sm:col-span-2">
                    {t('expenses.payments.conflict')}
                  </p>
                )}
                {paymentError && (
                  <p className="text-sm text-destructive sm:col-span-2">
                    {t(paymentError)}
                  </p>
                )}
              </form>
            )}
        </section>
      )}
      {editOpen && (
        <ExpenseFormDialog
          open={editOpen}
          editExpense={serverExpense}
          branches={branchOptionsQuery.data ?? []}
          onClose={() => setEditOpen(false)}
        />
      )}
      {lifecycleAction && (
        <ExpenseLifecycleDialog
          key={lifecycleAction}
          open
          action={lifecycleAction}
          loading={lifecyclePending}
          conflict={lifecycleConflict}
          onClose={closeLifecycleDialog}
          onConfirm={handleLifecycleConfirm}
        />
      )}
    </EntityDetailShell>
  );
};

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd className="break-words font-medium">{value}</dd>
  </div>
);

export default ExpenseDetailPage;
