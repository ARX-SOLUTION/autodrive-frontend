export type UserRole =
  'dev' | 'owner' | 'manager' | 'accountant' | 'operator' | 'teacher';
export type Specialization = 'THEORY' | 'PRACTICE';
export type CompanyStatus = 'pending' | 'active' | 'suspended';

// Matches UserResponse's `groups`/`registered_students` extras (backend
// users.service.ts findById) — id + display name only, no full Group/Student.
export interface UserRelationSummary {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name?: string;
  email: string;
  role: UserRole;
  branch_id?: string | null;
  branch_name?: string;
  company_id?: string;
  company_status?: CompanyStatus;
  company_features?: Record<string, boolean>;
  phone?: string;
  avatar?: string;
  specialization?: Specialization;
  is_active?: boolean;
  created_at?: string;
  must_change_password?: boolean;
  // Role-relevant relations from GET /users/:id — teacher only.
  groups?: UserRelationSummary[];
  // Role-relevant relations from GET /users/:id — operator only.
  registered_students?: UserRelationSummary[];
  // autodrive-sgf.4 — GET /users?role=teacher list columns (lifetime, not
  // period-scoped — this page has no date filter).
  lesson_count?: number;
  student_count?: number;
  // autodrive-sgf.4 — GET /users?role=operator list columns.
  registered_students_count?: number;
  payment_follow_through_rate?: number | null;
  // GET /users/:id (detail only, not the list) — students this user referred.
  referred_students_count?: number;
  // autodrive-cg9: present (non-null) only when include_deleted=true was
  // sent (owner-only) -- distinguishes a soft-deleted row from a live one.
  deleted_at?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
