import type {
  BatchAttendanceRequest,
  CreateLessonRequest,
  UpdateLessonRequest,
} from '@/shared/api/contract';

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

export type CreateLessonPayload = CreateLessonRequest;

// SLICE B (autodrive-vh0.4): mirrors the backend's UpdateLessonDto
// (PartialType(OmitType(CreateLessonDto, ['groupId']))) -- groupId is
// deliberately not editable.
export type UpdateLessonPayload = UpdateLessonRequest;

export type BatchAttendancePayload = BatchAttendanceRequest;

export interface PaginatedLessons {
  data: Lesson[];
  total: number;
  page: number;
  limit: number;
}

export interface AttendanceHistoryRecord {
  id: string;
  date: string;
  group_name: string;
  status: AttendanceStatus;
}
