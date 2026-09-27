import { CourseType, PaymentMethod } from '@/features/students/types';

export interface Payment {
  id: string;
  student_id: string;
  student_name: string;
  branch_id: string;
  branch_name: string;
  course_type: CourseType;
  total_price: number;
  amount_paid: number;
  remaining_debt: number;
  payment_method: PaymentMethod;
  recorded_by: string | null;
  date: string;
  created_at: string;
}

export interface PaymentSnapshot {
  today_income: number;
  this_month_income: number;
  current_total_debt: number;
  students_with_debt: number;
}

export interface PaymentSummary {
  period_collected: number;
  period_payments_count: number;
  period_debt: number;
}
