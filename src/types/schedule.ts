import { LessonType } from './attendance';

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

export interface CreateTemplatePayload {
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  lessonType: LessonType;
}

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
  1: 'Dushanba',
  2: 'Seshanba',
  3: 'Chorshanba',
  4: 'Payshanba',
  5: 'Juma',
  6: 'Shanba',
  7: 'Yakshanba',
};
