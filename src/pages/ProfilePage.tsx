import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useChangePassword } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Shield, Building2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const changePasswordMut = useChangePassword();
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    // Captured before the mutation: onSuccess replaces the user in the store
    // (must_change_password becomes false), so read the flag now.
    const wasForced = !!user?.must_change_password;
    changePasswordMut.mutate(pwForm, {
      onSuccess: () => {
        toast.success(t('profile.update_password_success'));
        setPwForm({ currentPassword: '', newPassword: '' });
        if (wasForced) navigate('/dashboard');
      },
      onError: () => toast.error(t('common.error')),
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
            <Label>{t('profile.name')}</Label>
            <Input
              defaultValue={user?.name}
              className="mt-1.5 bg-secondary border-border"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              defaultValue={user?.email}
              className="mt-1.5 bg-secondary border-border"
            />
          </div>
          <div>
            <Label>{t('profile.phone')}</Label>
            <Input
              defaultValue={user?.phone || ''}
              className="mt-1.5 bg-secondary border-border"
            />
          </div>
        </div>

        <Button>{t('profile.save')}</Button>
      </div>

      {/* Change password */}
      <form onSubmit={handleChangePassword}>
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-heading font-semibold text-balance">
            {t('profile.change_password')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{t('profile.current_password')}</Label>
              <Input
                type="password"
                className="mt-1.5 bg-secondary border-border"
                value={pwForm.currentPassword}
                onChange={(e) =>
                  setPwForm((p) => ({ ...p, currentPassword: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>{t('profile.new_password')}</Label>
              <Input
                type="password"
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
