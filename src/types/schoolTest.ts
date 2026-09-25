export type TestTemplateStatus = 'draft' | 'published' | 'archived';
export type AnswerReviewTiming =
  'never' | 'immediate' | 'after_submit' | 'after_deadline';
export type QuestionLicenseCategory = 'B';

export interface TestTemplateQuestion {
  question_id: string;
  sort_order: number;
}

export interface TestTemplate {
  id: string;
  company_id: string;
  branch_id: string;
  created_by_id: string;
  title: string;
  description: string | null;
  category: QuestionLicenseCategory;
  status: TestTemplateStatus;
  question_count: number;
  time_limit_seconds: number;
  passing_threshold_percent: number;
  available_from: string | null;
  available_until: string | null;
  retry_limit: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  answer_review_timing: AnswerReviewTiming;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  questions?: TestTemplateQuestion[];
}

export interface TestAssignment {
  id: string;
  template_id: string;
  company_id: string;
  branch_id: string;
  group_id: string | null;
  student_id: string | null;
  assigned_by_id: string;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
}

export interface CreateTestTemplatePayload {
  title: string;
  description?: string;
  category?: QuestionLicenseCategory;
  branch_id?: string;
  question_count: number;
  time_limit_seconds: number;
  passing_threshold_percent: number;
  available_from?: string;
  available_until?: string;
  retry_limit?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  answer_review_timing?: AnswerReviewTiming;
  question_ids: string[];
}

export interface UpdateTestTemplatePayload {
  title?: string;
  description?: string;
  question_count?: number;
  time_limit_seconds?: number;
  passing_threshold_percent?: number;
  available_from?: string | null;
  available_until?: string | null;
  retry_limit?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  answer_review_timing?: AnswerReviewTiming;
  question_ids?: string[];
}

export interface AssignTestPayload {
  group_id?: string;
  student_id?: string;
  available_from?: string;
  available_until?: string;
}

export interface TestTemplateListFilters {
  page?: number;
  limit?: number;
}

/** Assignment window status for staff monitoring (not attempt scores). */
export type AssignmentWindowStatus = 'scheduled' | 'open' | 'closed';

export function assignmentWindowStatus(
  assignment: TestAssignment,
  now = new Date(),
): AssignmentWindowStatus {
  const from = assignment.available_from
    ? new Date(assignment.available_from)
    : null;
  const until = assignment.available_until
    ? new Date(assignment.available_until)
    : null;
  if (from && now < from) return 'scheduled';
  if (until && now > until) return 'closed';
  return 'open';
}
