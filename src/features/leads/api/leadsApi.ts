import axiosInstance from '@/api/axiosInstance';
import type {
  Lead,
  LeadCard,
  LeadBoardColumn,
  LeadStage,
  LeadActivity,
  LeadMetrics,
  DuplicateCheckResult,
  LeadSource,
  ListLeadsQuery,
  CreateLeadPayload,
  UpdateLeadPayload,
  LeadStageTransitionPayload,
  AssignLeadPayload,
  ConvertLeadPayload,
  CreateLeadActivityPayload,
  UpdateLeadActivityPayload,
  UpdateLeadStagesPayload,
  CompanyLeadSource,
} from '../types/leads.types';

export interface PaginatedLeadsResponse {
  items: Lead[];
  total: number;
  page: number;
  limit: number;
}

export function unwrapData<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

interface RawLeadAssignee {
  id: string;
  name: string;
  role?: string;
}

interface RawLeadCardItem {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string | null;
  phone: string;
  branchId?: string;
  branchName?: string;
  source: LeadCard['source'];
  category?: LeadCard['category'];
  assignee?: RawLeadAssignee | null;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  stageId?: string;
  nextStepAt?: string | Date | null;
  lastTouchAt?: string | Date | null;
  version?: number;
  createdAt?: string | Date;
  isOverdue?: boolean;
}

interface RawBoardColumn {
  stageId?: string;
  stageName?: string;
  stageColor?: string;
  position?: number;
  kind?: LeadStage['kind'];
  isSystem?: boolean;
  isActive?: boolean;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
  total?: number;
  items?: RawLeadCardItem[];
  stage?: LeadStage;
  leads?: LeadCard[];
  count?: number;
}

interface RawStageCountItem {
  stageId?: string;
  stageName?: string;
  count?: number;
}

interface RawLostReasonCountItem {
  reason?: string;
  count?: number;
}

interface RawLeadMetricsResponse {
  openPerStage?: RawStageCountItem[];
  funnelStages?: RawStageCountItem[];
  leadToStudent?: number;
  overdueCount?: number;
  untouchedCount?: number;
  lostByReason?: RawLostReasonCountItem[];
  totalCreated?: number;
  totalConverted?: number;
  totalLeads?: number;
  wonLeads?: number;
  lostLeads?: number;
  conversionRate?: number;
  avgTimeToWonDays?: number | null;
  bySource?: Record<
    string,
    { count: number; won: number; conversionRate: number }
  >;
  byLostReason?: Record<string, number>;
  byStage?: Record<string, number>;
}

function normalizeLeadSource(source?: LeadSource): LeadSource | undefined {
  if (!source) return undefined;
  if (source === 'website' || source === 'banner') return 'other';
  if (source === 'recommendation') return 'referral';
  return source;
}

type LeadsRequestQuery = {
  q?: ListLeadsQuery['q'];
  branchId?: ListLeadsQuery['branch_id'];
  stageId?: ListLeadsQuery['stage_id'];
  source?: ListLeadsQuery['source'];
  courseType?: ListLeadsQuery['course_type'];
  category?: ListLeadsQuery['category'];
  mine?: ListLeadsQuery['assigned_to_me'];
  assigneeId?: ListLeadsQuery['assignee_user_id'];
  overdueOnly?: ListLeadsQuery['overdue_only'];
  period?: ListLeadsQuery['period'];
  tab?: ListLeadsQuery['tab'];
  page?: ListLeadsQuery['page'];
  limit?: ListLeadsQuery['limit'];
};

function toLeadsRequestQuery(query: ListLeadsQuery): LeadsRequestQuery {
  const params: LeadsRequestQuery = {};
  if (query.q !== undefined) params.q = query.q;
  if (query.branch_id !== undefined) params.branchId = query.branch_id;
  if (query.stage_id !== undefined) params.stageId = query.stage_id;
  if (query.source !== undefined) params.source = query.source;
  if (query.course_type !== undefined) params.courseType = query.course_type;
  if (query.category !== undefined) params.category = query.category;
  if (query.assigned_to_me !== undefined) params.mine = query.assigned_to_me;
  if (query.assignee_user_id !== undefined) {
    params.assigneeId = query.assignee_user_id;
  }
  if (query.overdue_only !== undefined) params.overdueOnly = query.overdue_only;
  if (query.period !== undefined) params.period = query.period;
  if (query.tab !== undefined) params.tab = query.tab;
  if (query.page !== undefined) params.page = query.page;
  if (query.limit !== undefined) params.limit = query.limit;
  return params;
}

export const leadsApi = {
  getLeads: async (
    query: ListLeadsQuery = {},
    signal?: AbortSignal,
  ): Promise<PaginatedLeadsResponse> => {
    const { data } = await axiosInstance.get<unknown>('/leads', {
      params: toLeadsRequestQuery(query),
      signal,
    });
    const unwrapped = unwrapData<unknown>(data);
    if (unwrapped && typeof unwrapped === 'object' && 'items' in unwrapped) {
      const root = unwrapped as Record<string, unknown>;
      return {
        items: Array.isArray(root.items) ? (root.items as Lead[]) : [],
        total: typeof root.total === 'number' ? root.total : 0,
        page: typeof root.page === 'number' ? root.page : 1,
        limit: typeof root.limit === 'number' ? root.limit : 20,
      };
    }
    return { items: [], total: 0, page: 1, limit: 20 };
  },

  getLeadBoard: async (
    query: ListLeadsQuery = {},
    signal?: AbortSignal,
  ): Promise<LeadBoardColumn[]> => {
    const { data } = await axiosInstance.get<unknown>('/leads/board', {
      params: toLeadsRequestQuery(query),
      signal,
    });
    const unwrapped = unwrapData<unknown>(data);
    if (!Array.isArray(unwrapped)) return [];

    const columns = (unwrapped as RawBoardColumn[]).map(
      (col): LeadBoardColumn => {
        // Backwards-compatibility for mock/frontend shaped data
        if (col.stage && Array.isArray(col.leads)) {
          return col as unknown as LeadBoardColumn;
        }

        const stage: LeadStage = {
          id: col.stageId ?? col.stage?.id ?? '',
          companyId: col.companyId ?? col.stage?.companyId ?? '',
          name: col.stageName ?? col.stage?.name ?? '',
          color: col.stageColor ?? col.stage?.color ?? '#3B82F6',
          position: col.position ?? col.stage?.position ?? 0,
          kind: col.kind ?? col.stage?.kind ?? 'WORK',
          isSystem: col.isSystem ?? col.stage?.isSystem ?? false,
          isActive: col.isActive ?? col.stage?.isActive ?? true,
          createdAt: col.createdAt ?? col.stage?.createdAt ?? '',
          updatedAt: col.updatedAt ?? col.stage?.updatedAt ?? '',
        };

        const rawItems: RawLeadCardItem[] = Array.isArray(col.items)
          ? col.items
          : Array.isArray(col.leads)
            ? (col.leads as unknown as RawLeadCardItem[])
            : [];

        const leads: LeadCard[] = rawItems.map((item): LeadCard => {
          const fullName = (item.name || '').trim();
          const firstSpaceIndex = fullName.indexOf(' ');
          const firstName =
            item.firstName ??
            (firstSpaceIndex > 0
              ? fullName.slice(0, firstSpaceIndex)
              : fullName);
          const lastName =
            item.lastName ??
            (firstSpaceIndex > 0 ? fullName.slice(firstSpaceIndex + 1) : null);

          return {
            id: item.id,
            firstName,
            lastName,
            phone: item.phone,
            branchId: item.branchId ?? '',
            branchName: item.branchName,
            source: item.source,
            category: item.category ?? null,
            assigneeUserId: item.assigneeUserId ?? item.assignee?.id ?? null,
            assigneeName: item.assigneeName ?? item.assignee?.name ?? null,
            stageId: item.stageId ?? stage.id,
            nextStepAt: item.nextStepAt ? String(item.nextStepAt) : null,
            lastTouchAt: item.lastTouchAt
              ? String(item.lastTouchAt)
              : item.createdAt
                ? String(item.createdAt)
                : '',
            version: item.version ?? 1,
            createdAt: item.createdAt ? String(item.createdAt) : '',
            isOverdue: Boolean(item.isOverdue),
          };
        });

        return {
          stage,
          leads,
          count: typeof col.total === 'number' ? col.total : leads.length,
        };
      },
    );

    return query.stage_id
      ? columns.filter((col) => col.stage.id === query.stage_id)
      : columns;
  },

  getLead: async (id: string, signal?: AbortSignal): Promise<Lead> => {
    const { data } = await axiosInstance.get<unknown>(`/leads/${id}`, {
      signal,
    });
    return unwrapData<Lead>(data);
  },

  createLead: async (payload: CreateLeadPayload): Promise<Lead> => {
    const body = {
      ...payload,
      source: normalizeLeadSource(payload.source) ?? 'other',
    };
    const { data } = await axiosInstance.post<unknown>('/leads', body);
    return unwrapData<Lead>(data);
  },

  updateLead: async (id: string, payload: UpdateLeadPayload): Promise<Lead> => {
    const body = {
      ...payload,
      ...(payload.source
        ? { source: normalizeLeadSource(payload.source) }
        : {}),
    };
    const { data } = await axiosInstance.patch<unknown>(`/leads/${id}`, body);
    return unwrapData<Lead>(data);
  },

  deleteLead: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/leads/${id}`);
  },

  transitionStage: async (
    id: string,
    payload: LeadStageTransitionPayload,
  ): Promise<Lead> => {
    const { data } = await axiosInstance.patch<unknown>(
      `/leads/${id}/stage`,
      payload,
    );
    return unwrapData<Lead>(data);
  },

  assignLead: async (id: string, payload: AssignLeadPayload): Promise<Lead> => {
    const { data } = await axiosInstance.patch<unknown>(
      `/leads/${id}/assign`,
      payload,
    );
    return unwrapData<Lead>(data);
  },

  convertLead: async (
    id: string,
    payload: ConvertLeadPayload = {},
  ): Promise<{ studentId: string; student: unknown }> => {
    const { data } = await axiosInstance.post<unknown>(
      `/leads/${id}/convert`,
      payload,
    );
    return unwrapData<{ studentId: string; student: unknown }>(data);
  },

  checkDuplicate: async (
    params: { phone: string; branchId: string; excludeLeadId?: string },
    signal?: AbortSignal,
  ): Promise<DuplicateCheckResult> => {
    const { data } = await axiosInstance.get<unknown>(
      '/leads/check-duplicate',
      {
        params: {
          phone: params.phone,
          branchId: params.branchId,
          excludeLeadId: params.excludeLeadId,
        },
        signal,
      },
    );
    const raw = unwrapData<Record<string, unknown>>(data);
    const rawLeads = Array.isArray(raw?.openLeads)
      ? (raw.openLeads as Array<Record<string, unknown>>)
      : [];
    const rawStudents = Array.isArray(raw?.students)
      ? (raw.students as Array<Record<string, unknown>>)
      : [];
    const firstLead = rawLeads[0];
    const firstStudent = rawStudents[0];

    return {
      hasDuplicate: Boolean(
        rawLeads.length > 0 || rawStudents.length > 0 || raw?.hasDuplicate,
      ),
      duplicateLead: firstLead
        ? {
            id: String(firstLead.id ?? ''),
            firstName: String(firstLead.firstName ?? ''),
            lastName: firstLead.lastName ? String(firstLead.lastName) : null,
            stageName: String(firstLead.stageName ?? ''),
            branchName: firstLead.branchName
              ? String(firstLead.branchName)
              : undefined,
          }
        : ((raw?.duplicateLead as DuplicateCheckResult['duplicateLead']) ??
          null),
      duplicateStudent: firstStudent
        ? {
            id: String(firstStudent.id ?? ''),
            firstName: String(
              firstStudent.firstName ?? firstStudent.first_name ?? '',
            ),
            lastName: String(
              firstStudent.lastName ?? firstStudent.last_name ?? '',
            ),
            status: String(firstStudent.status ?? firstStudent.result ?? ''),
            branchName: firstStudent.branchName
              ? String(firstStudent.branchName)
              : undefined,
          }
        : ((raw?.duplicateStudent as DuplicateCheckResult['duplicateStudent']) ??
          null),
    };
  },

  getMetrics: async (
    params: { branchId?: string; period?: string } = {},
    signal?: AbortSignal,
  ): Promise<LeadMetrics> => {
    const { data } = await axiosInstance.get<unknown>('/leads/metrics', {
      params,
      signal,
    });
    const raw = unwrapData<RawLeadMetricsResponse>(data);
    if (!raw || typeof raw !== 'object') {
      return {
        totalLeads: 0,
        wonLeads: 0,
        lostLeads: 0,
        conversionRate: 0,
        avgTimeToWonDays: null,
        bySource: {},
        byLostReason: {},
        byStage: {},
        overdueCount: 0,
        untouchedCount: 0,
        openPerStage: [],
        funnelStages: [],
      };
    }

    // Normalize from backend LeadMetricsResponse
    const byStage: Record<string, number> = {};
    if (raw.byStage && typeof raw.byStage === 'object') {
      Object.assign(byStage, raw.byStage);
    } else if (Array.isArray(raw.openPerStage)) {
      for (const item of raw.openPerStage) {
        if (item?.stageName) {
          byStage[item.stageName] =
            typeof item.count === 'number' ? item.count : 0;
        }
      }
    }

    const byLostReason: Record<string, number> = {};
    let lostSum = 0;
    if (raw.byLostReason && typeof raw.byLostReason === 'object') {
      Object.assign(byLostReason, raw.byLostReason);
      lostSum = Object.values(byLostReason).reduce((a, b) => a + b, 0);
    } else if (Array.isArray(raw.lostByReason)) {
      for (const item of raw.lostByReason) {
        if (item?.reason) {
          const cnt = typeof item.count === 'number' ? item.count : 0;
          byLostReason[item.reason] = cnt;
          lostSum += cnt;
        }
      }
    }

    const bySource =
      raw.bySource && typeof raw.bySource === 'object' ? raw.bySource : {};

    const openPerStage = Array.isArray(raw.openPerStage)
      ? raw.openPerStage.map((s) => ({
          stageId: s.stageId ?? '',
          stageName: s.stageName ?? '',
          count: s.count ?? 0,
        }))
      : [];

    const funnelStages = Array.isArray(raw.funnelStages)
      ? raw.funnelStages.map((s) => ({
          stageId: s.stageId ?? '',
          stageName: s.stageName ?? '',
          count: s.count ?? 0,
        }))
      : [];

    return {
      totalLeads: raw.totalCreated ?? raw.totalLeads ?? 0,
      wonLeads: raw.totalConverted ?? raw.wonLeads ?? 0,
      lostLeads: raw.lostLeads ?? lostSum,
      conversionRate: raw.leadToStudent ?? raw.conversionRate ?? 0,
      avgTimeToWonDays: raw.avgTimeToWonDays ?? null,
      bySource,
      byLostReason,
      byStage,
      overdueCount: raw.overdueCount ?? 0,
      untouchedCount: raw.untouchedCount ?? 0,
      openPerStage,
      funnelStages,
    };
  },

  getStages: async (signal?: AbortSignal): Promise<LeadStage[]> => {
    const { data } = await axiosInstance.get<unknown>('/lead-stages', {
      signal,
    });
    const unwrapped = unwrapData<unknown>(data);
    return Array.isArray(unwrapped) ? (unwrapped as LeadStage[]) : [];
  },

  updateStages: async (
    payload: UpdateLeadStagesPayload,
  ): Promise<LeadStage[]> => {
    const { data } = await axiosInstance.put<unknown>('/lead-stages', payload);
    const unwrapped = unwrapData<unknown>(data);
    return Array.isArray(unwrapped) ? (unwrapped as LeadStage[]) : [];
  },

  getActivities: async (
    leadId: string,
    signal?: AbortSignal,
  ): Promise<LeadActivity[]> => {
    const { data } = await axiosInstance.get<unknown>(
      `/leads/${leadId}/activities`,
      { signal },
    );
    const unwrapped = unwrapData<unknown>(data);
    return Array.isArray(unwrapped) ? (unwrapped as LeadActivity[]) : [];
  },

  createActivity: async (
    leadId: string,
    payload: CreateLeadActivityPayload,
  ): Promise<LeadActivity> => {
    const { data } = await axiosInstance.post<unknown>(
      `/leads/${leadId}/activities`,
      payload,
    );
    return unwrapData<LeadActivity>(data);
  },

  updateActivity: async (
    leadId: string,
    activityId: string,
    payload: UpdateLeadActivityPayload,
  ): Promise<LeadActivity> => {
    const { data } = await axiosInstance.patch<unknown>(
      `/leads/${leadId}/activities/${activityId}`,
      payload,
    );
    return unwrapData<LeadActivity>(data);
  },

  deleteActivity: async (leadId: string, activityId: string): Promise<void> => {
    await axiosInstance.delete(`/leads/${leadId}/activities/${activityId}`);
  },

  getLeadSources: async (
    signal?: AbortSignal,
  ): Promise<CompanyLeadSource[]> => {
    const { data } = await axiosInstance.get<unknown>('/lead-sources', {
      signal,
    });
    const unwrapped = unwrapData<unknown>(data);
    return Array.isArray(unwrapped) ? (unwrapped as CompanyLeadSource[]) : [];
  },

  createLeadSource: async (name: string): Promise<CompanyLeadSource> => {
    const { data } = await axiosInstance.post<unknown>('/lead-sources', {
      name,
    });
    return unwrapData<CompanyLeadSource>(data);
  },

  deleteLeadSource: async (id: string): Promise<{ success: boolean }> => {
    const { data } = await axiosInstance.delete<unknown>(`/lead-sources/${id}`);
    return unwrapData<{ success: boolean }>(data);
  },

  exportLeads: async (query: ListLeadsQuery = {}): Promise<void> => {
    const response = await axiosInstance.get<Blob>('/leads/export.xlsx', {
      params: toLeadsRequestQuery(query),
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `leads-export-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
