import { Student } from './student';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type LessonType = 'theory' | 'practice';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  status: AttendanceStatus;
  notes?: string;
  marked_by_id: string;
  marked_by_name?: string;
}

export interface Lesson {
  id: string;
  title: string;
  date: string;
  lesson_type: LessonType;
  group_id: string;
  group_name?: string;
  branch_id: string;
  created_by_id: string;
  created_at: string;
  attendance: AttendanceRecord[];
}

export interface CreateLessonPayload {
  title: string;
  date: string;
  lessonType: LessonType;
  groupId: string;
}

export interface BatchAttendancePayload {
  lessonId: string;
  records: {
    lessonId: string;
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
  }[];
}

export interface PaginatedLessons {
  data: Lesson[];
  total: number;
  page: number;
  limit: number;
}
