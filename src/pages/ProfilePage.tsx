import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { User, Shield, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/errors';
import {
  formatUzPhoneInput,
  isValidUzPhone,
  uzLocalDigits,
  uzPhoneE164,
} from '@/lib/phoneFormater';

const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const changePasswordMut = useChangePassword();
  const updateProfileMut = useUpdateUser();
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [name, setName] = useState(user?.name ?? '');
  // Masked, controlled phone (defaults to +998).
  const [phone, setPhone] = useState(formatUzPhoneInput(user?.phone));
  // Matches PATCH /users/:id's class-level @Roles(owner, manager, dev) guard
  // -- operator/teacher would 403, so their fields stay read-only rather
  // than showing a Save button that silently fails.
  const canEditProfile =
    user?.role === 'owner' || user?.role === 'manager' || user?.role === 'dev';
  const phoneValid = uzLocalDigits(phone).length === 0 || isValidUzPhone(phone);

  const handleSaveProfile = () => {
    if (!user || !canEditProfile || !phoneValid) return;
    updateProfileMut.mutate(
      {
        id: user.id,
        fullName: name.trim(),
        phone: uzLocalDigits(phone).length > 0 ? uzPhoneE164(phone) : undefined,
      },
      {
        onSuccess: (updated) => {
          setUser({ ...user, ...updated });
          toast.success(t('profile.update_success'));
        },
        onError: (error) =>
          toast.error(extractErrorMessage(error, t('common.error'))),
      },
    );
  };

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
        toast.error(extractErrorMessage(err, t('common.error'))),
    });
  };

  const handleUnlink = () => {
    unlinkMut.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('profile.telegram.unlink_success'));
        setUnlinkConfirmOpen(false);
      },
      onError: (err) =>
        toast.error(extractErrorMessage(err, t('common.error'))),
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
        toast.error(extractErrorMessage(err, t('common.error'))),
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    // Captured before the mutation: onSuccess replaces the user in the store
    // (must_change_password becomes false), so read the flag now.
    const wasForced = !!user?.must_change_password;
    changePasswordMut.mutate(
      {
        currentPassword: pwForm.currentPassword.trim(),
        newPassword: pwForm.newPassword.trim(),
      },
      {
        onSuccess: () => {
          toast.success(t('profile.update_password_success'));
          setPwForm({ currentPassword: '', newPassword: '' });
          if (wasForced) navigate('/dashboard');
        },
        onError: (error) =>
          toast.error(extractErrorMessage(error, t('common.error'))),
      },
    );
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
                {user?.role === 'owner' ? 'Biznes egasi' : 'Filial menejeri'}
              </span>
              {user?.branch_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {user.branch_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="profile-name">{t('profile.name')}</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={!canEditProfile}
              className="mt-1.5 bg-secondary border-border"
            />
          </div>
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
          <div>
            <Label htmlFor="profile-phone">{t('profile.phone')}</Label>
            <Input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(formatUzPhoneInput(e.target.value))}
              disabled={!canEditProfile}
              className="mt-1.5 bg-secondary border-border"
            />
            {uzLocalDigits(phone).length > 0 && !isValidUzPhone(phone) && (
              <p className="mt-1.5 text-xs text-destructive">
                {t('common.invalid_phone')}
              </p>
            )}
          </div>
        </div>

        {!canEditProfile && (
          <p className="text-xs text-muted-foreground">
            {t('profile.readonly_note')}
          </p>
        )}

        <Button
          onClick={handleSaveProfile}
          disabled={
            !canEditProfile || !phoneValid || updateProfileMut.isPending
          }
        >
          {t('profile.save')}
        </Button>
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
      <form onSubmit={handleChangePassword}>
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-heading font-semibold text-balance">
            {t('profile.change_password')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="profile-current-password">
                {t('profile.current_password')}
              </Label>
              <PasswordInput
                id="profile-current-password"
                autoComplete="current-password"
                className="mt-1.5 bg-secondary border-border"
                value={pwForm.currentPassword}
                onChange={(e) =>
                  setPwForm((p) => ({ ...p, currentPassword: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="profile-new-password">
                {t('profile.new_password')}
              </Label>
              <PasswordInput
                id="profile-new-password"
                autoComplete="new-password"
                className="mt-1.5 bg-secondary border-border"
                value={pwForm.newPassword}
                onChange={(e) =>
                  setPwForm((p) => ({ ...p, newPassword: e.target.value }))
                }
              />
            </div>
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
    </div>
  );
};

export default ProfilePage;
