import { useAuthStore } from '@/store/authStore';
import { useWriteOptions } from '@/hooks/useWriteOptions';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CaretUpDown, Check, CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { formatMoney, groupDigits } from '@/lib/money';
import { newRequestId } from '@/lib/idempotencyKey';
import { formatPhone } from '@/lib/phoneFormater';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
import { useStudentsPage } from '@/features/students/api/studentService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CourseType, PaymentMethod } from '@/features/students/types';
import type { Payment } from '@/features/payments/types';
import type { CreatePaymentRequest } from '@/shared/api/contract';

export type CreatePaymentPayload = CreatePaymentRequest & {
  idempotency_key: string;
};

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  branch_name?: string;
  group_name?: string;
  debt?: number;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePaymentPayload) => void;
  loading?: boolean;
  students?: Student[];
  branchId?: string;
  courseType?: CourseType;
  // Relation-add (bd 6ef.6): when set, the student is fixed (e.g. an
  // "Add payment" button on a student detail card) — the picker is hidden and
  // this id is pinned. UX-only: the backend still derives tenant scope from
  // the JWT and never trusts this value.
  lockedStudentId?: string;
  lockedStudentName?: string;
  // Current debt for the locked student (bd 9e4.2) -- the picker's own
  // studentOptions/selectedStudent lookup never runs when the picker is
  // hidden, so the exceeds-debt check has nothing to compare against unless
  // the caller passes it explicitly.
  lockedStudentDebt?: number;
  // Edit mode: pass the payment being edited. Mirrors StudentModal's
  // create/edit dual-mode convention (`student` prop present = edit) --
  // pins the student (like lockedStudentId) and pre-fills amount/method.
  payment?: Payment | null;
  // Set by the caller when the previous submit attempt on this same open
  // session failed -- shows a "safe to retry" banner instead of the modal
  // silently closing or looking like nothing happened.
  submitError?: boolean;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  naqd: 'payments.method.naqd',
  karta: 'payments.method.karta',
  perechisleniya: 'payments.method.perechisleniya',
};

const paymentSchema = z.object({
  student_id: z.string().min(1, 'payments.validation.select_student'),
  amount: z.coerce
    .number({ error: 'payments.validation.enter_amount' })
    .positive('payments.validation.amount_positive'),
  payment_method: z.enum(['naqd', 'karta', 'perechisleniya'], {
    error: 'payments.validation.select_method',
  }),
});

type PaymentFormInput = z.input<typeof paymentSchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;

const PaymentModal = ({
  open,
  onClose,
  onSubmit,
  loading,
  students = [],
  branchId,
  courseType,
  lockedStudentId,
  lockedStudentName,
  lockedStudentDebt,
  payment,
  submitError,
}: PaymentModalProps) => {
  const { t } = useTranslation();
  const scopedUser = useAuthStore(
    (state) => state.user?.permissions !== undefined,
  );
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const isEdit = !!payment;
  const [lookupBranchId, setLookupBranchId] = useState<string | undefined>();
  const form = useForm<PaymentFormInput, unknown, PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      student_id: '',
      amount: 0,
      payment_method: 'naqd',
    },
  });

  const [studentPopoverOpen, setStudentPopoverOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentCache, setSelectedStudentCache] = useState<
    Student | undefined
  >();
  const debouncedStudentSearch = useDebounce(studentSearch, 300);
  // ponytail (M1): stable per modal-open, so a retried/double-clicked submit
  // reuses the same key; reopening the modal for a new payment gets a fresh one.
  // Lazy useState, not useRef(crypto.randomUUID()) — a useRef argument is
  // re-evaluated every render, and the bare call throws on a non-secure origin.
  const idempotencyKeyRef = useRef('');
  const getIdempotencyKey = () =>
    (idempotencyKeyRef.current ||= newRequestId());
  const submitLockedRef = useRef(false);
  const wasLoadingRef = useRef(false);
  const [submitLocked, setSubmitLocked] = useState(false);

  // Exceeds-debt confirm (bd 9e4.2): a payment amount above the student's
  // current debt is a deliberately supported credit-balance payment, but it
  // still gets a confirm step so it's never an accidental fat-finger.
  const [pendingValues, setPendingValues] = useState<PaymentFormValues | null>(
    null,
  );
  const [exceedsDebtOpen, setExceedsDebtOpen] = useState(false);

  const effectiveLockedId = payment?.student_id ?? lockedStudentId;
  const effectiveLockedName = payment?.student_name ?? lockedStudentName;

  const {
    data: studentPage,
    isFetching: legacyStudentsFetching,
    isError: legacyStudentsError,
  } = useStudentsPage(courseType, branchId, 1, 20, undefined, {
    enabled: open && studentPopoverOpen && !scopedUser,
    search: debouncedStudentSearch,
    sortBy: 'last_name',
    sortOrder: 'asc',
  });

  useEffect(() => {
    if (open) {
      form.reset({
        student_id: payment?.student_id ?? lockedStudentId ?? '',
        amount: payment?.amount_paid ?? 0,
        payment_method: payment?.payment_method ?? 'naqd',
      });
      idempotencyKeyRef.current = newRequestId();
    }
    // `payment` is captured once by the caller at "open edit" time (same
    // convention as StudentsPage's editStudent state) so its identity is
    // stable for the whole open session -- safe as an effect dep here
    // without regenerating idempotencyKeyRef on every parent re-render.
  }, [open, form, lockedStudentId, payment]);

  const [pickerResetKey, setPickerResetKey] = useState({
    open,
    lockedStudentId,
    payment,
  });
  if (
    pickerResetKey.open !== open ||
    pickerResetKey.lockedStudentId !== lockedStudentId ||
    pickerResetKey.payment !== payment
  ) {
    setPickerResetKey({ open, lockedStudentId, payment });
    setStudentSearch('');
    setSelectedStudentCache(undefined);
    setStudentPopoverOpen(false);
  }

  // react-hooks/incompatible-library: form.watch() during render isn't
  // compiler-safe; useWatch({ control }) is RHF's own drop-in replacement.
  const studentId = useWatch({ control: form.control, name: 'student_id' });
  const options = useWriteOptions(
    'payments',
    payment ? 'update' : 'create',
    branchId ?? activeBranchId ?? lookupBranchId,
    open,
  );
  const isStudentsFetching = options.scoped
    ? options.isFetching
    : legacyStudentsFetching;
  const isStudentsError = options.scoped
    ? options.isError
    : legacyStudentsError;
  const studentOptions: Student[] = options.scoped
    ? (options.data?.students ?? [])
        .map((student) => ({
          ...student,
          debt:
            student.total_price === undefined ||
            student.amount_paid === undefined
              ? undefined
              : student.total_price - student.amount_paid,
        }))
        .filter((student) =>
          `${student.last_name} ${student.first_name}`
            .toLowerCase()
            .includes(debouncedStudentSearch.toLowerCase()),
        )
    : (studentPage?.data ?? students);
  const selectedStudent =
    students.find((s) => s.id === studentId) ??
    studentOptions.find((s) => s.id === studentId) ??
    (selectedStudentCache?.id === studentId ? selectedStudentCache : undefined);
  const selectedBranchName =
    selectedStudent?.branch_name ?? payment?.branch_name;

  // Debt baseline for both the info card and the exceeds-debt confirm. Edit
  // mode reconstructs the pre-this-payment debt from the ledger row itself
  // (remaining_debt already has this payment's amount subtracted out) since
  // the picker -- and its debt lookup -- never renders when the student is
  // locked/pinned.
  const effectiveDebt = payment
    ? payment.remaining_debt + payment.amount_paid
    : (selectedStudent?.debt ??
      (lockedStudentId ? lockedStudentDebt : undefined));

  useEffect(() => {
    const mutationSettled = wasLoadingRef.current && !loading;
    wasLoadingRef.current = !!loading;

    if (!open || mutationSettled || submitError) {
      submitLockedRef.current = false;
      // The lock mirrors an external mutation lifecycle, so releasing it when
      // that lifecycle settles is intentionally synchronized from this effect.
      setSubmitLocked(false);
    }
  }, [loading, open, submitError]);

  const doSubmit = (values: PaymentFormValues) => {
    if (submitLockedRef.current) return;

    submitLockedRef.current = true;
    setSubmitLocked(true);

    try {
      onSubmit({ ...values, idempotency_key: getIdempotencyKey() });
    } catch (error) {
      submitLockedRef.current = false;
      setSubmitLocked(false);
      throw error;
    }
  };

  // react-hooks/refs (surfaced once the incompatible-library fix above let
  // the compiler analyze further into this component): form.handleSubmit()
  // was called directly in the render body, and doSubmit() (called from
  // its callback) reads idempotencyKeyRef.current -- the compiler can't
  // prove form.handleSubmit's argument isn't invoked synchronously during
  // render, so it flags the ref read as reachable from render. Deferring
  // the form.handleSubmit(...) call itself into a plain event-handler
  // function (only ever actually invoked by the real submit event, never
  // during render) resolves that without changing anything about when
  // validation or submission happens.
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    form.handleSubmit((values) => {
      if (effectiveDebt !== undefined && values.amount > effectiveDebt) {
        setPendingValues(values);
        setExceedsDebtOpen(true);
        return;
      }
      doSubmit(values);
    })(event);
  };

  const confirmExceedsDebt = () => {
    if (pendingValues) doSubmit(pendingValues);
    setExceedsDebtOpen(false);
    setPendingValues(null);
  };
  const cancelExceedsDebt = () => {
    setExceedsDebtOpen(false);
    setPendingValues(null);
  };

  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(form.formState.isDirty, onClose);

  const creditAmount = pendingValues
    ? pendingValues.amount - (effectiveDebt ?? 0)
    : 0;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => !o && !loading && attemptClose()}
      >
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEdit ? t('payments.edit_payment') : t('payments.add_payment')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isEdit ? t('payments.edit_desc') : t('payments.add_desc')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {options.scoped &&
                !branchId &&
                !activeBranchId &&
                !effectiveLockedId &&
                options.branches.length > 1 && (
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">
                      {t('common.select_branch')}
                    </span>
                    <select
                      className="h-11 w-full rounded-md border border-control-border bg-background px-3"
                      value={options.selectedBranchId ?? ''}
                      onChange={(event) => {
                        setLookupBranchId(event.target.value);
                        form.setValue('student_id', '');
                        setSelectedStudentCache(undefined);
                        setStudentSearch('');
                      }}
                    >
                      <option value="">{t('common.select_branch')}</option>
                      {options.branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

              <FormField
                control={form.control}
                name="student_id"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t('payments.student_name')} *</FormLabel>
                    {effectiveLockedId ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        className="w-full justify-start bg-secondary border-control-border font-normal opacity-100"
                      >
                        {effectiveLockedName ??
                          t('payments.validation.select_student')}
                      </Button>
                    ) : (
                      <Popover
                        open={studentPopoverOpen}
                        onOpenChange={setStudentPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-label={t('payments.student_name')}
                              aria-expanded={studentPopoverOpen}
                              className="w-full justify-between bg-secondary border-control-border font-normal"
                            >
                              {selectedStudent
                                ? `${selectedStudent.last_name} ${selectedStudent.first_name}`
                                : t('payments.validation.select_student')}
                              <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          onWheel={(e) => e.stopPropagation()}
                          style={{
                            width: 'var(--radix-popover-trigger-width)',
                          }}
                          className="w-full p-0"
                          align="start"
                        >
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder={t('payments.search_placeholder')}
                              aria-label={t('payments.search_placeholder')}
                              value={studentSearch}
                              onValueChange={setStudentSearch}
                            />
                            <CommandList>
                              {isStudentsFetching ? (
                                <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                                  <CircleNotch className="h-4 w-4 animate-spin" />
                                  {t('common.loading')}
                                </div>
                              ) : isStudentsError ? (
                                <div className="px-3 py-6 text-center text-sm text-destructive">
                                  {t('common.error')}
                                  {options.scoped && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => void options.refetch()}
                                    >
                                      {t('common.retry')}
                                    </Button>
                                  )}
                                </div>
                              ) : studentOptions.length === 0 ? (
                                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                  {t('payments.not_found')}
                                </div>
                              ) : (
                                <CommandGroup>
                                  {studentOptions.map((s) => (
                                    <CommandItem
                                      key={s.id}
                                      value={s.id}
                                      onSelect={() => {
                                        field.onChange(s.id);
                                        setSelectedStudentCache(s);
                                        setStudentPopoverOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          field.value === s.id
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>
                                          {s.last_name} {s.first_name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatPhone(s.phone)}
                                        </span>
                                      </div>
                                      {s.debt !== undefined && s.debt > 0 && (
                                        <span className="ml-auto text-xs text-destructive tabular-nums">
                                          {formatMoney(s.debt)}
                                        </span>
                                      )}
                                      {s.debt !== undefined && s.debt < 0 && (
                                        <span className="ml-auto text-xs text-success tabular-nums">
                                          {t('students.credit_label')}:{' '}
                                          {formatMoney(Math.abs(s.debt))}
                                        </span>
                                      )}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                              {!options.scoped &&
                                !isStudentsFetching &&
                                (studentPage?.meta.total ?? 0) >
                                  studentOptions.length && (
                                  <div className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
                                    {studentOptions.length} /{' '}
                                    {studentPage?.meta.total}
                                  </div>
                                )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                    <FormMessage>
                      {fieldState.error &&
                        t(fieldState.error.message as string)}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {(selectedStudent?.phone ||
                selectedBranchName ||
                selectedStudent?.group_name) && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  {selectedStudent?.phone && (
                    <p>{formatPhone(selectedStudent.phone)}</p>
                  )}
                  {(selectedBranchName || selectedStudent?.group_name) && (
                    <p>
                      {[selectedBranchName, selectedStudent?.group_name]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              )}

              {effectiveDebt !== undefined && (
                <div
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm tabular-nums',
                    effectiveDebt < 0
                      ? 'bg-success/10 border-success/20'
                      : 'bg-destructive/10 border-destructive/20',
                  )}
                >
                  <span className="text-muted-foreground">
                    {effectiveDebt < 0
                      ? t('students.credit_label')
                      : t('payments.remaining_debt')}
                    :{' '}
                  </span>
                  <span
                    className={cn(
                      'font-medium',
                      effectiveDebt < 0 ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {formatMoney(Math.abs(effectiveDebt))}
                  </span>
                </div>
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t('payments.amount')} *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        className="bg-secondary border-control-border"
                        {...field}
                        value={
                          field.value ? groupDigits(String(field.value)) : ''
                        }
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          field.onChange(digits === '' ? 0 : Number(digits));
                        }}
                      />
                    </FormControl>
                    <FormMessage>
                      {fieldState.error &&
                        t(fieldState.error.message as string)}
                    </FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_method"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t('payments.payment_method')} *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as PaymentMethod)}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-control-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(paymentMethodLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {t(v)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage>
                      {fieldState.error &&
                        t(fieldState.error.message as string)}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {submitError && (
                <div className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning">
                  {t('payments.retry_safe')}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={attemptClose}
                  disabled={loading}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading || submitLocked || form.formState.isSubmitting
                  }
                >
                  {loading
                    ? t('common.saving')
                    : isEdit
                      ? t('common.save')
                      : t('common.add')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onClose={cancelDiscard}
        onConfirm={confirmDiscard}
        title={t('common.discard_changes_title')}
        description={t('common.discard_changes_desc')}
        confirmLabel={t('common.discard')}
      />
      <ConfirmDialog
        open={exceedsDebtOpen}
        onClose={cancelExceedsDebt}
        onConfirm={confirmExceedsDebt}
        title={t('payments.exceeds_debt_title')}
        description={t('payments.exceeds_debt_desc', {
          amount: formatMoney(creditAmount),
        })}
        confirmLabel={t('payments.exceeds_debt_confirm')}
      />
    </>
  );
};

export default PaymentModal;
