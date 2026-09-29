import type { PageSizeOption } from '@/lib/listQuery';

export type LeadStageKind = 'NEW' | 'WORK' | 'WON' | 'LOST';

export type LeadActivityKind =
  'NOTE' | 'CALL' | 'TASK' | 'STAGE_CHANGE' | 'SYSTEM';

export type LeadLostReason =
  | 'EXPENSIVE'
  | 'FAR_AWAY'
  | 'BAD_SCHEDULE'
  | 'COMPETITOR'
  | 'NOT_INTERESTED'
  | 'NO_ANSWER'
  | 'OTHER';

export type LeadSource =
  | 'telegram'
  | 'instagram'
  | 'website'
  | 'recommendation'
  | 'banner'
  | 'walk_in'
  | 'other';

export type CourseType = 'tezkor' | 'avto_maktab';

export type Category = 'A' | 'B' | 'BC' | 'C' | 'D' | 'E';

export interface LeadStage {
  id: string;
  companyId: string;
  name: string;
  kind: LeadStageKind;
  position: number;
  color: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivity {
  id: string;
  companyId: string;
  branchId: string;
  leadId: string;
  kind: LeadActivityKind;
  body: string | null;
  dueAt: string | null;
  doneAt: string | null;
  authorUserId: string | null;
  authorName?: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  companyId: string;
  branchId: string;
  branchName?: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  courseType: CourseType | null;
  category: Category | null;
  source: LeadSource;
  sourceOther: string | null;
  referrerStudentId: string | null;
  referrerStudentName?: string | null;
  referrerStaffId: string | null;
  referrerStaffName?: string | null;
  desiredGroupId: string | null;
  desiredGroupName?: string | null;
  assigneeUserId: string | null;
  assigneeName?: string | null;
  stageId: string;
  stage?: LeadStage;
  stageEnteredAt: string;
  nextStepAt: string | null;
  lastTouchAt: string;
  marketingConsent: boolean;
  note: string | null;
  lostReason: LeadLostReason | null;
  lostReasonOther: string | null;
  studentId: string | null;
  convertedAt: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrer: string | null;
  landing: string | null;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  activities?: LeadActivity[];
}

export interface LeadCard {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  branchId: string;
  branchName?: string;
  source: LeadSource;
  category: Category | null;
  assigneeUserId: string | null;
  assigneeName?: string | null;
  stageId: string;
  nextStepAt: string | null;
  lastTouchAt: string;
  version: number;
  createdAt: string;
  isOverdue?: boolean;
}

export interface LeadBoardColumn {
  stage: LeadStage;
  leads: LeadCard[];
  count: number;
}

export interface LeadMetrics {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  avgTimeToWonDays: number | null;
  bySource: Record<
    string,
    { count: number; won: number; conversionRate: number }
  >;
  byLostReason: Record<string, number>;
  byStage: Record<string, number>;
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  duplicateLead?: {
    id: string;
    firstName: string;
    lastName: string | null;
    stageName: string;
    branchName?: string;
  } | null;
  duplicateStudent?: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    branchName?: string;
  } | null;
}

export interface ListLeadsQuery {
  q?: string;
  branch_id?: string;
  stage_id?: string;
  source?: LeadSource;
  course_type?: CourseType;
  category?: Category;
  assigned_to_me?: boolean;
  assignee_user_id?: string;
  overdue_only?: boolean;
  has_task?: boolean;
  period?: '7d' | '30d' | '60d' | 'all';
  tab?: 'new' | 'in_progress' | 'won' | 'lost' | 'all';
  page?: number;
  limit?: PageSizeOption | number;
}

export interface CreateLeadPayload {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  branchId: string;
  stageId?: string;
  courseType?: CourseType;
  category?: Category;
  source: LeadSource;
  sourceOther?: string;
  referrerStudentId?: string;
  referrerStaffId?: string;
  desiredGroupId?: string;
  assigneeUserId?: string;
  marketingConsent?: boolean;
  note?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landing?: string;
}

export interface UpdateLeadPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  branchId?: string;
  courseType?: CourseType;
  category?: Category;
  source?: LeadSource;
  sourceOther?: string;
  referrerStudentId?: string;
  referrerStaffId?: string;
  desiredGroupId?: string;
  assigneeUserId?: string;
  marketingConsent?: boolean;
  note?: string;
}

export interface LeadStageTransitionPayload {
  stageId: string;
  lostReason?: LeadLostReason;
  lostReasonOther?: string;
  version: number;
}

export interface AssignLeadPayload {
  assigneeUserId: string | null;
}

export interface ConvertLeadPayload {
  force?: boolean;
}

export interface CreateLeadActivityPayload {
  kind: LeadActivityKind;
  body?: string;
  dueAt?: string | null;
  meta?: Record<string, unknown>;
}

export interface UpdateLeadActivityPayload {
  body?: string;
  doneAt?: string | null;
}

export interface UpdateLeadStagesPayload {
  stages: Array<{
    id?: string;
    name: string;
    color: string;
    position: number;
    isActive?: boolean;
  }>;
  moveToStageId?: string;
}
