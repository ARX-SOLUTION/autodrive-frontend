import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, CircleNotch } from '@phosphor-icons/react';
import { useLogin } from '@/services/authService';
import { isRootDomain, navigateFullPage, rootDomainAppUrl } from '@/lib/domain';
import { queryClient, resetAuthSessionState } from '@/lib/queryClient';
import { Brand } from '@/components/layout/Brand';
import { Alert } from '@/components/ui/alert';
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
import { track } from '@/lib/umami';

const makeLoginFormSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t('common.required')),
    password: z.string().min(1, t('common.required')),
  });

type LoginFormValues = z.infer<ReturnType<typeof makeLoginFormSchema>>;

const LoginPage = () => {
  const { t, i18n } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const [demoIntentFailed, setDemoIntentFailed] = useState(false);
  const router = useRouter();
  const location = useLocation();
  const login = useLogin();
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCleanedInitialSession = useRef(false);
  const hasTriedDemoIntent = useRef(false);

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

  const handleError = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error: any) => {
      if (error.response?.status === 429) {
        toast.error(t('login.rate_limit'));
      } else if (error.response?.status === 403) {
        toast.error(t('login.company_inactive'));
      } else if (!error.response) {
        toast.error(t('login.network_error'));
      } else {
        setFormError(t('login.error'));
      }
    },
    [t],
  );

  const onSuccess = useCallback(
    (data: AuthResponse) => {
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
    },
    [location.state, router, t],
  );

  const onValid = (values: LoginFormValues) => {
    login.mutate(
      { email: values.email, password: values.password.trim() },
      { onSuccess, onError: handleError },
    );
  };

  const handleDemoLogin = useCallback(
    (automatic = false) => {
      setDemoIntentFailed(false);
      login.mutate(
        { email: 'demo@automaktab.uz', password: 'demo1234' },
        {
          onSuccess: (data) => {
            const language = (i18n.resolvedLanguage ?? i18n.language).slice(
              0,
              2,
            );
            const locale = ['uz', 'ru', 'en'].includes(language)
              ? language
              : 'uz';
            track('demo_enter', { locale });
            onSuccess(data);
          },
          onError: (error) => {
            if (automatic) {
              setDemoIntentFailed(true);
              return;
            }
            handleError(error);
          },
        },
      );
    },
    [handleError, i18n.language, i18n.resolvedLanguage, login, onSuccess],
  );

  useEffect(() => {
    const isDemoIntent =
      new URLSearchParams(location.searchStr).get('demo') === '1';
    if (
      !isDemoIntent ||
      !hasCleanedInitialSession.current ||
      hasTriedDemoIntent.current
    ) {
      return;
    }

    hasTriedDemoIntent.current = true;
    handleDemoLogin(true);
  }, [handleDemoLogin, location.searchStr]);

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 py-6 sm:px-10 sm:py-8 lg:px-14">
      <header className="mx-auto w-full max-w-6xl">
        <Brand size="sm" />
      </header>

      <main
        aria-labelledby="login-title"
        className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 py-8 sm:py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20"
      >
        <section
          className="hidden min-w-0 lg:block"
          aria-labelledby="login-workspace-title"
        >
          <p className="mb-6 text-sm font-medium text-muted-foreground">
            {t('login.workspace_label')}
          </p>
          <h2
            id="login-workspace-title"
            className="max-w-lg text-[clamp(2.75rem,4.5vw,4rem)] font-semibold leading-[1.08] tracking-[-0.045em]"
          >
            {t('login.workspace_title')}
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
            {t('login.workspace_description')}
          </p>
          <div
            aria-hidden="true"
            className="mt-10 h-1 w-12 rounded-full bg-primary"
          />
        </section>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-border/70 bg-card px-6 py-8 shadow-[0_12px_40px_-24px_hsl(var(--foreground)/0.18)] sm:px-10 sm:py-10">
          <div className="mb-8">
            <h1
              id="login-title"
              className="text-3xl font-semibold leading-tight tracking-tight"
            >
              {t('login.title')}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t('login.form_description')}
            </p>
          </div>

          <span role="status" aria-live="polite" className="sr-only">
            {login.isPending ? t('login.submitting') : ''}
          </span>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onValid)}
              className="space-y-5"
              aria-busy={login.isPending}
            >
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
                        className="h-12 bg-background/50 px-3.5 md:text-base"
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
                  <FormItem className="[&_button]:h-12 [&_button]:w-12">
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
                        className="h-12 bg-background/50 pl-3.5 pr-12 md:text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {formError && (
                <Alert
                  variant="destructive"
                  className="border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm leading-relaxed dark:border-destructive/25"
                >
                  {formError}
                </Alert>
              )}
              <Button
                type="submit"
                className="h-12 w-full text-base font-semibold"
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <CircleNotch
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                  />
                ) : null}
                {login.isPending ? t('login.submitting') : t('login.submit')}
                {!login.isPending && <ArrowRight aria-hidden="true" />}
              </Button>
              <div className="border-t border-border/70 pt-5">
                {demoIntentFailed && (
                  <Alert
                    variant="destructive"
                    className="mb-3 border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm leading-relaxed dark:border-destructive/25"
                  >
                    {t('login.demo_auto_error')}
                  </Alert>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-12 w-full whitespace-normal py-3 text-sm"
                  onClick={() => handleDemoLogin(false)}
                  disabled={login.isPending}
                >
                  {t(demoIntentFailed ? 'login.demo_retry' : 'login.demo')}
                </Button>
                <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
                  {t('login.demo_hint')}
                </p>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
