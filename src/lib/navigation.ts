import {
  SquaresFour,
  Buildings,
  GraduationCap,
  CreditCard,
  Wallet,
  Headphones,
  UsersThree,
  User,
  Stack,
  UserGear,
  ShieldCheck,
  Calendar,
  ListChecks,
  BookOpen,
} from '@phosphor-icons/react';
import type { Capability } from '@/lib/permissions';

export type NavSectionId = 'workspace' | 'learning' | 'team' | 'system';

export type AppRoutePath =
  | '/dashboard'
  | '/schedule'
  | '/attendance'
  | '/groups'
  | '/courses'
  | '/students'
  | '/payments'
  | '/expenses'
  | '/branches'
  | '/operators'
  | '/teachers'
  | '/users'
  | '/audit'
  | '/profile';

export type NavItem = {
  path: AppRoutePath;
  labelKey: string;
  icon: typeof SquaresFour;
  section: NavSectionId;
  cap?: Capability;
  pinnable?: boolean;
};

export const NAV_SECTIONS: Array<{ id: NavSectionId; labelKey: string }> = [
  { id: 'workspace', labelKey: 'nav_sections.workspace' },
  { id: 'learning', labelKey: 'nav_sections.learning' },
  { id: 'team', labelKey: 'nav_sections.team' },
  { id: 'system', labelKey: 'nav_sections.system' },
];

// This is the one source of truth for the sidebar and Command Palette. Route
// guards still enforce authorization; these capability flags only control what
// the client presents to a signed-in user.
export const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: SquaresFour,
    section: 'workspace',
    cap: 'viewDashboard',
  },
  {
    path: '/schedule',
    labelKey: 'nav.schedule',
    icon: Calendar,
    section: 'workspace',
    cap: 'accessOperations',
  },
  {
    path: '/attendance',
    labelKey: 'nav.attendance',
    icon: ListChecks,
    section: 'workspace',
    cap: 'accessOperations',
  },
  {
    path: '/groups',
    labelKey: 'nav.groups',
    icon: Stack,
    section: 'learning',
    cap: 'accessOperations',
  },
  {
    path: '/courses',
    labelKey: 'nav.courses',
    icon: BookOpen,
    section: 'learning',
    cap: 'manageStaff',
  },
  {
    path: '/students',
    labelKey: 'nav.students',
    icon: GraduationCap,
    section: 'learning',
    cap: 'accessOperations',
  },
  {
    path: '/payments',
    labelKey: 'nav.payments',
    icon: CreditCard,
    section: 'learning',
    cap: 'recordPayment',
  },
  {
    path: '/expenses',
    labelKey: 'nav.expenses',
    icon: Wallet,
    section: 'workspace',
    cap: 'viewExpenses',
  },
  {
    path: '/branches',
    labelKey: 'nav.branches',
    icon: Buildings,
    section: 'team',
    cap: 'manageBranches',
  },
  {
    path: '/operators',
    labelKey: 'nav.operators',
    icon: Headphones,
    section: 'team',
    cap: 'manageStaff',
  },
  {
    path: '/teachers',
    labelKey: 'nav.teachers',
    icon: UsersThree,
    section: 'team',
    cap: 'manageStaff',
  },
  {
    path: '/users',
    labelKey: 'nav.users',
    icon: UserGear,
    section: 'team',
    cap: 'manageUsers',
  },
  {
    path: '/audit',
    labelKey: 'nav.audit',
    icon: ShieldCheck,
    section: 'system',
    cap: 'viewAudit',
  },
  {
    path: '/profile',
    labelKey: 'nav.profile',
    icon: User,
    section: 'system',
    pinnable: false,
  },
];
