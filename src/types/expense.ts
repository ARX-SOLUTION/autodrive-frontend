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
  created_by_id: string;
  category: ExpenseCategory;
  title: string;
  amount: string;
  expense_date: string;
  due_date: string | null;
  payee: string | null;
  note: string | null;
  paid_amount: string;
  remaining_amount: string;
  status: ExpenseStatus;
  version: number;
  created_at: string;
  updated_at: string;
  has_payment_history?: boolean;
}

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

export interface ExpenseBranchOption {
  id: string;
  name: string;
}

export interface ExpenseListFilters {
  branchId?: string;
  scope?: 'company';
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
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
  expected_version: number;
}

export interface ExpenseLifecyclePayload {
  reason: string;
  expected_version: number;
}

export type CancelExpensePayload = ExpenseLifecyclePayload;
export type DeleteExpensePayload = ExpenseLifecyclePayload;
