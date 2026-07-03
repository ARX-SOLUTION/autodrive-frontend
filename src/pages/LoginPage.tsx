import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLogin } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const LoginPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
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
    } else if (!error.response) {
      toast.error(t('login.network_error'));
    } else {
      toast.error(t('login.error'));
    }
  };

  const onSuccess = () => {
    toast.success(t('login.success'));
    navigate('/dashboard');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess, onError: handleError });
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center ">
            <img src="/favicon.png" alt="Logo" className="h-full w-full" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground text-balance">
            {t('app.title')}
          </h1>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.email_placeholder')}
              className="mt-1.5 bg-secondary border-border"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">{t('login.password_label')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.password_placeholder')}
              className="mt-1.5 bg-secondary border-border"
              required
            />
          </div>
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
