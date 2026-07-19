import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLogin } from '@/services/authService';
import { isRootDomain, rootDomainAppUrl } from '@/lib/domain';
import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const LoginPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    // Always start a direct /login visit from a clean auth state so stale
    // persisted sessions cannot bounce the user away from the form.
    logout();
  }, [logout]);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Kirish | Auto Maktab CRM';
    return () => {
      document.title = prev;
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleError = (error: any) => {
    if (error.response?.status === 429) {
      toast.error(t('login.rate_limit'));
    } else if (error.response?.status === 403) {
      toast.error(t('login.company_inactive'));
    } else if (!error.response) {
      toast.error(t('login.network_error'));
    } else {
      setFormError(t('login.error'));
    }
  };

  const onSuccess = () => {
    toast.success(t('login.success'));
    // Return to the page a session-expiry redirect came from, if any.
    const from = (location.state as { from?: string } | null)?.from;
    const target = from && from !== '/login' ? from : '/dashboard';
    if (isRootDomain()) {
      // automaktab.uz has no app UI of its own -- hand off to app. with a
      // full navigation so the domain-wide auth cookie rides along.
      window.location.href = rootDomainAppUrl(target);
      return;
    }
    navigate(target);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password: password.trim() },
      { onSuccess, onError: handleError },
    );
  };

  const handleDemoLogin = () => {
    login.mutate(
      { email: 'demo@automaktab.uz', password: 'demo1234' },
      { onSuccess, onError: handleError },
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="glass-card w-full max-w-sm p-8 animate-slide-in">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <Brand size="lg" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('login.title')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">{t('login.email_label')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFormError(null);
              }}
              placeholder={t('login.email_placeholder')}
              className="mt-1.5 bg-secondary border-border"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">{t('login.password_label')}</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFormError(null);
              }}
              placeholder={t('login.password_placeholder')}
              className="mt-1.5 bg-secondary border-border"
              required
            />
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? t('login.submitting') : t('login.submit')}
          </Button>
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleDemoLogin}
              disabled={login.isPending}
            >
              {t('login.demo')}
            </Button>
            <p className="mt-1.5 text-center text-xs text-muted-foreground">
              {t('login.demo_hint')}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
