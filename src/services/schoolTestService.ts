import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { parseItemEnvelope, parseListEnvelope } from '@/lib/apiEnvelope';
import { schoolTestKeys } from '@/lib/queryKeys';
import type { ListResponse } from '@/types/list';
import type {
  AssignTestPayload,
  CreateTestTemplatePayload,
  TestAssignment,
  TestTemplate,
  TestTemplateListFilters,
  UpdateTestTemplatePayload,
} from '@/types/schoolTest';

export const fetchTestTemplatesPage = async (
  filters: TestTemplateListFilters = {},
  signal?: AbortSignal,
): Promise<ListResponse<TestTemplate>> => {
  const { data } = await axiosInstance.get<unknown>('/tests/templates', {
    params: {
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    },
    signal,
  });
  return parseListEnvelope<TestTemplate>(data, 'test templates');
};

export const testTemplatesPageQueryOptions = (
  filters: TestTemplateListFilters = {},
) =>
  queryOptions({
    queryKey: schoolTestKeys.page({ ...filters }),
    queryFn: ({ signal }) => fetchTestTemplatesPage(filters, signal),
    staleTime: 30_000,
  });

export const useTestTemplatesPage = (filters: TestTemplateListFilters = {}) =>
  useQuery(testTemplatesPageQueryOptions(filters));

export const fetchTestTemplate = async (
  id: string,
  signal?: AbortSignal,
): Promise<TestTemplate> => {
  const { data } = await axiosInstance.get<unknown>(`/tests/templates/${id}`, {
    signal,
  });
  return parseItemEnvelope<TestTemplate>(data, 'test template');
};

export const testTemplateQueryOptions = (id: string) =>
  queryOptions({
    queryKey: schoolTestKeys.detail(id),
    queryFn: ({ signal }) => fetchTestTemplate(id, signal),
    staleTime: 30_000,
  });

export const useTestTemplate = (id: string) =>
  useQuery({ ...testTemplateQueryOptions(id), enabled: !!id });

export const fetchTemplateAssignments = async (
  templateId: string,
  signal?: AbortSignal,
): Promise<TestAssignment[]> => {
  const { data } = await axiosInstance.get<unknown>(
    `/tests/templates/${templateId}/assignments`,
    { signal },
  );
  // Backend returns a bare array (wrapped as { data: [...] }).
  const parsed = parseListEnvelope<TestAssignment>(data, 'test assignments');
  return parsed.data;
};

export const useTemplateAssignments = (templateId: string) =>
  useQuery({
    queryKey: schoolTestKeys.assignments(templateId),
    queryFn: ({ signal }) => fetchTemplateAssignments(templateId, signal),
    enabled: !!templateId,
    staleTime: 30_000,
  });

export const useCreateTestTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTestTemplatePayload) => {
      const { data } = await axiosInstance.post<unknown>(
        '/tests/templates',
        payload,
      );
      return parseItemEnvelope<TestTemplate>(data, 'test template');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolTestKeys.all });
    },
  });
};

export const useUpdateTestTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: UpdateTestTemplatePayload & { id: string }) => {
      const { data } = await axiosInstance.patch<unknown>(
        `/tests/templates/${id}`,
        payload,
      );
      return parseItemEnvelope<TestTemplate>(data, 'test template');
    },
    onSuccess: (template) => {
      qc.invalidateQueries({ queryKey: schoolTestKeys.all });
      qc.setQueryData(schoolTestKeys.detail(template.id), template);
    },
  });
};

export const usePublishTestTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<unknown>(
        `/tests/templates/${id}/publish`,
        {},
      );
      return parseItemEnvelope<TestTemplate>(data, 'test template');
    },
    onSuccess: (template) => {
      qc.invalidateQueries({ queryKey: schoolTestKeys.all });
      qc.setQueryData(schoolTestKeys.detail(template.id), template);
    },
  });
};

export const useAssignTestTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: AssignTestPayload & { id: string }) => {
      const { data } = await axiosInstance.post<unknown>(
        `/tests/templates/${id}/assignments`,
        payload,
      );
      return parseItemEnvelope<TestAssignment>(data, 'test assignment');
    },
    onSuccess: (_assignment, variables) => {
      qc.invalidateQueries({
        queryKey: schoolTestKeys.assignments(variables.id),
      });
    },
  });
};
