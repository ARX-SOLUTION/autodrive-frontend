export type UserRole = 'dev' | 'owner' | 'manager' | 'operator' | 'teacher';
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
  branch_id?: string;
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
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
