import { CourseType, Student } from './student';
import { LessonType } from './attendance';

export interface GroupScheduleEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  lesson_type: LessonType;
}

export interface Group {
  id: string;
  name: string;
  branch_id: string;
  branch_name?: string;
  course_type: CourseType;
  active_students: number;
  is_active: boolean;
  created_at: string;
  teacher_id: string | null;
  teacher_name: string | null;
  schedule: GroupScheduleEntry[];
  students: Student[];
  // autodrive-cg9: present (non-null) only when include_deleted=true was
  // sent (owner-only) -- distinguishes a soft-deleted row from a live one.
  deleted_at?: string | null;
}

export interface GroupOverview {
  branch_name: string;
  branch_id: string;
  groups: Group[];
}
