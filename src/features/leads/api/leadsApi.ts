import axiosInstance from '@/api/axiosInstance';
import type {
  Lead,
  LeadBoardColumn,
  LeadStage,
  LeadActivity,
  LeadMetrics,
  DuplicateCheckResult,
  ListLeadsQuery,
  CreateLeadPayload,
  UpdateLeadPayload,
  LeadStageTransitionPayload,
  AssignLeadPayload,
  ConvertLeadPayload,
  CreateLeadActivityPayload,
  UpdateLeadActivityPayload,
  UpdateLeadStagesPayload,
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

export const leadsApi = {
  getLeads: async (
    query: ListLeadsQuery = {},
    signal?: AbortSignal,
  ): Promise<PaginatedLeadsResponse> => {
    const { data } = await axiosInstance.get<unknown>('/leads', {
      params: query,
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
      params: query,
      signal,
    });
    const unwrapped = unwrapData<unknown>(data);
    return Array.isArray(unwrapped) ? (unwrapped as LeadBoardColumn[]) : [];
  },

  getLead: async (id: string, signal?: AbortSignal): Promise<Lead> => {
    const { data } = await axiosInstance.get<unknown>(`/leads/${id}`, {
      signal,
    });
    return unwrapData<Lead>(data);
  },

  createLead: async (payload: CreateLeadPayload): Promise<Lead> => {
    const { data } = await axiosInstance.post<unknown>('/leads', payload);
    return unwrapData<Lead>(data);
  },

  updateLead: async (id: string, payload: UpdateLeadPayload): Promise<Lead> => {
    const { data } = await axiosInstance.patch<unknown>(
      `/leads/${id}`,
      payload,
    );
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
    return unwrapData<DuplicateCheckResult>(data);
  },

  getMetrics: async (
    params: { branchId?: string; period?: string } = {},
    signal?: AbortSignal,
  ): Promise<LeadMetrics> => {
    const { data } = await axiosInstance.get<unknown>('/leads/metrics', {
      params,
      signal,
    });
    return unwrapData<LeadMetrics>(data);
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

  exportLeads: async (query: ListLeadsQuery = {}): Promise<void> => {
    const response = await axiosInstance.get<Blob>('/leads/export', {
      params: query,
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
