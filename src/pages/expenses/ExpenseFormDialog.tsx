import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
import { useCan } from '@/hooks/useCan';
import { mutationErrorToast } from '@/lib/mutationErrorToast';
import { useCreateExpense, useUpdateExpense } from '@/services/expenseService';
import type {
  Expense,
  ExpenseBranchOption,
  UpdateExpensePayload,
} from '@/types/expense';
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
import { cn } from '@/lib/utils';
import { parseCalendarDate } from '@/lib/calendarDate';

const isBusinessDate = (value: string) => {
  return Boolean(parseCalendarDate(value));
};

const canonicalAmount = (value: string) => {
  const [whole, fraction = ''] = value.trim().split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
};

const MONEY_PATTERN = /^(?:0|[1-9]\d{0,9})\.\d{2}$/;

const makeExpenseFormSchema = (t: (key: string) => string) =>
  z.object({
    branchTarget: z.string().min(1, t('common.required')),
    category: z.enum([
      'rent',
      'utilities',
      'vehicle',
      'marketing',
      'supplies',
      'administrative',
      'other',
    ]),
    title: z.string().trim().min(1, t('common.required')),
    amount: z
      .string()
      .trim()
      .refine((value) => {
        const canonical = canonicalAmount(value);
        return MONEY_PATTERN.test(canonical) && Number(canonical) > 0;
      }, t('expenses.form.invalid_amount')),
    expenseDate: z
      .string()
      .trim()
      .refine(isBusinessDate, t('expenses.form.invalid_date')),
    dueDate: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine(
        (value) => !value || isBusinessDate(value),
        t('expenses.form.invalid_date'),
      ),
    payee: z.string().trim().optional(),
    note: z.string().trim().optional(),
  });

type ExpenseFormValues = z.infer<ReturnType<typeof makeExpenseFormSchema>>;

interface ExpenseFormDialogProps {
  open: boolean;
  branches: ExpenseBranchOption[];
  editExpense?: Expense | null;
  onClose: () => void;
}

export const ExpenseFormDialog = ({
  open,
  branches,
  editExpense = null,
  onClose,
}: ExpenseFormDialogProps) => {
  const { t } = useTranslation();
  const canViewExpenses = useCan('viewExpenses');
  const canManageFinance = useCan('manageCompanyFinance');
  const isManager = canViewExpenses && !canManageFinance;
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const [conflict, setConflict] = useState(false);
  const financialFieldsLocked = Boolean(
    editExpense &&
    (editExpense.has_payment_history === true ||
      editExpense.paid_amount !== '0.00'),
  );

  const defaultValues = (): ExpenseFormValues =>
    editExpense
      ? {
          branchTarget: editExpense.branch_id ?? 'company',
          category:
            editExpense.category === 'teacher_settlement'
              ? 'other'
              : editExpense.category,
          title: editExpense.title,
          amount: editExpense.amount,
          expenseDate: editExpense.expense_date,
          dueDate: editExpense.due_date ?? '',
          payee: editExpense.payee ?? '',
          note: editExpense.note ?? '',
        }
      : {
          branchTarget: 'company',
          category: 'rent',
          title: '',
          amount: '',
          expenseDate: '',
          dueDate: '',
          payee: '',
          note: '',
        };

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(makeExpenseFormSchema(t)),
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultValues());
    if (!editExpense) idempotencyKeyRef.current = crypto.randomUUID();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editExpense?.id]);

  const isPending = createExpense.isPending || updateExpense.isPending;
  const closeDialog = () => {
    setConflict(false);
    onClose();
  };

  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(form.formState.isDirty || isPending, closeDialog);

  const onSubmit = (values: ExpenseFormValues) => {
    setConflict(false);
    const commonPayload = {
      category: values.category,
      title: values.title.trim(),
      amount: canonicalAmount(values.amount),
      expense_date: values.expenseDate,
      due_date: values.dueDate?.trim() || null,
      payee: values.payee?.trim() || null,
      note: values.note?.trim() || null,
    };

    if (editExpense) {
      const payload: UpdateExpensePayload = {
        ...(financialFieldsLocked
          ? {}
          : {
              category: commonPayload.category,
              amount: commonPayload.amount,
              expense_date: commonPayload.expense_date,
            }),
        title: commonPayload.title,
        due_date: commonPayload.due_date,
        payee: commonPayload.payee,
        note: commonPayload.note,
        expected_version: editExpense.version,
        ...(!isManager && !financialFieldsLocked
          ? {
              branch_id:
                values.branchTarget === 'company' ? null : values.branchTarget,
            }
          : {}),
      };
      updateExpense.mutate(
        { id: editExpense.id, ...payload },
        {
          onSuccess: () => {
            toast.success(t('expenses.updated'));
            closeDialog();
          },
          onError: (error) => {
            if (
              (error as { response?: { status?: number } }).response?.status ===
              409
            ) {
              setConflict(true);
              return;
            }
            mutationErrorToast(error, t);
          },
        },
      );
      return;
    }

    const payload = {
      ...commonPayload,
      ...(isManager
        ? {}
        : {
            branch_id:
              values.branchTarget === 'company' ? null : values.branchTarget,
          }),
      idempotency_key: idempotencyKeyRef.current,
    };

    const submitMutation = () =>
      createExpense.mutate(payload, {
        onSuccess: () => {
          toast.success(t('expenses.created'));
          idempotencyKeyRef.current = crypto.randomUUID();
          closeDialog();
        },
        onError: (error) => mutationErrorToast(error, t, submitMutation),
      });

    submitMutation();
  };

  // Keep the RHF ref read inside the submit event rather than during render.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    form.handleSubmit(onSubmit)(event);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && attemptClose()}>
        <DialogContent className="glass-card border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editExpense
                ? t('expenses.form.edit_title')
                : t('expenses.form.title')}
            </DialogTitle>
            <DialogDescription>
              {editExpense
                ? t('expenses.form.edit_description')
                : t('expenses.form.description')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {!isManager && (
                <FormField
                  control={form.control}
                  name="branchTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        {t('expenses.form.branch')}
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={financialFieldsLocked}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue
                              placeholder={t('expenses.form.company_wide')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="company">
                            {t('expenses.form.company_wide')}
                          </SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>
                      {t('expenses.form.category')}
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={financialFieldsLocked}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rent">
                          {t('expenses.category.rent')}
                        </SelectItem>
                        <SelectItem value="utilities">
                          {t('expenses.category.utilities')}
                        </SelectItem>
                        <SelectItem value="vehicle">
                          {t('expenses.category.vehicle')}
                        </SelectItem>
                        <SelectItem value="marketing">
                          {t('expenses.category.marketing')}
                        </SelectItem>
                        <SelectItem value="supplies">
                          {t('expenses.category.supplies')}
                        </SelectItem>
                        <SelectItem value="administrative">
                          {t('expenses.category.administrative')}
                        </SelectItem>
                        <SelectItem value="other">
                          {t('expenses.category.other')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t('expenses.table.title')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-secondary border-border"
                        aria-required="true"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        {t('expenses.form.amount')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="decimal"
                          placeholder={t('expenses.form.amount_placeholder')}
                          className="bg-secondary border-border"
                          aria-required="true"
                          disabled={financialFieldsLocked}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expenseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        {t('expenses.form.expense_date')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="bg-secondary border-border"
                          aria-required="true"
                          disabled={financialFieldsLocked}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('expenses.form.due_date')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="bg-secondary border-border"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('expenses.form.payee')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-secondary border-border"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('expenses.form.note')}</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={4}
                        className={cn(
                          'flex min-h-20 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none',
                          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={attemptClose}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? editExpense
                      ? t('expenses.form.updating')
                      : t('expenses.form.creating')
                    : editExpense
                      ? t('expenses.form.update_submit')
                      : t('expenses.form.submit')}
                </Button>
                {conflict && (
                  <p className="text-sm text-destructive" role="alert">
                    {t('expenses.form.update_conflict')}
                  </p>
                )}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={cancelDiscard}
        onConfirm={confirmDiscard}
        confirmLabel={t('common.discard')}
        description={t('common.discard_changes_desc')}
      />
    </>
  );
};
