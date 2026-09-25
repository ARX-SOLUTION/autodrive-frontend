export const QUESTION_OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
export type QuestionOptionKey = (typeof QUESTION_OPTION_KEYS)[number];

export type QuestionVisibility = 'platform_public' | 'school_private';
export type QuestionStatus =
  'draft' | 'in_review' | 'published' | 'retired' | 'disputed';
export type QuestionLocale = 'uz' | 'ru' | 'en';
export type QuestionTopic =
  | 'traffic_signs'
  | 'road_markings'
  | 'right_of_way'
  | 'speed_and_distance'
  | 'signals'
  | 'overtaking'
  | 'pedestrian_crossings'
  | 'first_aid'
  | 'vehicle_safety'
  | 'liability'
  | 'general_rules';
export type QuestionMediaRightsBasis =
  'original' | 'licensed' | 'public_domain';

export const QUESTION_TOPICS: QuestionTopic[] = [
  'traffic_signs',
  'road_markings',
  'right_of_way',
  'speed_and_distance',
  'signals',
  'overtaking',
  'pedestrian_crossings',
  'first_aid',
  'vehicle_safety',
  'liability',
  'general_rules',
];

export interface QuestionOption {
  option_key: string;
  text: string;
  sort_order: number;
}

export interface QuestionLocaleContent {
  locale: QuestionLocale;
  stem: string;
  explanation: string;
  options: QuestionOption[];
}

export interface QuestionVersion {
  id: string;
  version_number: number;
  correct_option_key: string;
  source_url: string | null;
  legal_provision: string | null;
  diagram_media_id: string | null;
  published_at: string | null;
  created_at: string;
  locales: QuestionLocaleContent[];
}

export interface QuestionMedia {
  id: string;
  question_id: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  alt_text: string;
  rights_basis: string;
  rights_holder: string;
  rights_confirmed: boolean;
  created_at: string;
}

export interface Question {
  id: string;
  visibility: QuestionVisibility;
  status: QuestionStatus;
  category: string;
  topic: QuestionTopic;
  company_id: string | null;
  branch_id: string | null;
  author_id: string;
  reviewer_id: string | null;
  published_version_id: string | null;
  draft_version_id: string | null;
  published_at: string | null;
  retired_at: string | null;
  disputed_at: string | null;
  created_at: string;
  updated_at: string;
  draft_version?: QuestionVersion | null;
  published_version?: QuestionVersion | null;
  media?: QuestionMedia[];
}

export interface QuestionLocaleInput {
  locale: QuestionLocale;
  stem: string;
  explanation: string;
  options: Array<{ option_key: QuestionOptionKey; text: string }>;
}

/** CRM staff may only author school-private questions (#260). */
export interface CreateQuestionPayload {
  visibility: 'school_private';
  topic: QuestionTopic;
  branch_id?: string;
  correct_option_key: QuestionOptionKey;
  source_url?: string;
  legal_provision?: string;
  diagram_media_id?: string;
  locales: QuestionLocaleInput[];
}

export interface UpdateQuestionDraftPayload {
  topic?: QuestionTopic;
  correct_option_key?: QuestionOptionKey;
  source_url?: string | null;
  legal_provision?: string | null;
  diagram_media_id?: string | null;
  locales?: QuestionLocaleInput[];
}

export interface QuestionListFilters {
  visibility?: QuestionVisibility;
  status?: QuestionStatus;
  topic?: QuestionTopic;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface UploadQuestionMediaPayload {
  file: File;
  alt_text: string;
  rights_basis: QuestionMediaRightsBasis;
  rights_holder: string;
  rights_confirmed: true;
}

/** Active content for preview: draft if present, else published. */
export function activeQuestionVersion(
  question: Question | null | undefined,
): QuestionVersion | null {
  if (!question) return null;
  return question.draft_version ?? question.published_version ?? null;
}

export function localeContent(
  version: QuestionVersion | null | undefined,
  locale: QuestionLocale,
): QuestionLocaleContent | null {
  if (!version?.locales?.length) return null;
  return (
    version.locales.find((entry) => entry.locale === locale) ??
    version.locales[0] ??
    null
  );
}
