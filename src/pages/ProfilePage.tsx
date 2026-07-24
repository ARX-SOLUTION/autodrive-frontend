import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { useChangePassword } from '@/services/authService';
import { useUpdateUser } from '@/services/userService';
import {
  useTelegramLinkStatus,
  useTelegramLinkToken,
  useTelegramUnlink,
  useTelegramDailyReport,
} from '@/services/telegramService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { User, Shield, Buildings } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { mutationErrorToast } from '@/lib/mutationErrorToast';
import {
  formatUzPhoneInput,
  isValidUzPhone,
  uzLocalDigits,
  uzPhoneE164,
} from '@/lib/phoneFormater';

// Factory so the phone message can be localized via t() -- name has no
// validation rules today (not required), matching the page's existing
// behavior. Mirrors BranchesPage's phone superRefine (optional, valid only
// if digits are present).
const makeProfileFormSchema = (t: (key: string) => string) =>
  z
    .object({
      name: z.string(),
      phone: z.string(),
    })
    .superRefine((data, ctx) => {
      if (uzLocalDigits(data.phone).length > 0 && !isValidUzPhone(data.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phone'],
          message: t('common.invalid_phone'),
        });
      }
    });

type ProfileFormValues = z.infer<ReturnType<typeof makeProfileFormSchema>>;

// No client validation today -- kept exactly as-is (passwords are
// unchecked); only the form plumbing moves to the standard pattern.
const pwFormSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
});

type PwFormValues = z.infer<typeof pwFormSchema>;

const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const changePasswordMut = useChangePassword();
  const updateProfileMut = useUpdateUser();
  // Matches PATCH /users/:id's class-level @Roles(owner, manager, dev) guard
  // -- operator/teacher would 403, so their fields stay read-only rather
  // than showing a Save button that silently fails.
  const canEditProfile =
    user?.role === 'owner' || user?.role === 'manager' || user?.role === 'dev';

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(makeProfileFormSchema(t)),
    defaultValues: {
      name: user?.name ?? '',
      phone: formatUzPhoneInput(user?.phone),
    },
  });

  const onSaveValid = (values: ProfileFormValues) => {
    if (!user || !canEditProfile) return;
    const payload = {
      id: user.id,
      fullName: values.name.trim(),
      phone:
        uzLocalDigits(values.phone).length > 0
          ? uzPhoneE164(values.phone)
          : undefined,
    };
    updateProfileMut.mutate(payload, {
      onSuccess: (updated) => {
        setUser({ ...user, ...updated });
        toast.success(t('profile.update_success'));
      },
      onError: (error) =>
        mutationErrorToast(error, t, () => updateProfileMut.mutate(payload)),
    });
  };

  const pwForm = useForm<PwFormValues>({
    resolver: zodResolver(pwFormSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const { data: linkStatus, refetch: refetchLinkStatus } =
    useTelegramLinkStatus();
  const linkTokenMut = useTelegramLinkToken();
  const unlinkMut = useTelegramUnlink();
  const dailyReportMut = useTelegramDailyReport();
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  // Same owner/manager role set the backend's PATCH /telegram/daily-report
  // guard enforces (403 for anyone else) -- mirrors authStore's
  // canViewBranches direct role check rather than the CAPABILITIES matrix,
  // since this gate is used in exactly one place.
  const canManageDailyReport =
    user?.role === 'owner' || user?.role === 'manager';

  const handleLinkTelegram = () => {
    linkTokenMut.mutate(undefined, {
      onSuccess: ({ deep_link }) => {
        window.open(deep_link, '_blank');
        toast.success(t('profile.telegram.link_opened'));
      },
      onError: (err) =>
        mutationErrorToast(err, t, () => linkTokenMut.mutate(undefined)),
    });
  };

  const handleUnlink = () => {
    unlinkMut.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('profile.telegram.unlink_success'));
        setUnlinkConfirmOpen(false);
      },
      onError: (err) =>
        mutationErrorToast(err, t, () => unlinkMut.mutate(undefined)),
    });
  };

  const handleDailyReportToggle = (enabled: boolean) => {
    dailyReportMut.mutate(enabled, {
      onSuccess: () =>
        toast.success(
          t(
            enabled
              ? 'profile.telegram.daily_report_enabled'
              : 'profile.telegram.daily_report_disabled',
          ),
        ),
      onError: (err) =>
        mutationErrorToast(err, t, () => dailyReportMut.mutate(enabled)),
    });
  };

  const onPwValid = (values: PwFormValues) => {
    // Captured before the mutation: onSuccess replaces the user in the store
    // (must_change_password becomes false), so read the flag now.
    const wasForced = !!user?.must_change_password;
    const payload = {
      currentPassword: values.currentPassword.trim(),
      newPassword: values.newPassword.trim(),
    };
    changePasswordMut.mutate(payload, {
      onSuccess: () => {
        toast.success(t('profile.update_password_success'));
        pwForm.reset({ currentPassword: '', newPassword: '' });
        if (wasForced) navigate('/dashboard');
      },
      onError: (error) =>
        mutationErrorToast(error, t, () => changePasswordMut.mutate(payload)),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {user?.must_change_password && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
          {t('profile.must_change_password_notice')}
        </div>
      )}
      <div>
        <h1 className="font-heading text-2xl font-bold text-balance">
          {t('profile.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('profile.subtitle')}</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-balance">
              {user?.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <Shield className="h-3 w-3" />
                {user?.role &&
                  t(`roles.${user.role}`, { defaultValue: user.role })}
              </span>
              {user?.branch_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  <Buildings className="h-3 w-3" />
                  {user.branch_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <Form {...profileForm}>
          <form
            onSubmit={profileForm.handleSubmit(onSaveValid)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profile.name')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="name"
                        disabled={!canEditProfile}
                        className="bg-secondary border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  defaultValue={user?.email}
                  disabled
                  className="mt-1.5 bg-secondary border-border"
                />
              </div>
              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profile.phone')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        disabled={!canEditProfile}
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
            </div>

            {!canEditProfile && (
              <p className="text-xs text-muted-foreground">
                {t('profile.readonly_note')}
              </p>
            )}

            <Button
              type="submit"
              disabled={!canEditProfile || updateProfileMut.isPending}
            >
              {t('profile.save')}
            </Button>
          </form>
        </Form>
      </div>

      {/* Telegram */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-balance">
          {t('profile.telegram.title')}
        </h3>
        {linkStatus?.linked ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {t('profile.telegram.linked_status')}
            </span>
            {canManageDailyReport && (
              <div className="flex items-center justify-between">
                <Label htmlFor="daily-report-toggle">
                  {t('profile.telegram.daily_report_label')}
                </Label>
                <Switch
                  id="daily-report-toggle"
                  checked={!!linkStatus.daily_report_enabled}
                  disabled={dailyReportMut.isPending}
                  onCheckedChange={handleDailyReportToggle}
                />
              </div>
            )}
            <div>
              <Button
                variant="outline"
                onClick={() => setUnlinkConfirmOpen(true)}
                disabled={unlinkMut.isPending}
              >
                {t('profile.telegram.unlink_button')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t('profile.telegram.description')}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleLinkTelegram}
                disabled={linkTokenMut.isPending}
              >
                {t('profile.telegram.link_button')}
              </Button>
              <Button variant="outline" onClick={() => refetchLinkStatus()}>
                {t('profile.telegram.check_button')}
              </Button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={unlinkConfirmOpen}
        onClose={() => setUnlinkConfirmOpen(false)}
        onConfirm={handleUnlink}
        title={t('profile.telegram.unlink_title')}
        description={t('profile.telegram.unlink_desc')}
        loading={unlinkMut.isPending}
      />

      {/* Change password */}
      <Form {...pwForm}>
        <form onSubmit={pwForm.handleSubmit(onPwValid)}>
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-heading font-semibold text-balance">
              {t('profile.change_password')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={pwForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profile.current_password')}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        autoComplete="current-password"
                        className="bg-secondary border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pwForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profile.new_password')}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        autoComplete="new-password"
                        className="bg-secondary border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={changePasswordMut.isPending}
            >
              {t('profile.update_password')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ProfilePage;
