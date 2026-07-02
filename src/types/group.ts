import { CourseType, Student } from './student';

export interface Group {
  id: string;
  name: string;
  branch_id: string;
  branch_name?: string;
  course_type: CourseType;
  active_students: number;
  is_active: boolean;
  created_at: string;
}

export interface GroupOverview {
  branch_name: string;
  branch_id: string;
  groups: Group[];
}


export interface GroupsById extends Group {
  students: Student[]
}