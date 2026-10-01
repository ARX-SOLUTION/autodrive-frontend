import type { User } from '@/features/staff/types';

export const DEMO_LOGIN_EMAIL = 'demo@automaktab.uz';
export const DEMO_COMPANY_SLUG = 'automaktab-demo-2026';

/** One-click sign-in only when production enables the public flag. */
export const isOneClickDemoLoginEnabled = () =>
  import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

export const isDemoCompanyUser = (
  user: Pick<User, 'email' | 'company_slug'> | null | undefined,
) => {
  if (!user) return false;
  if (user.company_slug === DEMO_COMPANY_SLUG) return true;
  return user.email?.toLowerCase() === DEMO_LOGIN_EMAIL;
};
