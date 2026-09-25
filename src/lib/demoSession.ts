import type { User } from '@/types/user';

export const DEMO_LOGIN_EMAIL = 'demo@automaktab.uz';
export const DEMO_COMPANY_SLUG = 'automaktab-demo-2026';

const demoPassword = () => import.meta.env.VITE_DEMO_PASSWORD?.trim() ?? '';

/** One-click sign-in only when production sets both public env vars. */
export const isOneClickDemoLoginEnabled = () =>
  import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true' &&
  demoPassword().length > 0;

export const getDemoLoginPassword = () =>
  isOneClickDemoLoginEnabled() ? demoPassword() : '';

export const isDemoCompanyUser = (
  user: Pick<User, 'email' | 'company_slug'> | null | undefined,
) => {
  if (!user) return false;
  if (user.company_slug === DEMO_COMPANY_SLUG) return true;
  return user.email?.toLowerCase() === DEMO_LOGIN_EMAIL;
};
