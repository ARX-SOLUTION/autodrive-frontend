export type CourseType = 'tezkor' | 'avto_maktab';
export type PaymentMethod = 'naqd' | 'karta' | 'perechisleniya';
export type ResultStatus = 'oqimoqda' | 'topshirdi' | 'yiqildi';
export type StudentStatus = 'active' | 'completed' | 'dropped' | 'suspended';

export interface Student {
  id: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  phone: string;
  email?: string;
  passport_series?: string;
  passport_number?: string;
  birth_date?: string;
  gender?: 'MALE' | 'FEMALE';
  address?: string;
  total_price: number;
  course_type: CourseType;
  course_id?: string;
  course_name?: string;
  branch_id: string;
  branch_name?: string;
  payment_method: PaymentMethod;
  debt: number;
  has_document: boolean;
  registered_by?: string;
  registered_by_id?: string;
  result: ResultStatus;
  notes?: string;
  created_at: string;
  status?: StudentStatus;

  // Tezkor only
  amount_paid?: number;

  // Avto maktab only
  initial_payment?: number;
  second_payment?: number;
  third_payment?: number;
  group_name?: string;
  group_id?: string;
  completion_date?: string;
  o83?: boolean;
  contract_number?: string;

  // New fields from detailed registration
  start_date?: string;
  payment_type?: 'FULL' | 'PARTIAL' | 'INSTALLMENT';
}
