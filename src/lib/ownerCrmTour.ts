import { isDemoCompanyUser } from '@/lib/demoSession';

export const CRM_TOUR_DESKTOP_QUERY = '(min-width: 1024px)';

export const OWNER_CRM_TOUR_STEPS = [
  { id: 'sidebar', route: '/dashboard' },
  { id: 'dashboard', route: '/dashboard' },
  { id: 'students', route: '/students' },
  { id: 'payment', route: '/payments' },
] as const;

export type OwnerCrmTourStepId = (typeof OWNER_CRM_TOUR_STEPS)[number]['id'];
export type OwnerCrmTourRoute = (typeof OWNER_CRM_TOUR_STEPS)[number]['route'];

export const CRM_TOUR_TARGET = {
  sidebarDesktop: '[data-tour="crm-sidebar-desktop"]',
  sidebarMobile: '[data-tour="crm-sidebar-mobile"]',
  dashboard: '[data-tour="crm-dashboard"]',
  students: '[data-tour="crm-students"]',
  payment: '[data-tour="crm-take-payment"]',
} as const;

export type TourStartInput = {
  role?: string | null;
  email?: string | null;
  companySlug?: string | null;
  crmTourCompletedAt?: string | null;
  blockingModal: boolean;
};

export const normalizeTourPath = (pathname: string) => {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

export const crmTourTargetSelector = (stepId: OwnerCrmTourStepId) => {
  if (stepId === 'sidebar') {
    const desktop = window.matchMedia(CRM_TOUR_DESKTOP_QUERY).matches;
    return desktop
      ? CRM_TOUR_TARGET.sidebarDesktop
      : CRM_TOUR_TARGET.sidebarMobile;
  }
  if (stepId === 'dashboard') return CRM_TOUR_TARGET.dashboard;
  if (stepId === 'students') return CRM_TOUR_TARGET.students;
  return CRM_TOUR_TARGET.payment;
};

/** Owner, not the demo company, tour still null, and no forced modal. */
export const shouldStartTour = (input: TourStartInput) => {
  if (input.blockingModal) return false;
  if (input.role !== 'owner') return false;
  if (
    isDemoCompanyUser({
      email: input.email ?? '',
      company_slug: input.companySlug,
    })
  ) {
    return false;
  }
  return !input.crmTourCompletedAt?.trim();
};
