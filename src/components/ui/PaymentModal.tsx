import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
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
import { ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
import { useStudentsPage } from '@/services/studentService';
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
import { CourseType, PaymentMethod } from '@/types/student';

export interface CreatePaymentPayload {
  student_id: string;
  amount: number;
  payment_method: PaymentMethod;
  idempotency_key: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
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
  hasDebtOnly?: boolean;
  // Relation-add (bd 6ef.6): when set, the student is fixed (e.g. an
  // "Add payment" button on a student detail card) — the picker is hidden and
  // this id is pinned. UX-only: the backend still derives tenant scope from
  // the JWT and never trusts this value.
  lockedStudentId?: string;
  lockedStudentName?: string;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  naqd: 'Cash',
  karta: 'Card',
  perechisleniya: 'Transfer',
};

const paymentSchema = z.object({
  student_id: z.string().min(1, 'payments.validation.select_student'),
  amount: z.coerce
    .number({ invalid_type_error: 'payments.validation.enter_amount' })
    .positive('payments.validation.amount_positive'),
  payment_method: z.enum(['naqd', 'karta', 'perechisleniya'], {
    required_error: 'payments.validation.select_method',
  }),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const PaymentModal = ({
  open,
  onClose,
  onSubmit,
  loading,
  students = [],
  branchId,
  courseType,
  hasDebtOnly = true,
  lockedStudentId,
  lockedStudentName,
}: PaymentModalProps) => {
  const { t } = useTranslation();
  const form = useForm<PaymentFormValues>({
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
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const {
    data: studentPage,
    isFetching: isStudentsFetching,
    isError: isStudentsError,
  } = useStudentsPage(courseType, branchId, 1, 20, undefined, {
    enabled: open && studentPopoverOpen,
    search: debouncedStudentSearch,
    hasDebt: hasDebtOnly,
    sortBy: 'last_name',
    sortOrder: 'asc',
  });

  useEffect(() => {
    if (open) {
      form.reset({
        student_id: lockedStudentId ?? '',
        amount: 0,
        payment_method: 'naqd',
      });
      setStudentSearch('');
      setSelectedStudentCache(undefined);
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  }, [open, form, lockedStudentId]);

  const studentId = form.watch('student_id');
  const studentOptions = studentPage?.data ?? students;
  const selectedStudent =
    studentOptions.find((s) => s.id === studentId) ?? selectedStudentCache;

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit({ ...values, idempotency_key: idempotencyKeyRef.current });
  });

  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(form.formState.isDirty, onClose);

  const formatMoney = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => !o && !loading && attemptClose()}
      >
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {t('payments.add_payment')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('payments.add_desc')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="student_id"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t('payments.student_name')} *</FormLabel>
                    {lockedStudentId ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        className="w-full justify-start bg-secondary border-border font-normal opacity-100"
                      >
                        {lockedStudentName ??
                          t('students.select_student', {
                            defaultValue: 'Student',
                          })}
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
                              className="w-full justify-between bg-secondary border-border font-normal"
                            >
                              {selectedStudent
                                ? `${selectedStudent.last_name} ${selectedStudent.first_name}`
                                : t('students.select_student', {
                                    defaultValue: 'Select a student',
                                  })}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                              value={studentSearch}
                              onValueChange={setStudentSearch}
                            />
                            <CommandList>
                              {isStudentsFetching ? (
                                <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {t('common.loading')}
                                </div>
                              ) : isStudentsError ? (
                                <div className="px-3 py-6 text-center text-sm text-destructive">
                                  {t('common.error')}
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
                                      {s.last_name} {s.first_name}
                                      {s.debt !== undefined && s.debt > 0 && (
                                        <span className="ml-auto text-xs text-destructive tabular-nums">
                                          {formatMoney(s.debt)} so'm
                                        </span>
                                      )}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                              {!isStudentsFetching &&
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

              {selectedStudent && selectedStudent.debt !== undefined && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm tabular-nums">
                  <span className="text-muted-foreground">
                    {t('payments.remaining_debt')}:{' '}
                  </span>
                  <span className="font-medium text-destructive">
                    {formatMoney(selectedStudent.debt)} so'm
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
                        type="number"
                        inputMode="decimal"
                        min={1}
                        placeholder="0"
                        className="bg-secondary border-border"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? 0 : Number(e.target.value),
                          )
                        }
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
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(paymentMethodLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
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
                  disabled={loading || form.formState.isSubmitting}
                >
                  {loading ? t('common.saving') : t('common.add')}
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
      />
    </>
  );
};

export default PaymentModal;
