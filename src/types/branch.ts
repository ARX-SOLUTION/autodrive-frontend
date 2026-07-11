export interface Branch {
  id: string;
  name: string;
  location: string;
  phone?: string;
  manager_id?: string;
  manager_name?: string;
  active_students: number;
  created_at: string;
  revenue?: number;
  debt?: number;
  today_payment?: number;
  monthly_revenue?: { month: string; amount: number }[];
  top_debtors?: { id: string; name: string; debt: number }[];
}
