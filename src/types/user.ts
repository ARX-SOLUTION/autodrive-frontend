export type UserRole = 'dev' | 'owner' | 'manager' | 'operator' | 'teacher';
export type Specialization = 'THEORY' | 'PRACTICE';
export type CompanyStatus = 'pending' | 'active' | 'suspended';
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
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
