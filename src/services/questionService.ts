import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { parseItemEnvelope, parseListEnvelope } from '@/lib/apiEnvelope';
import { questionKeys } from '@/lib/queryKeys';
import type { ListResponse } from '@/types/list';
import type {
  CreateQuestionPayload,
  Question,
  QuestionListFilters,
  QuestionMedia,
  UpdateQuestionDraftPayload,
  UploadQuestionMediaPayload,
} from '@/types/question';

export const fetchQuestionsPage = async (
  filters: QuestionListFilters = {},
  signal?: AbortSignal,
): Promise<ListResponse<Question>> => {
  const { data } = await axiosInstance.get<unknown>('/questions', {
    params: {
      visibility: filters.visibility,
      status: filters.status,
      topic: filters.topic,
      branch_id: filters.branchId,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    },
    signal,
  });
  return parseListEnvelope<Question>(data, 'questions');
};

export const questionsPageQueryOptions = (filters: QuestionListFilters = {}) =>
  queryOptions({
    queryKey: questionKeys.page({ ...filters }),
    queryFn: ({ signal }) => fetchQuestionsPage(filters, signal),
    staleTime: 30_000,
  });

export const useQuestionsPage = (filters: QuestionListFilters = {}) =>
  useQuery(questionsPageQueryOptions(filters));

export const fetchQuestion = async (
  id: string,
  signal?: AbortSignal,
): Promise<Question> => {
  const { data } = await axiosInstance.get<unknown>(`/questions/${id}`, {
    signal,
  });
  return parseItemEnvelope<Question>(data, 'question');
};

export const questionQueryOptions = (id: string) =>
  queryOptions({
    queryKey: questionKeys.detail(id),
    queryFn: ({ signal }) => fetchQuestion(id, signal),
    staleTime: 30_000,
  });

export const useQuestion = (id: string) =>
  useQuery({ ...questionQueryOptions(id), enabled: !!id });

export const fetchQuestionsAvailableForTests = async (
  filters: { topic?: string; page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<ListResponse<Question>> => {
  const { data } = await axiosInstance.get<unknown>(
    '/questions/available-for-tests',
    {
      params: {
        topic: filters.topic,
        page: filters.page ?? 1,
        limit: filters.limit ?? 50,
      },
      signal,
    },
  );
  return parseListEnvelope<Question>(data, 'available questions');
};

export const useQuestionsAvailableForTests = (
  filters: { topic?: string; page?: number; limit?: number } = {},
  enabled = true,
) =>
  useQuery({
    queryKey: questionKeys.availableForTests({ ...filters }),
    queryFn: ({ signal }) => fetchQuestionsAvailableForTests(filters, signal),
    enabled,
    staleTime: 30_000,
  });

export const useCreateQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateQuestionPayload) => {
      const { data } = await axiosInstance.post<unknown>('/questions', payload);
      return parseItemEnvelope<Question>(data, 'question');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: questionKeys.all });
    },
  });
};

export const useUpdateQuestionDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: UpdateQuestionDraftPayload & { id: string }) => {
      const { data } = await axiosInstance.patch<unknown>(
        `/questions/${id}`,
        payload,
      );
      return parseItemEnvelope<Question>(data, 'question');
    },
    onSuccess: (question) => {
      qc.invalidateQueries({ queryKey: questionKeys.all });
      qc.setQueryData(questionKeys.detail(question.id), question);
    },
  });
};

export const usePublishQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // School-private publish: empty body (no reviewer_id).
      const { data } = await axiosInstance.post<unknown>(
        `/questions/${id}/publish`,
        {},
      );
      return parseItemEnvelope<Question>(data, 'question');
    },
    onSuccess: (question) => {
      qc.invalidateQueries({ queryKey: questionKeys.all });
      qc.setQueryData(questionKeys.detail(question.id), question);
    },
  });
};

export const useRetireQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<unknown>(
        `/questions/${id}/retire`,
        {},
      );
      return parseItemEnvelope<Question>(data, 'question');
    },
    onSuccess: (question) => {
      qc.invalidateQueries({ queryKey: questionKeys.all });
      qc.setQueryData(questionKeys.detail(question.id), question);
    },
  });
};

export const useUploadQuestionMedia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: UploadQuestionMediaPayload & { id: string }) => {
      const form = new FormData();
      form.append('file', payload.file);
      form.append('alt_text', payload.alt_text);
      form.append('rights_basis', payload.rights_basis);
      form.append('rights_holder', payload.rights_holder);
      form.append('rights_confirmed', String(payload.rights_confirmed));
      const { data } = await axiosInstance.post<unknown>(
        `/questions/${id}/media`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return parseItemEnvelope<QuestionMedia>(data, 'question media');
    },
    onSuccess: (_media, variables) => {
      qc.invalidateQueries({ queryKey: questionKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: questionKeys.all });
    },
  });
};

/** Authenticated diagram URL for staff preview (blob stream endpoint). */
export const questionMediaUrl = (questionId: string, mediaId: string) =>
  `/questions/${questionId}/media/${mediaId}`;
