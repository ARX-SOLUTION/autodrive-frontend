export type DrivingSessionStatus =
  'planned' | 'submitted' | 'approved' | 'rejected' | 'cancelled';

export interface DrivingSession {
  id: string;
  company_id: string;
  branch_id: string;
  enrollment_id: string;
  student_id: string;
  student: { id: string; first_name: string; last_name: string };
  vehicle_id: string;
  vehicle: { id: string; plate_number: string };
  instructor_id: string;
  instructor: { id: string; name: string };
  starts_at: string;
  ends_at: string;
  status: DrivingSessionStatus;
  planned_minutes: number;
  actual_minutes: number | null;
  approved_minutes: number;
  gps_exception_reason: string | null;
  submitted_at: string | null;
  submitted_by_id: string | null;
  reviewed_at: string | null;
  reviewed_by_id: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  last_correction_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrivingSummary {
  enrollment_id: string;
  student_id: string;
  required_minutes: number | null;
  planned_minutes: number;
  entered_minutes: number;
  approved_minutes: number;
  exception_minutes: number;
  remaining_minutes: number | null;
}

export interface DrivingSessionFilters {
  branchId?: string;
  enrollmentId?: string;
  studentId?: string;
  vehicleId?: string;
  instructorId?: string;
  status?: DrivingSessionStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CreateDrivingSessionRequest {
  enrollment_id: string;
  vehicle_id: string;
  instructor_id: string;
  starts_at: string;
  ends_at: string;
}

export interface SubmitDrivingSessionRequest {
  actual_minutes: number;
}

export interface ApproveDrivingSessionRequest {
  gps_exception_reason: string;
}

export interface ReasonRequest {
  reason: string;
}

export interface CorrectDrivingSessionRequest extends ReasonRequest {
  actual_minutes: number;
}
