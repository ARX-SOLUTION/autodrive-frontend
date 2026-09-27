export interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entity_id: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  branch_id: string | null;
  company_id: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
