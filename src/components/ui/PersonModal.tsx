import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  isValidUzPhone,
  uzPhoneE164,
  uzLocalDigits,
  formatUzPhoneInput,
} from '@/lib/phoneFormater';
import { isValidName } from '@/lib/validation';
import { User, UserRole } from '@/types/user';
import { Specialization } from '@/services/teacherService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCan } from '@/hooks/useCan';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
import { useBranches } from '@/services/branchService';

// Reuses the canonical UserRole union (src/types/user.ts) instead of a
// parallel string literal type -- 'dev'/'owner' never open this modal.
export type PersonRole = Extract<UserRole, 'manager' | 'operator' | 'teacher'>;

export interface PersonFormPayload {
  fullName: string;
  phone?: string; // E.164, omitted if left blank (manager only -- operator/teacher require it)
  branchId?: string;
  email?: string; // manager, create only
  password?: string; // manager, create only
  specialization?: Specialization; // teacher only
}

// Per-role i18n keys for the fields every role has (name/phone/branch) --
// each page used a different namespace for the same field, preserved as-is.
const FIELD_LABELS: Record<
  PersonRole,
  { name: string; phone: string; branch: string }
> = {
  manager: {
    name: 'users.name_label',
    phone: 'common.phone',
    branch: 'common.branch',
  },
  operator: {
    name: 'operators.first_name',
    phone: 'operators.phone',
    branch: 'operators.branch',
  },
  teacher: {
    name: 'teachers.first_name',
    phone: 'teachers.phone',
    branch: 'teachers.branch',
  },
};

// Required-ness genuinely differs per role (matches each page's original
// handleSubmit checks) -- phone is required for operator/teacher but
// optional for manager; branch is required only for manager.
const REQUIRED: Record<PersonRole, { phone: boolean; branch: boolean }> = {
  manager: { phone: false, branch: true },
  operator: { phone: true, branch: false },
  teacher: { phone: true, branch: false },
};

// Factory so field messages can be localized via t(); unlocalized fields use
// literal strings, matching StudentModal's makeStudentFormSchema convention.
const makePersonFormSchema = (
  t: (key: string) => string,
  role: PersonRole,
  isEdit: boolean,
) =>
  z
    .object({
      fullName: z.string().refine(isValidName, t('common.invalid_name')),
      phone: z.string().optional(),
      branchId: z.string().optional(),
      email: z.string().optional(),
      password: z.string().optional(),
      specialization: z.enum(['THEORY', 'PRACTICE']).optional(),
    })
    .superRefine((data, ctx) => {
      const phoneRequired = REQUIRED[role].phone;
      const hasPhoneDigits = uzLocalDigits(data.phone).length > 0;
      if (phoneRequired || hasPhoneDigits) {
        if (!isValidUzPhone(data.phone)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['phone'],
            message: t('common.invalid_phone'),
          });
        }
      }
      if (REQUIRED[role].branch && !data.branchId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['branchId'],
          message: 'Required',
        });
      }
      if (role === 'teacher' && !data.specialization) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['specialization'],
          message: 'Required',
        });
      }
      if (role === 'manager' && !isEdit) {
        if (!data.email || !z.string().email().safeParse(data.email).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['email'],
            message: 'Invalid email',
          });
        }
        if (!data.password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'Required',
          });
        }
      }
    });

type PersonFormValues = z.infer<ReturnType<typeof makePersonFormSchema>>;

interface PersonModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PersonFormPayload) => void;
  loading?: boolean;
  role: PersonRole;
  // Presence signals edit mode, absence signals create -- mirrors
  // StudentModal's `student?: Student | null` convention.
  person?: User | null;
  title: ReactNode;
  description: ReactNode;
}

const PersonModal = ({
  open,
  onClose,
  onSubmit,
  loading,
  role,
  person,
  title,
  description,
}: PersonModalProps) => {
  const { t } = useTranslation();
  const canAssignBranch = useCan('assignBranch');
  const { data: branches } = useBranches();

  const personFormSchema = makePersonFormSchema(t, role, !!person);

  const defaultFormValues = (): PersonFormValues => ({
    fullName: '',
    phone: formatUzPhoneInput(''),
    branchId: '',
    email: '',
    password: '',
    specialization: 'THEORY',
  });

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: defaultFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    if (person) {
      form.reset({
        fullName: person.name || '',
        phone: formatUzPhoneInput(person.phone),
        branchId: person.branch_id || '',
        email: '',
        password: '',
        specialization: person.specialization || 'THEORY',
      });
    } else {
      form.reset(defaultFormValues());
      setTimeout(() => form.setFocus('fullName'), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, role, open]);

  const onFormValid = (values: PersonFormValues) => {
    const payload: PersonFormPayload = {
      fullName: values.fullName.trim(),
      phone: isValidUzPhone(values.phone)
        ? uzPhoneE164(values.phone)
        : undefined,
      branchId: values.branchId || undefined,
    };
    if (role === 'manager' && !person) {
      payload.email = values.email?.trim();
      payload.password = values.password;
    }
    if (role === 'teacher') {
      payload.specialization = values.specialization;
    }
    onSubmit(payload);
  };

  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(form.formState.isDirty || !!loading, onClose);

  const labels = FIELD_LABELS[role];
  const showEmailPassword = role === 'manager' && !person;
  const showSpecialization = role === 'teacher';
  const showBranch = role === 'teacher' ? canAssignBranch : true;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && attemptClose()}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">{title}</DialogTitle>
            <DialogDescription className="sr-only">
              {description}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onFormValid)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(labels.name)} *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="name"
                        className="bg-secondary border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showEmailPassword && (
                <>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('users.email_label')} *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            autoComplete="email"
                            className="bg-secondary border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('users.password_label')} *</FormLabel>
                        <FormControl>
                          <PasswordInput
                            {...field}
                            className="bg-secondary border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t(labels.phone)} {REQUIRED[role].phone && '*'}
                    </FormLabel>
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
                          field.onChange(formatUzPhoneInput(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showSpecialization && (
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('teachers.specialization')} *</FormLabel>
                      <Select
                        value={field.value || 'THEORY'}
                        onValueChange={(v) =>
                          field.onChange(v as Specialization)
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="THEORY">
                            {t('teachers.spec_theory')}
                          </SelectItem>
                          <SelectItem value="PRACTICE">
                            {t('teachers.spec_practice')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showBranch && (
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t(labels.branch)} {REQUIRED[role].branch && '*'}
                      </FormLabel>
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        disabled={
                          role === 'manager' && (branches || []).length === 0
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue
                              placeholder={
                                role === 'manager' &&
                                (branches || []).length === 0
                                  ? t('users.no_branches')
                                  : t('common.select_placeholder')
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(branches || []).map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={attemptClose}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={loading || form.formState.isSubmitting}
                >
                  {loading || form.formState.isSubmitting
                    ? t('common.saving')
                    : person
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
    </>
  );
};

export default PersonModal;
