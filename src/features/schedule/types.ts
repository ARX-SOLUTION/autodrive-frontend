import { LessonType } from '@/features/attendance/types';
import type {
  CreateTemplateRequest,
  GenerateLessonsRequest,
} from '@/shared/api/contract';

export interface ScheduleTemplate {
  id: string;
  group_id: string;
  group_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  lesson_type: LessonType;
  is_active: boolean;
  teacher_name?: string;
}

export type CreateTemplatePayload = CreateTemplateRequest;
export type GenerateLessonPayload = GenerateLessonsRequest;

export interface CalendarLesson {
  id: string;
  title: string;
  date: string;
  lesson_type: LessonType;
  group_id: string;
  group_name: string;
  branch_id: string;
  teacher_name?: string;
  present_count: number;
  total_count: number;
}

export interface GenerateResult {
  created: number;
  skipped: number;
  message: string;
}

export const DAY_LABELS: Record<number, string> = {
  1: 'schedule.day_monday',
  2: 'schedule.day_tuesday',
  3: 'schedule.day_wednesday',
  4: 'schedule.day_thursday',
  5: 'schedule.day_friday',
  6: 'schedule.day_saturday',
  7: 'schedule.day_sunday',
};
