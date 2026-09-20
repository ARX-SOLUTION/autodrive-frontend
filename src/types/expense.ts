export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'vehicle'
  | 'marketing'
  | 'supplies'
  | 'administrative'
  | 'teacher_settlement'
  | 'other';

export type ExpenseStatus = 'planned' | 'partially_paid' | 'paid' | 'cancelled';

export interface Expense {
  id: string;
  branch_id: string | null;
  branch_name: string | null;
  vehicle_id: string | null;
  vehicle_plate_number: string | null;
  created_by_id: string;
  category: ExpenseCategory;
  title: string;
  amount: string;
  expense_date: string;
  due_date: string | null;
  payee: string | null;
  note: string | null;
  teacher_id?: string | null;
  period_month?: string | null;
  paid_amount: string;
  remaining_amount: string;
  status: ExpenseStatus;
  reviewed_at: string | null;
  reviewed_by_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  has_payment_history?: boolean;
  overdue_days?: number;
}

export type OverdueExpense = Expense & { overdue_days: number };

export type ExpensePaymentMethod = 'naqd' | 'karta' | 'perechisleniya';

export interface ExpensePayment {
  id: string;
  expense_id: string;
  company_id: string;
  branch_id: string | null;
  amount: string;
  payment_method: ExpensePaymentMethod;
  date: string;
  note: string | null;
  recorded_by_id: string;
  idempotency_key: string;
  voided_at: string | null;
  voided_by_id?: string | null;
  void_reason?: string | null;
  created_at: string;
}

export interface ExpenseHistory {
  expense: Expense;
  payments: ExpensePayment[];
}

export interface CreateExpensePaymentPayload {
  amount: string;
  payment_method: ExpensePaymentMethod;
  date: string;
  note?: string | null;
  idempotency_key: string;
  expected_version: number;
}

export interface VoidExpensePaymentPayload {
  reason: string;
  expected_version: number;
}

export interface ExpenseBranchOption {
  id: string;
  name: string;
}

export interface ExpenseVehicleOption {
  id: string;
  plate_number: string;
  branch_id: string;
  make: string;
  model: string;
}

/** Active teachers with a branch — from GET /expenses/teacher-options. */
export interface ExpenseTeacherOption {
  id: string;
  name: string;
  branch_id: string;
}

/** POST /teacher-settlements — never includes branch_id. */
export interface CreateTeacherSettlementPayload {
  teacher_id: string;
  period_month: string;
  title: string;
  amount: string;
  due_date?: string | null;
  payee?: string | null;
  note?: string | null;
  idempotency_key: string;
}

export interface ExpenseMonthCloseCsvFilters {
  month: string;
  branchId?: string;
}

export interface ExpenseListFilters {
  branchId?: string;
  scope?: 'company';
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  attention?: 'overdue';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseTriageCounts {
  pending_total: number;
  due_today: number;
  due_within_three_days: number;
  overdue_1_7: number;
  overdue_8_30: number;
  overdue_31_plus: number;
  created_yesterday: number;
}

export interface ExpenseTriageCountsFilters {
  branchId?: string;
  scope?: 'company';
}

export interface CreateExpensePayload {
  category: Exclude<ExpenseCategory, 'teacher_settlement'>;
  title: string;
  amount: string;
  expense_date: string;
  due_date?: string | null;
  payee?: string | null;
  note?: string | null;
  branch_id?: string | null;
  vehicle_id?: string;
  idempotency_key: string;
}

export interface UpdateExpensePayload {
  category?: Exclude<ExpenseCategory, 'teacher_settlement'>;
  title?: string;
  amount?: string;
  expense_date?: string;
  due_date?: string | null;
  payee?: string | null;
  note?: string | null;
  branch_id?: string | null;
  vehicle_id?: string | null;
  expected_version: number;
}

export interface ExpenseLifecyclePayload {
  reason: string;
  expected_version: number;
}

export type CancelExpensePayload = ExpenseLifecyclePayload;
export type DeleteExpensePayload = ExpenseLifecyclePayload;
