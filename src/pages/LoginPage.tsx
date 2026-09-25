import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CircleNotch, Moon, Sun } from '@phosphor-icons/react';
import { useLogin } from '@/services/authService';
import { isRootDomain, navigateFullPage, rootDomainAppUrl } from '@/lib/domain';
import { queryClient, resetAuthSessionState } from '@/lib/queryClient';
import { Brand } from '@/components/layout/Brand';
import { useTheme } from '@/hooks/useTheme';
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

const makeLoginFormSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t('common.required')),
    password: z.string().min(1, t('common.required')),
  });

type LoginFormValues = z.infer<ReturnType<typeof makeLoginFormSchema>>;

const LoginPage = () => {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const [formError, setFormError] = useState<string | null>(null);
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

  const fillDemoEmail = useCallback(() => {
    form.setValue('email', 'demo@automaktab.uz', {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('password', '', { shouldDirty: true, shouldValidate: false });
    setFormError(null);
  }, [form]);

  useEffect(() => {
    const isDemoIntent =
      new URLSearchParams(location.searchStr).get('demo') === '1';
    if (!isDemoIntent || hasTriedDemoIntent.current) {
      return;
    }

    hasTriedDemoIntent.current = true;
    fillDemoEmail();
  }, [fillDemoEmail, location.searchStr]);

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 py-6 sm:px-10 sm:py-8 lg:px-14">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Brand size="sm" />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={
            theme === 'dark'
              ? t('actions.theme_light')
              : t('actions.theme_dark')
          }
          className="size-12 shrink-0 focus-visible:ring-foreground"
        >
          {theme === 'dark' ? (
            <Sun aria-hidden="true" />
          ) : (
            <Moon aria-hidden="true" />
          )}
        </Button>
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
            className="max-w-sm text-3xl font-medium leading-tight tracking-tight"
          >
            {t('login.workspace_title')}
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
            {t('login.workspace_description')}
          </p>
        </section>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-border/70 bg-card px-6 py-8 sm:px-10 sm:py-10">
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
                        className="h-12 border-muted-foreground bg-background/50 px-3.5 focus-visible:ring-foreground md:text-base"
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
                  <FormItem className="[&_button]:h-12 [&_button]:w-12 [&_button]:rounded-md [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-foreground">
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
                        className="h-12 border-muted-foreground bg-background/50 pl-3.5 pr-12 focus-visible:ring-foreground md:text-base"
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
                className="h-12 w-full text-base font-semibold focus-visible:ring-foreground"
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <CircleNotch
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                  />
                ) : null}
                {login.isPending ? t('login.submitting') : t('login.submit')}
              </Button>
              <div className="border-t border-border/70 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-12 w-full whitespace-normal border-muted-foreground py-3 text-sm focus-visible:ring-foreground"
                  onClick={fillDemoEmail}
                  disabled={login.isPending}
                >
                  {t('login.demo')}
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
