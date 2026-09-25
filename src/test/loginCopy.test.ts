import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';
import uz from '@/i18n/locales/uz.json';
import { getLoginCopy, type LoginCopy } from '@/pages/loginCopy';

const locales = { uz, ru, en } as const;

const loginFields = {
  workspaceLabel: 'workspace_label',
  workspaceTitle: 'workspace_title',
  workspaceDescription: 'workspace_description',
  formDescription: 'form_description',
  title: 'title',
  emailLabel: 'email_label',
  emailPlaceholder: 'email_placeholder',
  passwordLabel: 'password_label',
  passwordPlaceholder: 'password_placeholder',
  submit: 'submit',
  submitting: 'submitting',
  success: 'success',
  error: 'error',
  rateLimit: 'rate_limit',
  networkError: 'network_error',
  companyInactive: 'company_inactive',
  demo: 'demo',
  demoHint: 'demo_hint',
  demoSignIn: 'demo_sign_in',
  demoSignInHint: 'demo_sign_in_hint',
  demoRetry: 'demo_retry',
  demoAutoError: 'demo_auto_error',
} as const satisfies Record<string, keyof (typeof uz)['login']>;

describe('login copy', () => {
  it('matches the uz, ru, and en catalogs', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      const copy = getLoginCopy(lang);
      const catalog = locales[lang];
      expect(copy.appTitle).toBe(catalog.app.title);
      expect(copy.themeDark).toBe(catalog.actions.theme_dark);
      expect(copy.themeLight).toBe(catalog.actions.theme_light);
      expect(copy.required).toBe(catalog.common.required);
      expect(copy.showPassword).toBe(catalog.common.show_password);
      expect(copy.hidePassword).toBe(catalog.common.hide_password);
      for (const [prop, key] of Object.entries(loginFields)) {
        expect(copy[prop as keyof LoginCopy]).toBe(catalog.login[key]);
      }
    }
  });
});
