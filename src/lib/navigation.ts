import {
  SquaresFour,
  FunnelSimple,
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
  Car,
  MapTrifold,
  Exam,
  ClipboardText,
  Briefcase,
  SteeringWheel,
  GearSix,
} from '@phosphor-icons/react';
import type { Capability } from '@/lib/permissions';
import { drivingSessionsEnabled } from '@/lib/featureAvailability';

export type NavSectionId =
  'workspace' | 'vehicles' | 'learning' | 'team' | 'system';

export type AppRoutePath =
  | '/dashboard'
  | '/schedule'
  | '/attendance'
  | '/groups'
  | '/vehicle-fuel'
  | '/vehicle-inspections'
  | '/fuel-stations'
  | '/vehicles'
  | '/fleet-map'
  | '/training-programs'
  | '/training-enrollments'
  | '/driving-sessions'
  | '/courses'
  | '/students'
  | '/leads'
  | '/questions'
  | '/school-tests'
  | '/payments'
  | '/expenses'
  | '/my-settlements'
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

export type NavSection = {
  id: NavSectionId;
  labelKey: string;
  icon: typeof SquaresFour;
  collapsible?: boolean;
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'workspace',
    labelKey: 'nav_sections.workspace',
    icon: Briefcase,
    collapsible: false,
  },
  { id: 'vehicles', labelKey: 'nav_sections.vehicles', icon: SteeringWheel },
  { id: 'learning', labelKey: 'nav_sections.learning', icon: GraduationCap },
  { id: 'team', labelKey: 'nav_sections.team', icon: UsersThree },
  { id: 'system', labelKey: 'nav_sections.system', icon: GearSix },
];

// This is the one source of truth for the sidebar and Command Palette. Route
// guards still enforce authorization; these capability flags only control what
// the client presents to a signed-in user.
const allNavItems: NavItem[] = [
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
    path: '/leads',
    labelKey: 'nav.leads',
    icon: FunnelSimple,
    section: 'workspace',
    cap: 'accessLeads',
    pinnable: true,
  },
  {
    path: '/groups',
    labelKey: 'nav.groups',
    icon: Stack,
    section: 'learning',
    cap: 'accessOperations',
  },
  {
    path: '/vehicle-fuel',
    labelKey: 'fuel.title',
    icon: Car,
    section: 'vehicles',
    cap: 'viewFuel',
  },
  {
    path: '/vehicle-inspections',
    labelKey: 'inspections.title',
    icon: ShieldCheck,
    section: 'vehicles',
    cap: 'viewInspections',
  },
  {
    path: '/fuel-stations',
    labelKey: 'fuel.stations',
    icon: Buildings,
    section: 'vehicles',
    cap: 'viewFuel',
  },
  {
    path: '/vehicles',
    labelKey: 'nav.vehicles',
    icon: Car,
    section: 'vehicles',
    cap: 'viewVehicles',
  },
  {
    path: '/fleet-map',
    labelKey: 'nav.fleet_map',
    icon: MapTrifold,
    section: 'vehicles',
    cap: 'viewFleetMap',
  },
  {
    path: '/training-programs',
    labelKey: 'nav.training_programs',
    icon: BookOpen,
    section: 'learning',
    cap: 'viewTrainingPrograms',
  },
  {
    path: '/training-enrollments',
    labelKey: 'nav.training_enrollments',
    icon: GraduationCap,
    section: 'learning',
    cap: 'viewTrainingEnrollments',
  },
  {
    path: '/driving-sessions',
    labelKey: 'nav.driving_sessions',
    icon: Car,
    section: 'learning',
    cap: 'viewDrivingSessions',
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
    path: '/questions',
    labelKey: 'nav.questions',
    icon: Exam,
    section: 'learning',
    cap: 'viewSchoolLearning',
  },
  {
    path: '/school-tests',
    labelKey: 'nav.school_tests',
    icon: ClipboardText,
    section: 'learning',
    cap: 'viewSchoolLearning',
  },
  {
    path: '/payments',
    labelKey: 'nav.payments',
    icon: CreditCard,
    section: 'learning',
    cap: 'viewPayments',
  },
  {
    path: '/expenses',
    labelKey: 'nav.expenses',
    icon: Wallet,
    section: 'workspace',
    cap: 'viewExpenses',
  },
  {
    path: '/my-settlements',
    labelKey: 'nav.my_settlements',
    icon: Wallet,
    section: 'workspace',
    cap: 'viewOwnSettlements',
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

export const NAV_ITEMS = allNavItems.filter(
  (item) => drivingSessionsEnabled || item.path !== '/driving-sessions',
);
