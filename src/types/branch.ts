export interface Branch {
  id: string;
  name: string;
  location: string;
  phone?: string;
  manager_id?: string;
  manager_name?: string;
  active_students: number;
  created_at: string;
}
