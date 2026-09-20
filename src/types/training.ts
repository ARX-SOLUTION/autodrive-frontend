import type { CourseType } from '@/types/student';
import type { VehicleCategory } from '@/types/vehicle';

export interface TrainingProgram {
  id: string;
  company_id: string;
  branch_id: string;
  course_id: string | null;
  name: string;
  course_type: CourseType;
  category: VehicleCategory;
  required_minutes: number;
  is_active: boolean;
  approved_by_id: string;
  approved_at: string;
  created_at: string;
  updated_at: string;
}

export type TrainingEnrollmentStatus =
  'legacy' | 'active' | 'completed' | 'cancelled';

export interface TrainingEnrollment {
  id: string;
  company_id: string;
  branch_id: string;
  student: { id: string; first_name: string; last_name: string };
  program_id: string | null;
  program_name: string | null;
  course_id: string | null;
  course_type: CourseType;
  category: VehicleCategory | null;
  required_minutes: number | null;
  approved_minutes: number;
  remaining_minutes: number | null;
  status: TrainingEnrollmentStatus;
  created_at: string;
  updated_at: string;
}

export interface TrainingProgramFilters {
  branchId?: string;
  category?: VehicleCategory;
  active?: boolean;
  page?: number;
  limit?: number;
}

export interface TrainingEnrollmentFilters {
  branchId?: string;
  studentId?: string;
  status?: TrainingEnrollmentStatus;
  page?: number;
  limit?: number;
}

export interface CreateTrainingProgramRequest {
  branch_id: string;
  course_id?: string;
  name: string;
  course_type: CourseType;
  category: VehicleCategory;
  required_minutes: number;
}

export interface UpdateTrainingProgramRequest {
  name?: string;
  required_minutes?: number;
  is_active?: boolean;
}

export interface CreateTrainingEnrollmentRequest {
  student_id: string;
  program_id: string;
  branch_id?: string;
}
