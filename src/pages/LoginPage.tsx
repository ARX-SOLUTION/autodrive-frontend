import { useEffect, useRef, useState } from 'react';
import { useLocation, useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '@/services/authService';
import { isRootDomain, navigateFullPage, rootDomainAppUrl } from '@/lib/domain';
import { queryClient, resetAuthSessionState } from '@/lib/queryClient';
import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import type { AuthResponse } from '@/types/user';
import { getDefaultAuthenticatedRoute } from '@/lib/defaultAuthenticatedRoute';

const makeLoginFormSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t('common.required')),
    password: z.string().min(1, t('common.required')),
  });

type LoginFormValues = z.infer<ReturnType<typeof makeLoginFormSchema>>;

const LoginPage = () => {
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const location = useLocation();
  const login = useLogin();
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCleanedInitialSession = useRef(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(makeLoginFormSchema(t)),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    // Always start a direct /login visit from a clean auth state so stale
    // persisted sessions cannot bounce the user away from the form.
    if (hasCleanedInitialSession.current) return;
    hasCleanedInitialSession.current = true;

    const hasCachedQueries = queryClient.getQueryCache().getAll().length > 0;
    if (isAuthenticated || hasCachedQueries) {
      logout();
      resetAuthSessionState(queryClient);
    }
  }, [isAuthenticated, logout]);

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

  const onSuccess = (data: AuthResponse) => {
    toast.success(t('login.success'));
    // Return to the page a session-expiry redirect came from, if any.
    const from =
      'from' in location.state && typeof location.state.from === 'string'
        ? location.state.from
        : undefined;
    const target =
      data.user.role !== 'accountant' && from && from !== '/login'
        ? from
        : getDefaultAuthenticatedRoute(data.user.role);
    if (isRootDomain()) {
      // automaktab.uz has no app UI of its own -- hand off to app. with a
      // full navigation so the domain-wide auth cookie rides along.
      navigateFullPage(rootDomainAppUrl(target));
      return;
    }
    void router.navigate({ href: target, replace: true });
  };

  const onValid = (values: LoginFormValues) => {
    login.mutate(
      { email: values.email, password: values.password.trim() },
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
      <div className="glass-card w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <Brand size="lg" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('login.title')}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onValid)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('login.email_label')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      autoComplete="email"
                      onChange={(e) => {
                        field.onChange(e);
                        setFormError(null);
                      }}
                      placeholder={t('login.email_placeholder')}
                      className="mt-1.5 bg-secondary border-border"
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
                  <FormLabel>{t('login.password_label')}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      autoComplete="current-password"
                      onChange={(e) => {
                        field.onChange(e);
                        setFormError(null);
                      }}
                      placeholder={t('login.password_placeholder')}
                      className="mt-1.5 bg-secondary border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
        </Form>
      </div>
    </div>
  );
};

export default LoginPage;
