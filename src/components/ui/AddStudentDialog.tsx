import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  isValidUzPhone,
  uzPhoneE164,
  formatUzPhoneInput,
} from '@/lib/phoneFormater';
import { groupDigits } from '@/lib/money';
import type { LeadSource } from '@/types/student';
import ReferralFields from '@/components/ui/ReferralFields';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { useBranches } from '@/services/branchService';
import { useGroups } from '@/services/groupService';
import { useCourses } from '@/services/courseService';

export interface AddStudentPayload {
  // Step 1: Personal info
  first_name: string;
  last_name: string;
  middle_name?: string;
  phone: string;
  email?: string;
  passport_series: string;
  passport_number: string;
  birth_date: string;
  gender: 'MALE' | 'FEMALE';
  address: string;

  // Step 2: Course & Branch
  branch_id: string;
  course_id: string;
  course_type: 'tezkor' | 'avto_maktab';
  course_price: number;
  group_id?: string;
  start_date: string;

  // Step 3: Payment & Confirmation
  payment_type: 'FULL' | 'PARTIAL' | 'INSTALLMENT';
  amount: number;
  payment_method: 'CASH' | 'CARD' | 'TRANSFER';
  first_payment_date: string;
  contract_signed: boolean;

  // Referral / acquisition — all optional.
  lead_source?: LeadSource;
  lead_source_other?: string;
  referred_by_student_id?: string;
  referred_by_user_id?: string;
}

const LEAD_SOURCE_VALUES = [
  'referral',
  'instagram',
  'directory_map',
  'telegram',
  'walk_in',
  'olx',
  'other',
] as const;

// Built via a factory so the phone error can be localized with t(). A static
// instance (keys → identity) drives the inferred types and STEP_FIELDS —
// zod messages don't affect either.
const buildSchemas = (t: (key: string) => string) => {
  const step1 = z.object({
    first_name: z.string().min(1, 'Ism majburiy'),
    last_name: z.string().min(1, 'Familiya majburiy'),
    middle_name: z.string().optional(),
    phone: z.string().refine(isValidUzPhone, t('students.phone_invalid')),
    email: z.string().email("Email noto'g'ri").optional().or(z.literal('')),
    passport_series: z
      .string()
      .min(1, 'Pasport seriyasi majburiy')
      .regex(/^[A-Z]{2}$/, 'Pasport seriyasi: 2 harf (masalan: AA)'),
    passport_number: z
      .string()
      .min(1, 'Pasport raqami majburiy')
      .regex(/^\d{7}$/, 'Pasport raqami: 7 raqam'),
    birth_date: z.string().min(1, "Tug'ilgan sana majburiy"),
    gender: z.enum(['MALE', 'FEMALE']),
    address: z.string().min(5, 'Manzil juda qisqa'),
  });

  const step2 = z.object({
    branch_id: z.string().uuid('Filial tanlanmagan'),
    course_id: z.string().uuid('Kurs tanlanmagan'),
    group_id: z.string().uuid().optional(),
    start_date: z.string().min(1, 'Boshlanish sana majburiy'),
    lead_source: z.enum(LEAD_SOURCE_VALUES).optional(),
    lead_source_other: z.string().optional(),
    referred_by_student_id: z.string().uuid().optional().or(z.literal('')),
    referred_by_user_id: z.string().uuid().optional().or(z.literal('')),
  });

  const step3 = z.object({
    payment_type: z.enum(['FULL', 'PARTIAL', 'INSTALLMENT']),
    amount: z.number().min(1, "Summa 0 dan katta bo'lishi kerak"),
    payment_method: z.enum(['CASH', 'CARD', 'TRANSFER']),
    first_payment_date: z.string().min(1, "To'lov sanasi majburiy"),
    contract_signed: z
      .boolean()
      .refine((value) => value, 'Shartnoma tasdiqlanishi shart'),
  });

  return { step1, step2, step3, all: step1.merge(step2).merge(step3) };
};

const typeSchemas = buildSchemas((key) => key);

export type Step1FormData = z.infer<typeof typeSchemas.step1>;
export type Step2FormData = z.infer<typeof typeSchemas.step2>;
export type Step3FormData = z.infer<typeof typeSchemas.step3>;

export type AddStudentFormData = z.infer<typeof typeSchemas.all>;

const STEP_FIELDS: Record<number, FieldPath<AddStudentFormData>[]> = {
  1: Object.keys(typeSchemas.step1.shape) as FieldPath<AddStudentFormData>[],
  2: Object.keys(typeSchemas.step2.shape) as FieldPath<AddStudentFormData>[],
  3: Object.keys(typeSchemas.step3.shape) as FieldPath<AddStudentFormData>[],
};

interface AddStudentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddStudentPayload) => void;
  loading?: boolean;
  defaultBranchId?: string;
  defaultCourseId?: string;
  // Rendered at the top of the dialog — the quick/detailed mode toggle.
  detailedToggle?: ReactNode;
}

const STEPS = [
  {
    id: 1,
    titleKey: 'students.wizard.step1_title',
    descKey: 'students.wizard.step1_desc',
  },
  {
    id: 2,
    titleKey: 'students.wizard.step2_title',
    descKey: 'students.wizard.step2_desc',
  },
  {
    id: 3,
    titleKey: 'students.wizard.step3_title',
    descKey: 'students.wizard.step3_desc',
  },
] as const;

const AddStudentDialog = ({
  open,
  onClose,
  onSubmit,
  loading,
  defaultBranchId,
  defaultCourseId,
  detailedToggle,
}: AddStudentDialogProps) => {
  const { t } = useTranslation();
  const canAssignBranch = useCan('assignBranch');
  const user = useAuthStore((s) => s.user);
  const { data: branches } = useBranches();
  const { data: groups, refetch: refetchGroups } = useGroups();
  const { data: courses } = useCourses();

  const allFormSchema = useMemo(() => buildSchemas(t).all, [t]);

  const branchList = branches || [];
  const courseList = courses || [];

  const [activeStep, setActiveStep] = useState(1);
  const [stepValidated, setStepValidated] = useState<Record<number, boolean>>(
    {},
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const submitModeRef = useRef<'close' | 'add'>('close');

  const form = useForm<AddStudentFormData>({
    resolver: zodResolver(allFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      middle_name: '',
      phone: '+998',
      email: '',
      passport_series: '',
      passport_number: '',
      birth_date: '',
      gender: 'MALE',
      address: '',
      branch_id: canAssignBranch
        ? defaultBranchId || ''
        : user?.branch_id || '',
      course_id: defaultCourseId || '',
      group_id: '',
      start_date: new Date().toISOString().split('T')[0],
      payment_type: 'FULL',
      amount: 0,
      payment_method: 'CASH',
      first_payment_date: new Date().toISOString().split('T')[0],
      contract_signed: false,
      lead_source: undefined,
      lead_source_other: '',
      referred_by_student_id: '',
      referred_by_user_id: '',
    },
    mode: 'onBlur',
  });

  const resetForNext = () => {
    const current = form.getValues();
    form.reset({
      ...current,
      first_name: '',
      last_name: '',
      middle_name: '',
      phone: '+998',
      email: '',
      passport_series: '',
      passport_number: '',
      birth_date: '',
      address: '',
      group_id: '',
      start_date: new Date().toISOString().split('T')[0],
      amount: 0,
      first_payment_date: new Date().toISOString().split('T')[0],
      contract_signed: false,
      lead_source: undefined,
      lead_source_other: '',
      referred_by_student_id: '',
      referred_by_user_id: '',
    });
    form.setFocus('last_name');
  };

  const watchedBranchId = form.watch('branch_id');
  const watchedCourseId = form.watch('course_id');
  const watchedCourse = courseList.find(
    (course) => course.id === watchedCourseId,
  );

  const filteredGroups = (groups || []).filter(
    (g) =>
      g.course_type === watchedCourse?.course_type &&
      (!watchedBranchId || g.branch_id === watchedBranchId) &&
      g.is_active,
  );

  const goToStep = (step: number) => {
    if (step > activeStep) {
      // Only ever called for the immediate next step (Next button, or a
      // stepper click gated to step.id <= activeStep + 0 below) — jumping
      // further would skip validating the steps in between.
      form.trigger(STEP_FIELDS[activeStep]).then((isValid) => {
        if (isValid) {
          // Mark the step just completed (activeStep), not the
          // destination — the destination hasn't been touched yet.
          setStepValidated((prev) => ({ ...prev, [activeStep]: true }));
          setActiveStep(step);
        }
      });
    } else {
      setActiveStep(step);
    }
  };

  const handleNext = () => {
    if (activeStep < 3) goToStep(activeStep + 1);
  };

  const handleBack = () => {
    if (activeStep > 1) setActiveStep(activeStep - 1);
  };

  const handleSubmit = (values: AddStudentFormData) => {
    const course = courseList.find((item) => item.id === values.course_id);
    if (!course) {
      form.setError('course_id', { message: 'Kurs tanlanmagan' });
      return;
    }
    submitModeRef.current = 'close';
    const payload: AddStudentPayload = {
      ...values,
      phone: uzPhoneE164(values.phone),
      course_type: course.course_type,
      course_price: course.price,
      amount: Number(values.amount),
      lead_source: values.lead_source || undefined,
      lead_source_other:
        values.lead_source === 'other'
          ? values.lead_source_other || undefined
          : undefined,
      referred_by_student_id: values.referred_by_student_id || undefined,
      referred_by_user_id: values.referred_by_user_id || undefined,
    };
    onSubmit(payload);
  };

  const onFormValid = () => {
    if (activeStep === 3) {
      setShowConfirm(true);
    } else {
      handleNext();
    }
  };

  const confirmSubmit = () => {
    setShowConfirm(false);
    const values = form.getValues();
    handleSubmit(values);
    if (submitModeRef.current === 'add') {
      resetForNext();
    }
  };

  useEffect(() => {
    if (open) {
      refetchGroups();
      setActiveStep(1);
      setStepValidated({});
      if (!defaultBranchId && !canAssignBranch && user?.branch_id) {
        form.setValue('branch_id', user.branch_id);
      }
      if (defaultCourseId) {
        form.setValue('course_id', defaultCourseId);
      }
    }
  }, [
    open,
    defaultBranchId,
    defaultCourseId,
    canAssignBranch,
    user?.branch_id,
    refetchGroups,
    form,
  ]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-heading text-lg">
                {t('students.add')}
              </DialogTitle>
              <DialogDescription>
                {t('students.wizard.subtitle', { count: STEPS.length })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {detailedToggle && (
          <div className="flex shrink-0 items-center pb-2">
            {detailedToggle}
          </div>
        )}

        {/* Stepper Indicator */}
        <nav
          aria-label={t('students.wizard.progress_label')}
          className="mb-1 shrink-0 px-1"
        >
          <ol className="flex items-center">
            {STEPS.map((step, index) => {
              const isDone = stepValidated[step.id];
              const isActive = activeStep === step.id;
              const isReachable = step.id <= activeStep;
              return (
                <li
                  key={step.id}
                  className={cn(
                    'flex items-center',
                    index < STEPS.length - 1 && 'flex-1',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => isReachable && goToStep(step.id)}
                    disabled={!isReachable}
                    aria-current={isActive ? 'step' : undefined}
                    className={cn(
                      'group flex items-center gap-2 rounded-md py-1 pr-2 transition-colors',
                      isReachable
                        ? 'cursor-pointer'
                        : 'cursor-default opacity-60',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors',
                        isDone
                          ? 'bg-green-600 text-white dark:bg-green-500'
                          : isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isDone ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        step.id
                      )}
                    </span>
                    <span
                      className={cn(
                        'hidden text-left text-xs font-medium sm:block',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {t(step.titleKey)}
                    </span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'mx-1 h-0.5 flex-1 rounded-full transition-colors',
                        activeStep > step.id ? 'bg-primary' : 'bg-muted',
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-center text-xs text-muted-foreground sm:hidden">
            {t('students.wizard.step_label', {
              current: activeStep,
              total: STEPS.length,
            })}{' '}
            · {t(STEPS[activeStep - 1].titleKey)}
          </p>
        </nav>

        <Separator className="mb-4 shrink-0" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onFormValid)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto pr-2">
              {/* Step 1: Personal Info */}
              {activeStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t(STEPS[0].titleKey)}
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Familiya *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ivanov" {...field} />
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
                          <FormLabel>Ism *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ivan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="middle_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Otasining ismi</FormLabel>
                        <FormControl>
                          <Input placeholder="Ivanovich" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              placeholder="+998 90 123 45 67"
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
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="student@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="passport_series"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pasport seriyasi *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="AA"
                              maxLength={2}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="passport_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pasport raqami *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="1234567"
                              maxLength={7}
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.replace(/\D/g, ''),
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="birth_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tug'ilgan sana *</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              max={new Date().toISOString().split('T')[0]}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jins *</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Tanlang" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MALE">Erkak</SelectItem>
                                <SelectItem value="FEMALE">Ayol</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Yashash manzili *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Toshkent sh., Chilonzor tum., 15-uy"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Course & Branch */}
              {activeStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t(STEPS[1].titleKey)}
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="branch_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Filial *</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Filial tanlang" />
                              </SelectTrigger>
                              <SelectContent>
                                {branchList.map((branch) => (
                                  <SelectItem key={branch.id} value={branch.id}>
                                    {branch.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="course_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kurs *</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Kurs tanlang" />
                              </SelectTrigger>
                              <SelectContent>
                                {courseList.map((course) => (
                                  <SelectItem key={course.id} value={course.id}>
                                    {course.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="group_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guruh (ixtiyoriy)</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(value === 'none' ? '' : value)
                              }
                              value={field.value || 'none'}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Guruh tanlang (keyinroq qo'shish mumkin)" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Radix SelectItem forbids an empty-string value, so "no group" uses a sentinel mapped back to '' above. */}
                                <SelectItem value="none">
                                  Guruh tanlanmagan
                                </SelectItem>
                                {filteredGroups.map((group) => (
                                  <SelectItem key={group.id} value={group.id}>
                                    {group.name} ({group.branch_name})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Boshlanish sanasi *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <ReferralFields
                    branchId={watchedBranchId}
                    leadSource={form.watch('lead_source')}
                    onLeadSourceChange={(v) => form.setValue('lead_source', v)}
                    leadSourceOther={form.watch('lead_source_other')}
                    onLeadSourceOtherChange={(v) =>
                      form.setValue('lead_source_other', v)
                    }
                    referredByStudentId={form.watch('referred_by_student_id')}
                    referredByUserId={form.watch('referred_by_user_id')}
                    onReferrerChange={({ studentId, userId }) => {
                      form.setValue('referred_by_student_id', studentId ?? '');
                      form.setValue('referred_by_user_id', userId ?? '');
                    }}
                  />
                </div>
              )}

              {/* Step 3: Payment & Confirmation */}
              {activeStep === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t(STEPS[2].titleKey)}
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="payment_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To'lov turi *</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Tanlang" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FULL">
                                  To'liq to'lov
                                </SelectItem>
                                <SelectItem value="PARTIAL">
                                  Qisman to'lov
                                </SelectItem>
                                <SelectItem value="INSTALLMENT">
                                  Bo'lib to'lash
                                </SelectItem>
                              </SelectContent>
                            </Select>
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
                          <FormLabel>To'lov usuli *</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Tanlang" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Naqd</SelectItem>
                                <SelectItem value="CARD">Karta</SelectItem>
                                <SelectItem value="TRANSFER">
                                  O'tkazma
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Summa (so'm) *</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="Masalan: 5 000 000"
                              value={
                                field.value
                                  ? groupDigits(String(field.value))
                                  : ''
                              }
                              onChange={(e) =>
                                field.onChange(
                                  Number(e.target.value.replace(/\D/g, '')) ||
                                    0,
                                )
                              }
                              onBlur={field.onBlur}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="first_payment_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Birinchi to'lov sanasi *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contract_signed"
                      render={({ field }) => (
                        <FormItem className="flex items-end">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="ml-2 cursor-pointer">
                            Shartnoma shartlariga roziman *
                          </FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Summary Card */}
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <h4 className="font-medium mb-3">Yakuniy ko'rinish</h4>
                    <dl className="grid gap-2 sm:grid-cols-2 text-sm">
                      <dt className="text-muted-foreground">Ism Familiya:</dt>
                      <dd className="font-medium">
                        {form.watch('last_name')} {form.watch('first_name')}
                      </dd>
                      <dt className="text-muted-foreground">Telefon:</dt>
                      <dd className="font-medium">{form.watch('phone')}</dd>
                      <dt className="text-muted-foreground">Kurs:</dt>
                      <dd className="font-medium">
                        {courseList.find(
                          (c) => c.id === form.watch('course_id'),
                        )?.name || '—'}
                      </dd>
                      <dt className="text-muted-foreground">Filial:</dt>
                      <dd className="font-medium">
                        {branchList.find(
                          (b) => b.id === form.watch('branch_id'),
                        )?.name || '—'}
                      </dd>
                      <dt className="text-muted-foreground">Guruh:</dt>
                      <dd className="font-medium">
                        {filteredGroups.find(
                          (g) => g.id === form.watch('group_id'),
                        )?.name || 'Keyinroq tanlanadi'}
                      </dd>
                      <dt className="text-muted-foreground">To'lov turi:</dt>
                      <dd className="font-medium">
                        {form.watch('payment_type') === 'FULL' && "To'liq"}
                        {form.watch('payment_type') === 'PARTIAL' && 'Qisman'}
                        {form.watch('payment_type') === 'INSTALLMENT' &&
                          "Bo'lib to'lash"}
                      </dd>
                      <dt className="text-muted-foreground">Summa:</dt>
                      <dd className="font-medium">
                        {form.watch('amount').toLocaleString('uz-UZ')} so'm
                      </dd>
                    </dl>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="mt-auto flex shrink-0 items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {activeStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Oldingi
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeStep < 3 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={loading}
                  >
                    Keyingi
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        submitModeRef.current = 'add';
                        setShowConfirm(true);
                      }}
                      disabled={loading}
                      className="hidden sm:inline-flex"
                    >
                      Saqlab, yana qo'shish
                    </Button>
                    <Button type="submit" size="sm" disabled={loading}>
                      {loading ? 'Saqlanmoqda...' : 'Saqlash va tasdiqlash'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </Form>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4 shadow-lg animate-in zoom-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">
                  Ma'lumotlarni tasdiqlaysizmi?
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Barcha ma'lumotlar to'g'ri ekanligiga ishonch hosil qiling.
                Tasdiqlagach, talaba ro'yxatdan o'tkaziladi va to'lov yozuvi
                yaratiladi.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConfirm(false)}>
                  Bekor qilish
                </Button>
                <Button onClick={confirmSubmit} disabled={loading}>
                  {loading ? 'Saqlanmoqda...' : 'Ha, tasdiqlayman'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
