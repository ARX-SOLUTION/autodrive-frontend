import { useEffect, useRef, useState } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
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
}

const step1Schema = z.object({
  first_name: z.string().min(1, 'Ism majburiy'),
  last_name: z.string().min(1, 'Familiya majburiy'),
  middle_name: z.string().optional(),
  phone: z
    .string()
    .min(1, 'Telefon raqami majburiy')
    .regex(/^\+998\d{9}$/, 'Format: +998 (__) ___-__-__'),
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

const step2Schema = z.object({
  branch_id: z.string().uuid('Filial tanlanmagan'),
  course_id: z.string().uuid('Kurs tanlanmagan'),
  group_id: z.string().uuid().optional(),
  start_date: z.string().min(1, 'Boshlanish sana majburiy'),
});

const step3Schema = z.object({
  payment_type: z.enum(['FULL', 'PARTIAL', 'INSTALLMENT']),
  amount: z.number().min(1, "Summa 0 dan katta bo'lishi kerak"),
  payment_method: z.enum(['CASH', 'CARD', 'TRANSFER']),
  first_payment_date: z.string().min(1, "To'lov sanasi majburiy"),
  contract_signed: z
    .boolean()
    .refine((value) => value, 'Shartnoma tasdiqlanishi shart'),
});

const allFormSchema = step1Schema.merge(step2Schema).merge(step3Schema);

export type Step1FormData = z.infer<typeof step1Schema>;
export type Step2FormData = z.infer<typeof step2Schema>;
export type Step3FormData = z.infer<typeof step3Schema>;

export type AddStudentFormData = z.infer<typeof allFormSchema>;

const STEP_FIELDS: Record<number, FieldPath<AddStudentFormData>[]> = {
  1: Object.keys(step1Schema.shape) as FieldPath<AddStudentFormData>[],
  2: Object.keys(step2Schema.shape) as FieldPath<AddStudentFormData>[],
  3: Object.keys(step3Schema.shape) as FieldPath<AddStudentFormData>[],
};

interface AddStudentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddStudentPayload) => void;
  loading?: boolean;
  defaultBranchId?: string;
  defaultCourseId?: string;
}

const STEPS = [
  {
    id: 1,
    title: "Shaxsiy ma'lumotlar",
    description: "Talabaning asosiy ma'lumotlari",
  },
  {
    id: 2,
    title: 'Kurs va Filial',
    description: "O'qish kursi va filial tanlash",
  },
  {
    id: 3,
    title: "To'lov va Tasdiqlash",
    description: "To'lov tafsilotlari va yakuniy tasdiqlash",
  },
];

const AddStudentDialog = ({
  open,
  onClose,
  onSubmit,
  loading,
  defaultBranchId,
  defaultCourseId,
}: AddStudentDialogProps) => {
  const canAssignBranch = useCan('assignBranch');
  const user = useAuthStore((s) => s.user);
  const { data: branches } = useBranches();
  const { data: groups, refetch: refetchGroups } = useGroups();
  const { data: courses } = useCourses();

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
      form.trigger(STEP_FIELDS[activeStep]).then((isValid) => {
        if (isValid) {
          setStepValidated((prev) => ({ ...prev, [step]: true }));
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
      course_type: course.course_type,
      course_price: course.price,
      amount: Number(values.amount),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg">Yangi talaba qo'shish</DialogTitle>
          <DialogDescription>
            Talaba ma'lumotlarini 3 bosqichda to'ldiring
          </DialogDescription>
        </DialogHeader>

        {/* Stepper Indicator */}
        <div className="flex items-center justify-center gap-2 mb-4 px-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all',
                  stepValidated[step.id]
                    ? 'bg-green-500 text-white'
                    : activeStep >= step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {stepValidated[step.id] ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.id
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-16 h-0.5 mx-2',
                    activeStep > index ? 'bg-primary' : 'bg-muted',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Separator className="mb-4" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onFormValid)}
            className="h-[calc(100%-160px)] flex flex-col"
          >
            <div className="flex-1 overflow-y-auto pr-2">
              {/* Step 1: Personal Info */}
              {activeStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {STEPS[0].title}
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
                              placeholder="+998 (__) ___-__-__"
                              {...field}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (!val.startsWith('998')) val = '998' + val;
                                if (val.length > 12) val = val.slice(0, 12);
                                let formatted = '+';
                                if (val.length > 0)
                                  formatted += val.slice(0, 3);
                                if (val.length > 3)
                                  formatted += ' (' + val.slice(3, 5);
                                if (val.length > 5)
                                  formatted += ') ' + val.slice(5, 8);
                                if (val.length > 8)
                                  formatted += '-' + val.slice(8, 10);
                                if (val.length > 10)
                                  formatted += '-' + val.slice(10, 12);
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
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
                    {STEPS[1].title}
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
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Guruh tanlang (keyinroq qo'shish mumkin)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">
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
                </div>
              )}

              {/* Step 3: Payment & Confirmation */}
              {activeStep === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {STEPS[2].title}
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
                              type="number"
                              step="1000"
                              min="1"
                              placeholder="Masalan: 5000000"
                              value={field.value}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value) || 0)
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
            <div className="flex items-center justify-between border-t pt-4 mt-auto">
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
                    disabled={loading || !stepValidated[activeStep]}
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
