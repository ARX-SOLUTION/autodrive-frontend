import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Warning, X } from '@phosphor-icons/react';
import {
  isValidUzPhone,
  uzPhoneE164,
  formatUzPhoneInput,
  uzLocalDigits,
} from '@/lib/phoneFormater';
import { groupDigits } from '@/lib/money';
import {
  Student,
  CourseType,
  PaymentMethod,
  ResultStatus,
  StudentStatus,
} from '@/types/student';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentExamsTab } from './StudentExamsTab';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
import { useDebounce } from '@/hooks/useDebounce';
import { useBranches } from '@/services/branchService';
import { useCourses } from '@/services/courseService';
import { useGroups } from '@/services/groupService';
import { useStudentsPage } from '@/services/studentService';
import { User } from '@/types/user';

export interface CreateStudentPayload {
  first_name: string;
  last_name: string;
  phone: string;
  course_type: CourseType;
  total_price: number;
  amount_paid?: number;
  initial_payment?: number;
  payment_method?: PaymentMethod;
  group_id?: string;
  branch_id?: string;
  completion_date?: string;
  contract_number?: string;
  o83?: boolean;
  has_document?: boolean;
  result?: ResultStatus;
  notes?: string;
  status?: StudentStatus;
  registered_by?: string;
}

// Factory so the phone error can be localized via t(); other messages stay as
// their existing literals (out of scope to translate here).
const makeStudentFormSchema = (t: (key: string) => string) =>
  z.object({
    first_name: z.string().min(1, 'Required'),
    last_name: z.string().min(1, 'Required'),
    phone: z.string().refine(isValidUzPhone, t('students.phone_invalid')),
    course_type: z.enum(['tezkor', 'avto_maktab']),
    branch_id: z
      .string()
      .min(1, 'Branch not selected. Please select a branch.'),
    payment_method: z.enum(['naqd', 'karta', 'perechisleniya']).optional(),
    result: z.enum(['oqimoqda', 'topshirdi', 'yiqildi']).optional(),
    has_document: z.boolean().optional(),
    o83: z.boolean().optional(),
    total_price: z.coerce.number().nonnegative('Required'),
    amount_paid: z.coerce.number().nonnegative().optional(),
    initial_payment: z.coerce.number().nonnegative().optional(),
    group_id: z.string().optional(),
    course_id: z.string().optional(),
    completion_date: z.string().optional(),
    contract_number: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['active', 'completed', 'dropped', 'suspended']).optional(),
    registered_by: z.string().optional(),
  });

type StudentFormValues = z.infer<ReturnType<typeof makeStudentFormSchema>>;

interface StudentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStudentPayload) => void;
  onSaveAndAdd?: (data: CreateStudentPayload) => void;
  loading?: boolean;
  student?: Student | null;
  courseType: CourseType;
  operators?: User[];
  disabledFields?: string[];
  defaultBranchId?: string;
  // Rendered at the top of the dialog — the quick/detailed mode toggle.
  detailedToggle?: ReactNode;
  // Lets a parent (e.g. the quick/detailed toggle) know when it's unsafe to
  // switch modes without losing typed data.
  onDirtyChange?: (dirty: boolean) => void;
}

const StudentModal = ({
  open,
  onClose,
  onSubmit,
  onSaveAndAdd,
  loading,
  student,
  courseType,
  operators = [],
  disabledFields = [],
  defaultBranchId,
  detailedToggle,
  onDirtyChange,
}: StudentModalProps) => {
  const { t } = useTranslation();
  const canAssignBranch = useCan('assignBranch');
  const user = useAuthStore((s) => s.user);
  const { data: branches } = useBranches();
  const { data: groups, refetch: refetchGroups } = useGroups();

  const studentFormSchema = useMemo(() => makeStudentFormSchema(t), [t]);

  const branchList = branches || [];

  const defaultFormValues = (): StudentFormValues => ({
    first_name: '',
    last_name: '',
    phone: '+998',
    course_type: courseType,
    branch_id: canAssignBranch ? defaultBranchId || '' : user?.branch_id || '',
    payment_method: 'naqd',
    result: 'oqimoqda',
    has_document: false,
    o83: false,
    // Real price comes from the selected Course (see courseList effect below);
    // 0 until a course is picked/auto-selected.
    total_price: 0,
    amount_paid: 0,
    initial_payment: 0,
    group_id: '',
    course_id: '',
    completion_date: '',
    contract_number: '',
    notes: '',
    status: 'active',
    registered_by: '',
  });

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: defaultFormValues(),
  });

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  // ponytail: ref tracks which submit button was clicked; defaults to 'close' so Enter → Save
  const submitModeRef = useRef<'close' | 'add'>('close');

  const resetForNext = () => {
    const current = form.getValues();
    form.reset({
      ...current,
      first_name: '',
      last_name: '',
      phone: '+998',
      amount_paid: 0,
      initial_payment: 0,
      notes: '',
      completion_date: '',
      contract_number: '',
      registered_by: '',
    });
    form.setFocus('last_name');
  };

  const [debt, setDebt] = useState(0);

  const watchedTotalPrice = form.watch('total_price');
  const watchedAmountPaid = form.watch('amount_paid');
  const watchedInitialPayment = form.watch('initial_payment');
  const watchedBranchId = form.watch('branch_id');
  const watchedGroupId = form.watch('group_id');
  const watchedCourseId = form.watch('course_id');
  const watchedRegisteredBy = form.watch('registered_by');
  const watchedLastName = form.watch('last_name');
  const watchedPhone = form.watch('phone');

  // autodrive-553: create-time duplicate check -- phone primarily (once
  // enough digits are typed), last name secondarily. Debounced like
  // PaymentModal/ReferralFields' search comboboxes, but rendered as a
  // dismissible list rather than a picker (no selection, just links out),
  // so it's a direct, consistent copy of the debounce+query shape rather
  // than a forced shared abstraction with those two.
  const dupPhoneDigits = uzLocalDigits(watchedPhone);
  const dupSearchQuery =
    dupPhoneDigits.length >= 4
      ? dupPhoneDigits
      : watchedLastName.trim().length >= 2
        ? watchedLastName.trim()
        : '';
  const debouncedDupQuery = useDebounce(dupSearchQuery, 300);
  const [dupWarningDismissed, setDupWarningDismissed] = useState(false);

  useEffect(() => {
    setDupWarningDismissed(false);
  }, [debouncedDupQuery]);

  const { data: dupMatchesPage } = useStudentsPage(
    undefined,
    watchedBranchId || user?.branch_id,
    1,
    5,
    undefined,
    {
      search: debouncedDupQuery,
      enabled: open && !student && debouncedDupQuery.length >= 2,
    },
  );
  const dupMatches = !student ? (dupMatchesPage?.data ?? []) : [];

  // autodrive-0d6: total_price used to be a hardcoded constant per
  // courseType. Real prices now live on Course rows, scoped by branch +
  // course_type — fetch them and let the picker below drive the pre-fill.
  const { data: courses } = useCourses({
    branchId: watchedBranchId || user?.branch_id,
    courseType,
  });
  const activeCourseList = (courses || []).filter((c) => c.is_active);

  useEffect(() => {
    if (student) return; // course picker/pre-fill is create-flow only
    if (activeCourseList.length === 1) {
      const only = activeCourseList[0];
      if (watchedCourseId !== only.id) {
        form.setValue('course_id', only.id);
        form.setValue('total_price', only.price);
      }
    } else if (
      watchedCourseId &&
      !activeCourseList.some((c) => c.id === watchedCourseId)
    ) {
      form.setValue('course_id', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourseList, student, watchedCourseId]);

  const groupList = (groups || []).filter(
    (g) =>
      (g.course_type === courseType || !g.course_type) &&
      (!watchedBranchId || g.branch_id === watchedBranchId),
  );
  const operatorList = operators.filter(
    (op) => !watchedBranchId || op.branch_id === watchedBranchId,
  );

  const localizedPaymentMethods: Record<PaymentMethod, string> = {
    naqd: t('students.payment_cash'),
    karta: t('students.payment_card'),
    perechisleniya: t('students.payment_transfer'),
  };

  const localizedResultLabels: Record<ResultStatus, string> = {
    oqimoqda: t('students.status_studying'),
    topshirdi: t('students.status_passed'),
    yiqildi: t('students.status_failed'),
  };

  // autodrive-rz3.1: Student.status (enrollment lifecycle) is separate from
  // `result` (exam outcome) above -- distinct field, distinct label set.
  const localizedStudentStatusLabels: Record<StudentStatus, string> = {
    active: t('students.status_active'),
    completed: t('students.status_completed'),
    dropped: t('students.status_dropped'),
    suspended: t('students.status_suspended'),
  };

  useEffect(() => {
    if (open) {
      // A group created elsewhere (e.g. GroupsPage) otherwise wouldn't show
      // up here until reload — staleTime/refetchOnWindowFocus are off
      // (queryClient.ts), so force a fresh fetch whenever the modal opens.
      refetchGroups();
      if (student) {
        form.reset({
          first_name: student.first_name,
          last_name: student.last_name,
          phone: student.phone,
          course_type: student.course_type,
          branch_id: student.branch_id,
          // Student.payment_method can be null (never paid); the edit
          // form's field is a required select, so fall back to a default.
          payment_method: student.payment_method ?? 'naqd',
          result: student.result,
          has_document: student.has_document,
          o83: student.o83,
          total_price: student.total_price,
          // For tezkor edit, amount_paid means "ADD new payment" (backend is additive) — default 0.
          // For avto_maktab edit, initial_payment is ignored by backend update — keep historical for display.
          amount_paid: 0,
          initial_payment: student.initial_payment || 0,
          group_id: student.group_id || '',
          course_id: '',
          completion_date:
            student.completion_date === undefined
              ? ''
              : student.completion_date,
          contract_number: student.contract_number || '',
          notes: student.notes === undefined ? '' : student.notes,
          status: student.status || 'active',
          registered_by: student.registered_by_id || '',
        });
      } else {
        form.reset(defaultFormValues());
        // Focus first field after dialog animation settles
        setTimeout(() => form.setFocus('last_name'), 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, courseType, open]);

  useEffect(() => {
    if (student) {
      // Both course types: amount_paid in edit mode = additional new payment
      // (backend adds it). Advance payments (autodrive-6cq.11.6) are allowed,
      // so this can go negative (credit) — do not clamp to 0.
      setDebt((student.debt || 0) - (Number(watchedAmountPaid) || 0));
    } else {
      const total = Number(watchedTotalPrice) || 0;
      const paid =
        courseType === 'tezkor'
          ? Number(watchedAmountPaid) || 0
          : Number(watchedInitialPayment) || 0;
      setDebt(total - paid);
    }
  }, [
    watchedTotalPrice,
    watchedAmountPaid,
    watchedInitialPayment,
    courseType,
    student,
  ]);

  useEffect(() => {
    if (watchedGroupId && !groupList.some((g) => g.id === watchedGroupId)) {
      form.setValue('group_id', '');
    }
    if (
      watchedRegisteredBy &&
      !operatorList.some((op) => op.id === watchedRegisteredBy)
    ) {
      form.setValue('registered_by', '');
    }
  }, [form, groupList, operatorList, watchedGroupId, watchedRegisteredBy]);

  const onFormValid = async (values: StudentFormValues) => {
    const payload: CreateStudentPayload = {
      first_name: values.first_name,
      last_name: values.last_name,
      phone: uzPhoneE164(values.phone),
      course_type: courseType,
      total_price: Number(values.total_price),
      payment_method: values.payment_method || undefined,
      branch_id: values.branch_id || undefined,
      result: values.result,
      has_document: values.has_document,
      notes: values.notes || undefined,
      status: values.status || 'active',
      registered_by: values.registered_by || undefined,
    };

    if (courseType === 'tezkor') {
      payload.amount_paid = Number(values.amount_paid) || 0;
      payload.group_id = values.group_id || undefined;
    } else {
      payload.initial_payment = Number(values.initial_payment) || 0;
      payload.group_id = values.group_id || undefined;
      payload.completion_date = values.completion_date || undefined;
      payload.contract_number = values.contract_number || undefined;
      payload.o83 = values.o83;
      // Edit-only: send additional payment for avto_maktab too (backend handles dto.amount_paid as additive on update)
      if (student && (Number(values.amount_paid) || 0) > 0) {
        payload.amount_paid = Number(values.amount_paid);
      }
    }

    const mode = submitModeRef.current;
    submitModeRef.current = 'close'; // reset for next submission

    if (mode === 'add' && onSaveAndAdd) {
      onSaveAndAdd(payload);
      resetForNext();
    } else {
      await onSubmit(payload);
    }
  };

  const handleSubmit = form.handleSubmit(onFormValid);

  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(form.formState.isDirty || !!loading, onClose);

  const formatMoney = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);
  // ponytail: plain digit-stripping parse, no masking lib — caret can jump
  // to end when editing mid-number, acceptable for a whole-soum amount field.
  const parseMoneyInput = (v: string) => Number(v.replace(/\D/g, '')) || 0;
  const currentBranchName =
    branchList.find((b) => b.id === watchedBranchId)?.name ||
    watchedBranchId ||
    '';

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && attemptClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {student ? t('students.edit') : t('students.add')}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (
                {courseType === 'tezkor'
                  ? t('students.course_fast')
                  : t('students.course_school')}
                )
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('students.form_desc')}
            </DialogDescription>
          </DialogHeader>

          {detailedToggle && (
            <div className="mt-2 flex items-center">{detailedToggle}</div>
          )}

          <Tabs defaultValue="info" className="w-full mt-2">
            {student && (
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="info">{t('common.tab_info')}</TabsTrigger>
                <TabsTrigger value="exams">
                  {t('students.tab_exams')}
                </TabsTrigger>
              </TabsList>
            )}
            <TabsContent value="info" className="m-0">
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('students.last_name')} *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              autoComplete="family-name"
                              className="bg-secondary border-border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('students.first_name')} *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              autoComplete="given-name"
                              className="bg-secondary border-border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('students.phone')} *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              placeholder="+998 90 123 45 67"
                              className="bg-secondary border-border"
                              value={formatUzPhoneInput(field.value)}
                              onChange={(e) =>
                                field.onChange(
                                  formatUzPhoneInput(e.target.value),
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
                      name="branch_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('students.detail.branch')}</FormLabel>
                          {canAssignBranch ? (
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-secondary border-border">
                                  <SelectValue
                                    placeholder={t('common.select_placeholder')}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {branchList.map((b) => (
                                  <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <FormControl>
                              <Input
                                value={currentBranchName}
                                disabled
                                className="bg-muted border-border"
                              />
                            </FormControl>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {!student && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                      <FormField
                        control={form.control}
                        name="course_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('students.course')}</FormLabel>
                            <Select
                              value={field.value || ''}
                              onValueChange={(v) => {
                                field.onChange(v);
                                const selected = activeCourseList.find(
                                  (c) => c.id === v,
                                );
                                if (selected)
                                  form.setValue('total_price', selected.price);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-secondary border-border">
                                  <SelectValue
                                    placeholder={t('common.select_placeholder')}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {activeCourseList.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                    <FormField
                      control={form.control}
                      name="total_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('students.total_price')} *</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              {...field}
                              value={
                                field.value
                                  ? groupDigits(String(field.value))
                                  : ''
                              }
                              onChange={(e) =>
                                field.onChange(parseMoneyInput(e.target.value))
                              }
                              disabled={disabledFields.includes('total_price')}
                              className={`${disabledFields.includes('total_price') ? 'bg-muted' : 'bg-secondary'} border-border`}
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
                        <FormItem>
                          <FormLabel>{t('students.payment_method')}</FormLabel>
                          <Select
                            value={field.value || 'naqd'}
                            onValueChange={(v) =>
                              field.onChange(v as PaymentMethod)
                            }
                            disabled={disabledFields.includes('payment_method')}
                          >
                            <FormControl>
                              <SelectTrigger
                                className={`${disabledFields.includes('payment_method') ? 'bg-muted' : 'bg-secondary'} border-border`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(localizedPaymentMethods).map(
                                ([k, v]) => (
                                  <SelectItem key={k} value={k}>
                                    {v}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {courseType === 'tezkor' ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                        <FormField
                          control={form.control}
                          name="amount_paid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {student
                                  ? t('students.extra_payment')
                                  : t('students.payment_amount')}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  {...field}
                                  value={
                                    field.value
                                      ? groupDigits(String(field.value))
                                      : ''
                                  }
                                  onChange={(e) =>
                                    field.onChange(
                                      parseMoneyInput(e.target.value),
                                    )
                                  }
                                  placeholder={
                                    student
                                      ? t('students.extra_payment_placeholder')
                                      : '0'
                                  }
                                  className="bg-secondary border-border"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="space-y-2">
                          <Label>
                            {student
                              ? t('students.current_debt')
                              : t('students.debt')}
                          </Label>
                          <Input
                            value={
                              debt < 0
                                ? `${t('students.credit_label')}: ${formatMoney(Math.abs(debt))}`
                                : formatMoney(debt)
                            }
                            disabled
                            className={`bg-muted border-border font-medium ${debt < 0 ? 'text-success' : 'text-destructive'}`}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                        <FormField
                          control={form.control}
                          name="group_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('students.group')}</FormLabel>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-secondary border-border">
                                    <SelectValue
                                      placeholder={t(
                                        'common.select_placeholder',
                                      )}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {groupList.map((g) => (
                                    <SelectItem key={g.id} value={g.id}>
                                      {g.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                        <FormField
                          control={form.control}
                          name="initial_payment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t('students.initial_payment')}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  {...field}
                                  value={
                                    field.value
                                      ? groupDigits(String(field.value))
                                      : ''
                                  }
                                  onChange={(e) =>
                                    field.onChange(
                                      parseMoneyInput(e.target.value),
                                    )
                                  }
                                  disabled={
                                    !!student ||
                                    disabledFields.includes('initial_payment')
                                  }
                                  className={`${!!student || disabledFields.includes('initial_payment') ? 'bg-muted' : 'bg-secondary'} border-border`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="space-y-2">
                          <Label>
                            {student
                              ? t('students.current_debt')
                              : t('students.debt')}
                          </Label>
                          <Input
                            value={
                              debt < 0
                                ? `${t('students.credit_label')}: ${formatMoney(Math.abs(debt))}`
                                : formatMoney(debt)
                            }
                            disabled
                            className={`bg-muted border-border font-medium ${debt < 0 ? 'text-success' : 'text-destructive'}`}
                          />
                        </div>
                      </div>
                      {student && (
                        <FormField
                          control={form.control}
                          name="amount_paid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t('students.extra_payment')}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  {...field}
                                  value={
                                    field.value
                                      ? groupDigits(String(field.value))
                                      : ''
                                  }
                                  onChange={(e) =>
                                    field.onChange(
                                      parseMoneyInput(e.target.value),
                                    )
                                  }
                                  placeholder={t(
                                    'students.extra_payment_placeholder',
                                  )}
                                  className="bg-secondary border-border"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                        <FormField
                          control={form.control}
                          name="group_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('students.group')}</FormLabel>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-secondary border-border">
                                    <SelectValue
                                      placeholder={t(
                                        'common.select_placeholder',
                                      )}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {groupList.map((g) => (
                                    <SelectItem key={g.id} value={g.id}>
                                      {g.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="completion_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t('students.completion_date')}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value || ''}
                                  className="bg-secondary border-border"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contract_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t('students.contract_number')}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value || ''}
                                  placeholder="C-201"
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
                        name="o83"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value || false}
                                onCheckedChange={(v) => field.onChange(!!v)}
                                id="o83"
                              />
                            </FormControl>
                            <FormLabel htmlFor="o83" className="!mt-0">
                              O83
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {operators.length > 0 && (
                    <FormField
                      control={form.control}
                      name="registered_by"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('students.operator')}</FormLabel>
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue
                                  placeholder={t('students.operator_optional')}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {operatorList.map((op) => (
                                <SelectItem key={op.id} value={op.id}>
                                  {op.name || op.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                    <FormField
                      control={form.control}
                      name="result"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('students.result')}</FormLabel>
                          <Select
                            value={field.value || 'oqimoqda'}
                            onValueChange={(v) =>
                              field.onChange(v as ResultStatus)
                            }
                          >
                            <FormControl>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(localizedResultLabels).map(
                                ([k, v]) => (
                                  <SelectItem key={k} value={k}>
                                    {v}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* autodrive-rz3.1: edit-only -- a brand-new student is
                        always 'active' (defaultFormValues), so create mode
                        has nothing useful to pick here. */}
                    {student && (
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('students.status')}</FormLabel>
                            <Select
                              value={field.value || 'active'}
                              onValueChange={(v) =>
                                field.onChange(v as StudentStatus)
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="bg-secondary border-border">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(
                                  localizedStudentStatusLabels,
                                ).map(([k, v]) => (
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
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="has_document"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={(v) => field.onChange(!!v)}
                            id="doc"
                          />
                        </FormControl>
                        <FormLabel htmlFor="doc" className="!mt-0">
                          {t('students.has_document')}
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('students.notes')}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ''}
                            placeholder={t('students.notes_placeholder')}
                            rows={3}
                            className="bg-secondary border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!student &&
                    dupMatches.length > 0 &&
                    !dupWarningDismissed && (
                      <div className="flex items-start justify-between gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-medium text-warning">
                            <Warning className="h-4 w-4 shrink-0" />
                            {t('students.duplicate_warning.title')}
                          </div>
                          <p className="text-muted-foreground">
                            {t('students.duplicate_warning.desc')}
                          </p>
                          <ul className="space-y-1">
                            {dupMatches.map((m) => (
                              <li key={m.id}>
                                <Link
                                  to={`/students/${m.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {m.last_name} {m.first_name} · {m.phone}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDupWarningDismissed(true)}
                          aria-label={t('common.close')}
                          // ponytail: visible icon stays 16px (fits the
                          // compact warning banner) -- after:-inset-3.5 grows
                          // the invisible hit area to 44x44 (a11y minimum)
                          // without changing what's drawn. Same after:-inset-N
                          // technique as CompanyRevenueDashboard's recovery-queue
                          // row arrow / components/ui/sidebar.tsx.
                          className="relative text-muted-foreground hover:text-foreground after:absolute after:-inset-3.5"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={attemptClose}
                    >
                      {t('common.cancel')}
                    </Button>
                    {!student && onSaveAndAdd && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={loading || form.formState.isSubmitting}
                        onClick={() => {
                          submitModeRef.current = 'add';
                          form.handleSubmit(onFormValid)();
                        }}
                      >
                        {t('students.save_and_add')}
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={loading || form.formState.isSubmitting}
                      onClick={() => {
                        submitModeRef.current = 'close';
                      }}
                    >
                      {loading || form.formState.isSubmitting
                        ? t('common.saving')
                        : student
                          ? t('common.save')
                          : t('common.add')}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            {student && (
              <TabsContent value="exams" className="m-0">
                <StudentExamsTab student={student} />
              </TabsContent>
            )}
          </Tabs>
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
    </>
  );
};

export default StudentModal;
