import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useRouter } from '@tanstack/react-router';
import { CircleNotch, Moon, Sun } from '@phosphor-icons/react';
import { useLogin } from '@/services/authService';
import { isRootDomain, navigateFullPage, rootDomainAppUrl } from '@/lib/domain';
import { queryClient, resetAuthSessionState } from '@/lib/queryClient';
import { preconnectApi } from '@/lib/preconnectApi';
import { ensureI18n } from '@/i18n/ensure';
import { BrandMark } from '@/components/layout/BrandMark';
import { useTheme } from '@/hooks/useTheme';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordField } from '@/components/ui/password-field';
import { useAuthStore } from '@/store/authStore';
import type { AuthResponse } from '@/types/user';
import { getDefaultAuthenticatedRoute } from '@/lib/defaultAuthenticatedRoute';
import {
  DEMO_LOGIN_EMAIL,
  getDemoLoginPassword,
  isOneClickDemoLoginEnabled,
} from '@/lib/demoSession';
import { getLoginCopy, readLoginLang } from '@/pages/loginCopy';

type FieldErrors = {
  email?: string;
  password?: string;
};

const errorResponse = (error: unknown) =>
  (error as { response?: { status?: number } } | null)?.response;

const notify = (kind: 'success' | 'error', message: string) => {
  void import('sonner')
    .then(({ toast }) => toast[kind](message))
    .catch(() => undefined);
};

const LoginPage = () => {
  const lang = useMemo(() => readLoginLang(), []);
  const copy = useMemo(() => getLoginCopy(lang), [lang]);
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [demoIntentFailed, setDemoIntentFailed] = useState(false);
  const router = useRouter();
  const location = useLocation();
  const login = useLogin();
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCleanedInitialSession = useRef(false);
  const hasTriedDemoIntent = useRef(false);
  const hasPreconnected = useRef(false);
  const emailId = 'login-email';
  const passwordId = 'login-password';

  const warmApiConnection = useCallback(() => {
    if (hasPreconnected.current) return;
    hasPreconnected.current = true;
    preconnectApi();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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
    (error: unknown) => {
      const response = errorResponse(error);
      if (response?.status === 429) {
        notify('error', copy.rateLimit);
      } else if (response?.status === 403) {
        notify('error', copy.companyInactive);
      } else if (!response) {
        notify('error', copy.networkError);
      } else {
        setFormError(copy.error);
      }
    },
    [copy],
  );

  const onSuccess = useCallback(
    (data: AuthResponse) => {
      notify('success', copy.success);
      const from =
        'from' in location.state && typeof location.state.from === 'string'
          ? location.state.from
          : undefined;
      const target =
        data.user.role !== 'accountant' && from && from !== '/login'
          ? from
          : getDefaultAuthenticatedRoute(data.user.role);
      void ensureI18n()
        .catch(() => undefined)
        .then(() => {
          if (isRootDomain()) {
            // automaktab.uz has no app UI of its own -- hand off to app. with a
            // full navigation so the domain-wide auth cookie rides along.
            navigateFullPage(rootDomainAppUrl(target));
            return;
          }
          void router.navigate({ href: target, replace: true });
        });
    },
    [copy.success, location.state, router],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (email.length === 0) nextErrors.email = copy.required;
    if (password.length === 0) nextErrors.password = copy.required;
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    warmApiConnection();
    login.mutate(
      { email, password: password.trim() },
      { onSuccess, onError: handleError },
    );
  };

  const fillDemoEmail = useCallback(() => {
    setEmail(DEMO_LOGIN_EMAIL);
    setPassword('');
    setFieldErrors((current) => ({ ...current, email: undefined }));
    setFormError(null);
  }, []);

  const startDemoLogin = useCallback(
    (automatic: boolean) => {
      if (!isOneClickDemoLoginEnabled()) {
        fillDemoEmail();
        return;
      }

      const demoPassword = getDemoLoginPassword();
      setDemoIntentFailed(false);
      setFormError(null);
      setFieldErrors({});
      setEmail(DEMO_LOGIN_EMAIL);
      setPassword('');
      warmApiConnection();
      login.mutate(
        { email: DEMO_LOGIN_EMAIL, password: demoPassword },
        {
          onSuccess,
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
    [fillDemoEmail, handleError, login, onSuccess, warmApiConnection],
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
    startDemoLogin(true);
  }, [location.searchStr, startDemoLogin]);

  const oneClickDemo = isOneClickDemoLoginEnabled();
  const demoLabel = demoIntentFailed
    ? copy.demoRetry
    : oneClickDemo
      ? copy.demoSignIn
      : copy.demo;

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 py-6 sm:px-10 sm:py-8 lg:px-14">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <BrandMark size="sm" title={copy.appTitle} />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={theme === 'dark' ? copy.themeLight : copy.themeDark}
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
            {copy.workspaceLabel}
          </p>
          <h2
            id="login-workspace-title"
            className="max-w-sm text-3xl font-medium leading-tight tracking-tight"
          >
            {copy.workspaceTitle}
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
            {copy.workspaceDescription}
          </p>
        </section>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-border/70 bg-card px-6 py-8 sm:px-10 sm:py-10">
          <div className="mb-8">
            <h1
              id="login-title"
              className="text-3xl font-semibold leading-tight tracking-tight"
            >
              {copy.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {copy.formDescription}
            </p>
          </div>

          <span role="status" aria-live="polite" className="sr-only">
            {login.isPending ? copy.submitting : ''}
          </span>

          <form
            onSubmit={onSubmit}
            onFocus={warmApiConnection}
            className="space-y-5"
            aria-busy={login.isPending}
          >
            <div className="space-y-2">
              <label
                htmlFor={emailId}
                className={
                  fieldErrors.email
                    ? 'text-sm font-medium leading-none text-destructive'
                    : 'text-sm font-medium leading-none'
                }
              >
                {copy.emailLabel}
              </label>
              <Input
                id={emailId}
                value={email}
                type="email"
                autoComplete="email"
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={
                  fieldErrors.email ? `${emailId}-error` : undefined
                }
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFormError(null);
                  setFieldErrors((current) =>
                    current.email ? { ...current, email: undefined } : current,
                  );
                }}
                placeholder={copy.emailPlaceholder}
                className="h-12 border-muted-foreground bg-background/50 px-3.5 focus-visible:ring-foreground md:text-base"
              />
              {fieldErrors.email ? (
                <p
                  id={`${emailId}-error`}
                  className="text-sm font-medium text-destructive"
                >
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 [&_button]:h-12 [&_button]:w-12 [&_button]:rounded-md [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-foreground">
              <label
                htmlFor={passwordId}
                className={
                  fieldErrors.password
                    ? 'text-sm font-medium leading-none text-destructive'
                    : 'text-sm font-medium leading-none'
                }
              >
                {copy.passwordLabel}
              </label>
              <PasswordField
                id={passwordId}
                value={password}
                autoComplete="current-password"
                showLabel={copy.showPassword}
                hideLabel={copy.hidePassword}
                aria-invalid={fieldErrors.password ? true : undefined}
                aria-describedby={
                  fieldErrors.password ? `${passwordId}-error` : undefined
                }
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFormError(null);
                  setFieldErrors((current) =>
                    current.password
                      ? { ...current, password: undefined }
                      : current,
                  );
                }}
                placeholder={copy.passwordPlaceholder}
                className="h-12 border-muted-foreground bg-background/50 pl-3.5 pr-12 focus-visible:ring-foreground md:text-base"
              />
              {fieldErrors.password ? (
                <p
                  id={`${passwordId}-error`}
                  className="text-sm font-medium text-destructive"
                >
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>
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
              {login.isPending ? copy.submitting : copy.submit}
            </Button>
            <div className="border-t border-border/70 pt-5">
              {demoIntentFailed && (
                <Alert
                  variant="destructive"
                  className="mb-3 border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm leading-relaxed dark:border-destructive/25"
                >
                  {copy.demoAutoError}
                </Alert>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-12 w-full whitespace-normal border-muted-foreground py-3 text-sm focus-visible:ring-foreground"
                onClick={() => startDemoLogin(false)}
                disabled={login.isPending}
              >
                {demoLabel}
              </Button>
              <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
                {oneClickDemo ? copy.demoSignInHint : copy.demoHint}
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
