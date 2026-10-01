import {
  useMutation,
  useQueryClient,
  queryOptions,
} from '@tanstack/react-query';
import { usePermissionQuery as useQuery } from '@/hooks/usePermissionQuery';
import { leadKeys, studentKeys } from '@/lib/queryKeys';
import { leadsApi } from '../api/leadsApi';
import type {
  ListLeadsQuery,
  CreateLeadPayload,
  UpdateLeadPayload,
  LeadStageTransitionPayload,
  AssignLeadPayload,
  ConvertLeadPayload,
  CreateLeadActivityPayload,
  UpdateLeadActivityPayload,
  UpdateLeadStagesPayload,
  LeadBoardColumn,
} from '../types/leads.types';

export const leadsListQueryOptions = (
  query: ListLeadsQuery = {},
  enabled = true,
) =>
  queryOptions({
    queryKey: leadKeys.list(query as Record<string, unknown>),
    queryFn: ({ signal }) => leadsApi.getLeads(query, signal),
    enabled,
    staleTime: 30_000,
  });

export const useLeadsQuery = (
  query: ListLeadsQuery = {},
  options?: { enabled?: boolean },
) => useQuery(leadsListQueryOptions(query, options?.enabled ?? true));

export const leadBoardQueryOptions = (
  query: ListLeadsQuery = {},
  enabled = true,
) =>
  queryOptions({
    queryKey: leadKeys.board(query as Record<string, unknown>),
    queryFn: ({ signal }) => leadsApi.getLeadBoard(query, signal),
    enabled,
    staleTime: 30_000,
  });

export const useLeadBoardQuery = (
  query: ListLeadsQuery = {},
  options?: { enabled?: boolean },
) => useQuery(leadBoardQueryOptions(query, options?.enabled ?? true));

export const leadDetailQueryOptions = (id?: string, enabled = !!id) =>
  queryOptions({
    queryKey: leadKeys.detail(id),
    queryFn: ({ signal }) =>
      id ? leadsApi.getLead(id, signal) : Promise.reject('No ID'),
    enabled: enabled && !!id,
    staleTime: 30_000,
  });

export const useLeadDetailQuery = (
  id?: string,
  options?: { enabled?: boolean },
) => useQuery(leadDetailQueryOptions(id, options?.enabled));

export const leadStagesQueryOptions = (enabled = true) =>
  queryOptions({
    queryKey: leadKeys.stages(),
    queryFn: ({ signal }) => leadsApi.getStages(signal),
    enabled,
    staleTime: 5 * 60_000,
  });

export const useLeadStagesQuery = (options?: { enabled?: boolean }) =>
  useQuery(leadStagesQueryOptions(options?.enabled ?? true));

export const leadActivitiesQueryOptions = (
  leadId?: string,
  enabled = !!leadId,
) =>
  queryOptions({
    queryKey: leadKeys.activities(leadId ?? ''),
    queryFn: ({ signal }) =>
      leadId ? leadsApi.getActivities(leadId, signal) : Promise.resolve([]),
    enabled: enabled && !!leadId,
    staleTime: 10_000,
  });

export const useLeadActivitiesQuery = (
  leadId?: string,
  options?: { enabled?: boolean },
) => useQuery(leadActivitiesQueryOptions(leadId, options?.enabled));

export const leadMetricsQueryOptions = (
  params: { branchId?: string; period?: string } = {},
  enabled = true,
) =>
  queryOptions({
    queryKey: leadKeys.metrics(params as Record<string, unknown>),
    queryFn: ({ signal }) => leadsApi.getMetrics(params, signal),
    enabled,
    staleTime: 60_000,
  });

export const useLeadMetricsQuery = (
  params: { branchId?: string; period?: string } = {},
  options?: { enabled?: boolean },
) => useQuery(leadMetricsQueryOptions(params, options?.enabled ?? true));

// Mutations

export const useCreateLeadMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeadPayload) => leadsApi.createLead(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
};

export const useUpdateLeadMutation = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateLeadPayload) =>
      leadsApi.updateLead(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(leadKeys.detail(id), updated);
      void qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
};

export const useDeleteLeadMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsApi.deleteLead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
};

export const useStageTransitionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: LeadStageTransitionPayload;
    }) => leadsApi.transitionStage(id, payload),
    onMutate: async ({ id, payload }) => {
      // Snapshot board queries for optimistic rollback
      await qc.cancelQueries({ queryKey: leadKeys.all });
      const previousBoard = qc.getQueriesData<LeadBoardColumn[]>({
        queryKey: ['leads', 'board'],
      });

      // Optimistic update on any active board query
      qc.setQueriesData<LeadBoardColumn[]>(
        { queryKey: ['leads', 'board'] },
        (old) => {
          if (!old) return old;
          let movedCard: LeadBoardColumn['leads'][number] | undefined;
          const next = old.map((col) => {
            const found = col.leads.find((l) => l.id === id);
            if (found) {
              movedCard = {
                ...found,
                stageId: payload.stageId,
                version: payload.version,
              };
              return {
                ...col,
                leads: col.leads.filter((l) => l.id !== id),
                count: Math.max(0, col.count - 1),
              };
            }
            return col;
          });

          if (movedCard) {
            return next.map((col) => {
              if (col.stage.id === payload.stageId) {
                return {
                  ...col,
                  leads: [movedCard!, ...col.leads],
                  count: col.count + 1,
                };
              }
              return col;
            });
          }
          return next;
        },
      );

      return { previousBoard };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousBoard) {
        for (const [key, data] of context.previousBoard) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
};

export const useAssignLeadMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssignLeadPayload }) =>
      leadsApi.assignLead(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(leadKeys.detail(updated.id), updated);
      void qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
};

export const useConvertLeadMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload?: ConvertLeadPayload;
    }) => leadsApi.convertLead(id, payload),
    onSuccess: (_res, { id }) => {
      void qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: leadKeys.all });
      void qc.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
};

export const useCreateActivityMutation = (leadId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeadActivityPayload) =>
      leadsApi.createActivity(leadId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadKeys.activities(leadId) });
      void qc.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
      void qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
};

export const useUpdateActivityMutation = (leadId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      activityId,
      payload,
    }: {
      activityId: string;
      payload: UpdateLeadActivityPayload;
    }) => leadsApi.updateActivity(leadId, activityId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadKeys.activities(leadId) });
      void qc.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
      void qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
};

export const useDeleteActivityMutation = (leadId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (activityId: string) =>
      leadsApi.deleteActivity(leadId, activityId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadKeys.activities(leadId) });
      void qc.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
      void qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
};

export const useUpdateLeadStagesMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateLeadStagesPayload) =>
      leadsApi.updateStages(payload),
    onSuccess: (stages) => {
      qc.setQueryData(leadKeys.stages(), stages);
      void qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
};

export const leadSourcesQueryOptions = (enabled = true) =>
  queryOptions({
    queryKey: leadKeys.sources(),
    queryFn: ({ signal }) => leadsApi.getLeadSources(signal),
    enabled,
    staleTime: 5 * 60_000,
  });

export const useLeadSourcesQuery = (options?: { enabled?: boolean }) =>
  useQuery(leadSourcesQueryOptions(options?.enabled ?? true));

export const useCreateLeadSourceMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => leadsApi.createLeadSource(name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadKeys.sources() });
    },
  });
};

export const useDeleteLeadSourceMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsApi.deleteLeadSource(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadKeys.sources() });
    },
  });
};
