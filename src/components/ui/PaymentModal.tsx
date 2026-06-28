import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { PaymentMethod } from '@/types/student';

export interface CreatePaymentPayload {
  student_id: string;
  amount: number;
  payment_method: PaymentMethod;
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
  students: Student[]; // student list for the combobox
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  naqd: 'Cash',
  karta: 'Card',
  perechisleniya: 'Transfer',
};

const paymentSchema = z.object({
  student_id: z.string().min(1, 'Select a student'),
  amount: z.coerce
    .number({ invalid_type_error: 'Enter payment amount' })
    .positive('Payment amount must be greater than 0'),
  payment_method: z.enum(['naqd', 'karta', 'perechisleniya'], {
    required_error: 'Select payment method',
  }),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const PaymentModal = ({
  open,
  onClose,
  onSubmit,
  loading,
  students,
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

  useEffect(() => {
    if (open) {
      form.reset({ student_id: '', amount: 0, payment_method: 'naqd' });
    }
  }, [open, form]);

  const studentId = form.watch('student_id');
  const selectedStudent = students.find((s) => s.id === studentId);

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values);
  });

  const formatMoney = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {t('payments.add_payment')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="student_id"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>{t('payments.student_name')} *</FormLabel>
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
                      style={{ width: 'var(--radix-popover-trigger-width)' }}
                      className="w-full p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          placeholder={t('payments.search_placeholder')}
                        />
                        <CommandList>
                          <CommandEmpty>{t('payments.not_found')}</CommandEmpty>
                          <CommandGroup>
                            {students.map((s) => (
                              <CommandItem
                                key={s.id}
                                value={`${s.last_name} ${s.first_name}`}
                                onSelect={() => {
                                  field.onChange(s.id);
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
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
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
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>{t('payments.amount')} *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
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
  );
};

export default PaymentModal;
