import { useLocation, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { useUrlParams } from '@/hooks/useUrlParams';
import {
  useCancelExpense,
  useCreateExpensePayment,
  useDeleteExpense,
  useExpense,
  useExpenseBranchOptions,
  useExpenseHistory,
  useMySettlementDetail,
  useVoidExpensePayment,
} from '@/services/expenseService';
import type {
  ExpensePayment,
  ExpensePaymentMethod,
  ExpenseStatus,
} from '@/types/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseCalendarDate } from '@/lib/calendarDate';
import { mutationErrorToast } from '@/lib/mutationErrorToast';
import { useAuthStore } from '@/store/authStore';
import { ExpenseFormDialog } from './expenses/ExpenseFormDialog';
import {
  ExpenseLifecycleDialog,
  type ExpenseLifecycleAction,
} from './expenses/ExpenseLifecycleDialog';
import { VoidPaymentDialog } from './expenses/VoidPaymentDialog';

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
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { searchParams, setSearchParams } = useUrlParams();
  const canViewExpenses = useCan('viewExpenses');
  const canViewOwnSettlements = useCan('viewOwnSettlements');
  const canManageFinance = useCan('manageCompanyFinance');
  const authUser = useAuthStore((state) => state.user);
  const isManager = canViewExpenses && !canManageFinance;
  const isOwnSettlementView =
    canViewOwnSettlements && location.pathname.startsWith('/my-settlements/');
  const canAccessDetail = canViewExpenses || isOwnSettlementView;
  const expenseQuery = useExpense(isOwnSettlementView ? undefined : id);
  const mySettlementQuery = useMySettlementDetail(
    isOwnSettlementView ? id : undefined,
  );
  const historyQuery = useExpenseHistory(isOwnSettlementView ? undefined : id);
  const branchOptionsQuery = useExpenseBranchOptions();
  const payRemainingConsumedFor = useRef<string | null>(null);
  const payRemainingRequestGeneration = useRef(0);
  const currentExpenseId = useRef(id);
  const [amountState, setAmountState] = useState({ expenseId: id, value: '' });
  const amount = amountState.expenseId === id ? amountState.value : '';
  const [method, setMethod] = useState<ExpensePaymentMethod>('naqd');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [conflict, setConflict] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [payRemainingRefresh, setPayRemainingRefresh] = useState({
    expenseId: id,
    pending: searchParams.get('action') === 'pay_remaining' && canManageFinance,
  });
  const payRemainingRefreshPending =
    payRemainingRefresh.expenseId === id && payRemainingRefresh.pending;
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
  const voidPaymentMutation = useVoidExpensePayment(id ?? '');
  const [voidPaymentTarget, setVoidPaymentTarget] =
    useState<ExpensePayment | null>(null);
  const [voidPaymentConflict, setVoidPaymentConflict] = useState(false);
  const activeDetailQuery = isOwnSettlementView
    ? mySettlementQuery
    : expenseQuery;
  const expense = isOwnSettlementView
    ? mySettlementQuery.data?.expense
    : expenseQuery.data;
  const isNotFound =
    (activeDetailQuery.error as { response?: { status?: number } } | null)
      ?.response?.status === 404;
  const hasPayRemainingIntent =
    !isOwnSettlementView && searchParams.get('action') === 'pay_remaining';
  const backToExpenses = () => {
    if (isOwnSettlementView) {
      return navigate({ to: '/my-settlements' });
    }
    const returnAttentionValues = searchParams.getAll('return_attention');
    const returnAttention =
      returnAttentionValues.length === 1 &&
      returnAttentionValues[0] === 'overdue'
        ? ('overdue' as const)
        : undefined;
    const returnBranchValues = searchParams.getAll('return_branch_id');
    const rawReturnBranchId =
      returnBranchValues.length === 1 ? returnBranchValues[0] : undefined;
    const returnBranchId =
      returnAttention &&
      rawReturnBranchId &&
      rawReturnBranchId.trim() === rawReturnBranchId
        ? rawReturnBranchId
        : undefined;
    const returnScopeValues = searchParams.getAll('return_scope');

    return navigate({
      to: '/expenses',
      search: {
        attention: returnAttention,
        branch_id: returnBranchId,
        scope:
          returnAttention &&
          !returnBranchId &&
          returnScopeValues.length === 1 &&
          returnScopeValues[0] === 'company'
            ? ('company' as const)
            : undefined,
      },
    });
  };

  useLayoutEffect(() => {
    if (currentExpenseId.current !== id) {
      currentExpenseId.current = id;
      payRemainingRequestGeneration.current += 1;
    }
  }, [id]);

  useEffect(() => {
    if (!hasPayRemainingIntent) {
      payRemainingConsumedFor.current = null;
      return;
    }

    const expenseId = id ?? '';
    if (
      location.pathname !== `/expenses/${encodeURIComponent(expenseId)}` ||
      payRemainingConsumedFor.current === expenseId
    ) {
      return;
    }
    payRemainingConsumedFor.current = expenseId;
    const requestGeneration = ++payRemainingRequestGeneration.current;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('tab', 'payments');
        next.delete('action');
        return next;
      },
      { replace: true },
    );
    setPayRemainingRefresh({
      expenseId,
      pending: canManageFinance,
    });
    if (!canManageFinance) return;

    void historyQuery
      .refetch()
      .then((historyResult) => {
        if (
          requestGeneration !== payRemainingRequestGeneration.current ||
          currentExpenseId.current !== expenseId ||
          !historyResult.isSuccess ||
          historyResult.data.expense.id !== expenseId
        ) {
          return;
        }
        if (historyResult.data.expense.status === 'partially_paid') {
          setAmountState({
            expenseId,
            value: historyResult.data.expense.remaining_amount,
          });
        }
      })
      .catch(() => {
        // Keep the current form value when the authoritative refresh fails.
      })
      .finally(() => {
        if (requestGeneration === payRemainingRequestGeneration.current) {
          setPayRemainingRefresh({ expenseId, pending: false });
        }
      });
  }, [
    canManageFinance,
    hasPayRemainingIntent,
    historyQuery,
    id,
    location.pathname,
    setSearchParams,
  ]);

  if (!canAccessDetail) {
    return (
      <EntityDetailShell
        onBack={() => navigate({ to: '/dashboard' })}
        backLabel={t('expenses.detail.back')}
        isLoading
        isError={false}
      />
    );
  }

  if (activeDetailQuery.isLoading) {
    return (
      <EntityDetailShell
        onBack={backToExpenses}
        backLabel={
          isOwnSettlementView
            ? t('my_settlements.detail.back')
            : t('expenses.detail.back')
        }
        isLoading
        isError={false}
      />
    );
  }

  if (activeDetailQuery.isError) {
    return (
      <EntityDetailShell
        onBack={backToExpenses}
        backLabel={
          isOwnSettlementView
            ? t('my_settlements.detail.back')
            : t('expenses.detail.back')
        }
        isLoading={false}
        isError
        errorTitle={t(
          isNotFound
            ? isOwnSettlementView
              ? 'my_settlements.not_found'
              : 'expenses.not_found'
            : isOwnSettlementView
              ? 'my_settlements.load_error'
              : 'expenses.load_error',
        )}
        errorDescription={
          isNotFound
            ? t(
                isOwnSettlementView
                  ? 'my_settlements.not_found_desc'
                  : 'expenses.not_found_desc',
              )
            : undefined
        }
        errorIcon={isNotFound ? ShieldCheck : Warning}
        onRetry={
          isNotFound ? undefined : () => void activeDetailQuery.refetch()
        }
        retryLabel={isNotFound ? undefined : t('common.retry')}
      />
    );
  }

  const canViewPaymentHistory = canManageFinance || isOwnSettlementView;
  const initialTab =
    (searchParams.get('tab') === 'payments' || hasPayRemainingIntent) &&
    canViewPaymentHistory
      ? 'payments'
      : 'info';
  const serverExpense = isOwnSettlementView
    ? (mySettlementQuery.data?.expense ?? expense)
    : canManageFinance
      ? (historyQuery.data?.expense ?? expense)
      : expense;
  if (!serverExpense) {
    return (
      <EntityDetailShell
        onBack={backToExpenses}
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
  const paymentControlsDisabled =
    paymentMutation.isPending ||
    payRemainingRefreshPending ||
    (hasPayRemainingIntent && canManageFinance);

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
        void backToExpenses();
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

  const handleVoidPaymentConfirm = (reason: string) => {
    if (!voidPaymentTarget) return;

    setVoidPaymentConflict(false);
    voidPaymentMutation.mutate(
      {
        paymentId: voidPaymentTarget.id,
        reason,
        expected_version: serverExpense.version,
      },
      {
        onSuccess: () => {
          toast.success(t('expenses.payments.void_success'));
          setVoidPaymentTarget(null);
          setVoidPaymentConflict(false);
          void Promise.all([expenseQuery.refetch(), historyQuery.refetch()]);
        },
        onError: (error: unknown) => {
          const status = (error as { response?: { status?: number } }).response
            ?.status;
          if (status === 409) {
            setVoidPaymentConflict(true);
            void Promise.all([expenseQuery.refetch(), historyQuery.refetch()]);
            return;
          }
          mutationErrorToast(error, t);
        },
      },
    );
  };

  return (
    <EntityDetailShell
      onBack={backToExpenses}
      backLabel={
        isOwnSettlementView
          ? t('my_settlements.detail.back')
          : t('expenses.detail.back')
      }
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
      <Tabs
        key={`${id}-${initialTab}`}
        defaultValue={initialTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="info">{t('common.tab_info')}</TabsTrigger>
          {canViewPaymentHistory && (
            <TabsTrigger value="payments">
              {t('expenses.payments.title')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info">
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
              value={
                serverExpense.branch_name ?? t('expenses.form.company_wide')
              }
            />
            {serverExpense.vehicle_plate_number && (
              <DetailField
                label={t('expenses.detail.vehicle')}
                value={serverExpense.vehicle_plate_number}
              />
            )}
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
        </TabsContent>

        {canViewPaymentHistory && (
          <TabsContent value="payments">
            <section className="glass-card space-y-4 p-5">
              <h2 className="font-heading text-lg font-semibold">
                {t('expenses.payments.title')}
              </h2>
              {(() => {
                const paymentsQuery = isOwnSettlementView
                  ? mySettlementQuery
                  : historyQuery;
                const payments = isOwnSettlementView
                  ? (mySettlementQuery.data?.payments ?? [])
                  : (historyQuery.data?.payments ?? []);
                return (
                  <>
                    {paymentsQuery.isLoading && (
                      <p className="text-sm text-muted-foreground">
                        {t('expenses.payments.loading')}
                      </p>
                    )}
                    {paymentsQuery.isError && (
                      <div className="flex items-center gap-3 text-sm">
                        <span>{t('expenses.payments.error')}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void paymentsQuery.refetch()}
                        >
                          {t('common.retry')}
                        </Button>
                      </div>
                    )}
                    {!paymentsQuery.isLoading &&
                      !paymentsQuery.isError &&
                      payments.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          {t('expenses.payments.empty')}
                        </p>
                      )}
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              payment.voided_at
                                ? 'text-muted-foreground line-through'
                                : ''
                            }
                          >
                            {formatAmount(
                              payment.amount,
                              t('expenses.currency'),
                            )}{' '}
                            ·{' '}
                            {t(
                              `expenses.payments.methods.${payment.payment_method}`,
                            )}{' '}
                            · {payment.date}
                          </span>
                          {payment.voided_at && payment.void_reason && (
                            <span className="text-xs text-muted-foreground italic">
                              ({payment.void_reason})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {payment.voided_at ? (
                            <Badge
                              variant="outline"
                              className="border-destructive/30 text-destructive bg-destructive/5"
                            >
                              {t('expenses.payments.voided')}
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="secondary">
                                {t('expenses.payments.active')}
                              </Badge>
                              {canManageFinance && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => {
                                    setVoidPaymentTarget(payment);
                                    setVoidPaymentConflict(false);
                                  }}
                                  disabled={voidPaymentMutation.isPending}
                                >
                                  {t('expenses.payments.void_action')}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
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
                          idempotency_key:
                            paymentAttempt.current.idempotencyKey,
                          expected_version: serverExpense.version,
                        },
                        {
                          onSuccess: () => {
                            setAmountState({ expenseId: id, value: '' });
                            setDate('');
                            setNote('');
                            paymentAttempt.current = null;
                          },
                          onError: (error) => {
                            if (
                              (error as { response?: { status?: number } })
                                .response?.status === 409
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
                      onChange={(e) =>
                        setAmountState({ expenseId: id, value: e.target.value })
                      }
                      placeholder="0.00"
                      disabled={paymentControlsDisabled}
                      required
                    />
                    <select
                      aria-label={t('expenses.payments.method')}
                      value={method}
                      onChange={(e) =>
                        setMethod(e.target.value as ExpensePaymentMethod)
                      }
                      disabled={paymentControlsDisabled}
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
                      disabled={paymentControlsDisabled}
                      required
                    />
                    <Input
                      aria-label={t('expenses.payments.note')}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={paymentControlsDisabled}
                    />
                    <Button type="submit" disabled={paymentControlsDisabled}>
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
          </TabsContent>
        )}
      </Tabs>
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
      {voidPaymentTarget && (
        <VoidPaymentDialog
          key={voidPaymentTarget.id}
          open={!!voidPaymentTarget}
          loading={voidPaymentMutation.isPending}
          conflict={voidPaymentConflict}
          onClose={() => {
            if (!voidPaymentMutation.isPending) {
              setVoidPaymentTarget(null);
              setVoidPaymentConflict(false);
            }
          }}
          onConfirm={handleVoidPaymentConfirm}
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
