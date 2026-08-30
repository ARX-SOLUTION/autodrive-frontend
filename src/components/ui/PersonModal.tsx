import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
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
import { useAuthStore } from '@/store/authStore';

// Reuses the canonical UserRole union (src/types/user.ts) instead of a
// parallel string literal type -- 'dev'/'owner' never open this modal.
export type PersonRole = Extract<
  UserRole,
  'manager' | 'accountant' | 'operator' | 'teacher'
>;

export interface PersonFormPayload {
  fullName: string;
  phone?: string; // E.164, omitted if left blank (manager/accountant only -- operator/teacher require it)
  branchId?: string;
  email?: string; // manager/accountant, create only
  password?: string; // manager/accountant, create only
  specialization?: Specialization; // teacher only
  role?: PersonRole;
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
  accountant: {
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
  accountant: { phone: false, branch: false },
  operator: { phone: true, branch: false },
  teacher: { phone: true, branch: false },
};

// Factory so field messages can be localized via t(); unlocalized fields use
// literal strings, matching StudentModal's makeStudentFormSchema convention.
const makePersonFormSchema = (t: (key: string) => string, isEdit: boolean) =>
  z
    .object({
      fullName: z.string().refine(isValidName, t('common.invalid_name')),
      phone: z.string().optional(),
      branchId: z.string().optional(),
      email: z.string().optional(),
      password: z.string().optional(),
      specialization: z.enum(['THEORY', 'PRACTICE']).optional(),
      role: z.enum(['manager', 'accountant', 'operator', 'teacher']),
    })
    .superRefine((data, ctx) => {
      const role = data.role;
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
      if ((role === 'manager' || role === 'accountant') && !isEdit) {
        if (!data.email || !z.string().email().safeParse(data.email).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['email'],
            message: t('students.wizard.email_invalid'),
          });
        }
        if (
          !data.password ||
          data.password.length < 8 ||
          !/[0-9]/.test(data.password) ||
          !/[A-Z]/.test(data.password)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: t('users.password_requirements'),
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
  selectableRoles?: readonly PersonRole[];
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
  selectableRoles,
  person,
  title,
  description,
}: PersonModalProps) => {
  const { t } = useTranslation();
  const canAssignBranch = useCan('assignBranch');
  const isOwner = useAuthStore((state) => state.user?.role === 'owner');
  const { data: branches } = useBranches();

  const visibleSelectableRoles = isOwner
    ? selectableRoles
    : selectableRoles?.filter((option) => option !== 'accountant');

  const personFormSchema = makePersonFormSchema(t, !!person);

  const defaultFormValues = (): PersonFormValues => ({
    fullName: '',
    phone: formatUzPhoneInput(''),
    branchId: '',
    email: '',
    password: '',
    specialization: 'THEORY',
    role,
  });

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: defaultFormValues(),
  });
  const selectedRole = useWatch({ control: form.control, name: 'role' });

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
        role: person.role === 'accountant' ? 'accountant' : role,
      });
    } else {
      form.reset(defaultFormValues());
      const focusTimer = window.setTimeout(() => form.setFocus('fullName'), 50);
      return () => window.clearTimeout(focusTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, role, open]);

  const onFormValid = (values: PersonFormValues) => {
    const payload: PersonFormPayload = {
      fullName: values.fullName.trim(),
      phone: isValidUzPhone(values.phone)
        ? uzPhoneE164(values.phone)
        : undefined,
    };
    if (selectedRole !== 'accountant') {
      payload.branchId = values.branchId || undefined;
    }
    if (
      (selectedRole === 'manager' || selectedRole === 'accountant') &&
      !person
    ) {
      payload.email = values.email?.trim();
      payload.password = values.password;
    }
    if (selectedRole === 'teacher') {
      payload.specialization = values.specialization;
    }
    if (visibleSelectableRoles && visibleSelectableRoles.length > 1) {
      payload.role = selectedRole;
    }
    onSubmit(payload);
  };

  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(form.formState.isDirty || !!loading, onClose);

  const labels = FIELD_LABELS[selectedRole];
  const showRoleSelect =
    !person && !!visibleSelectableRoles && visibleSelectableRoles.length > 1;
  const showEmailPassword =
    (selectedRole === 'manager' || selectedRole === 'accountant') && !person;
  const showSpecialization = selectedRole === 'teacher';
  const showBranch =
    selectedRole === 'accountant'
      ? false
      : selectedRole === 'teacher'
        ? canAssignBranch
        : true;

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

              {showRoleSelect && (
                <FormItem>
                  <FormLabel>{t('users.detail.role')}</FormLabel>
                  <Select
                    value={selectedRole}
                    onValueChange={(value) =>
                      form.setValue('role', value as PersonRole, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label={t('users.detail.role')}
                      className="bg-secondary border-border"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleSelectableRoles.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(`roles.${option}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}

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
                      {t(labels.phone)} {REQUIRED[selectedRole].phone && '*'}
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
                        {t(labels.branch)}{' '}
                        {REQUIRED[selectedRole].branch && '*'}
                      </FormLabel>
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        disabled={
                          selectedRole === 'manager' &&
                          (branches || []).length === 0
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue
                              placeholder={
                                selectedRole === 'manager' &&
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
