export interface Course {
  id: string;
  name: string;
  branch_id: string;
  branch_name?: string;
  course_type: 'tezkor' | 'avto_maktab';
  price: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateCoursePayload {
  name: string;
  branch_id: string;
  course_type: 'tezkor' | 'avto_maktab';
  price: number;
  duration_days: number;
}
