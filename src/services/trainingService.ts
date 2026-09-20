import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { parseItemEnvelope, parseListEnvelope } from '@/lib/apiEnvelope';
import { trainingEnrollmentKeys, trainingProgramKeys } from '@/lib/queryKeys';
import type { ListResponse } from '@/types/list';
import type {
  CreateTrainingEnrollmentRequest,
  CreateTrainingProgramRequest,
  TrainingEnrollment,
  TrainingEnrollmentFilters,
  TrainingProgram,
  TrainingProgramFilters,
  UpdateTrainingProgramRequest,
} from '@/types/training';

export const fetchTrainingProgramsPage = async (
  filters: TrainingProgramFilters = {},
  signal?: AbortSignal,
): Promise<ListResponse<TrainingProgram>> => {
  const { data } = await axiosInstance.get<unknown>('/training-programs', {
    params: {
      branch_id: filters.branchId,
      category: filters.category,
      is_active: filters.active,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    },
    signal,
  });
  return parseListEnvelope<TrainingProgram>(data, 'training programs');
};

export const trainingProgramsPageQueryOptions = (
  filters: TrainingProgramFilters = {},
) =>
  queryOptions({
    queryKey: trainingProgramKeys.page({ ...filters }),
    queryFn: ({ signal }) => fetchTrainingProgramsPage(filters, signal),
    staleTime: 30_000,
  });

export const useTrainingProgramsPage = (filters: TrainingProgramFilters = {}) =>
  useQuery(trainingProgramsPageQueryOptions(filters));

export const fetchActiveTrainingPrograms = async (
  branchId: string,
  signal?: AbortSignal,
): Promise<TrainingProgram[]> => {
  const programs: TrainingProgram[] = [];
  let page = 1;
  for (;;) {
    const result = await fetchTrainingProgramsPage(
      { branchId, active: true, page, limit: 100 },
      signal,
    );
    programs.push(...result.data);
    if (!result.meta.hasNextPage) return programs;
    page += 1;
  }
};

export const useActiveTrainingPrograms = (branchId: string, enabled = true) =>
  useQuery({
    queryKey: trainingProgramKeys.list({ branchId, active: true }),
    queryFn: ({ signal }) => fetchActiveTrainingPrograms(branchId, signal),
    enabled: enabled && !!branchId,
    staleTime: 30_000,
  });

export const fetchTrainingProgram = async (
  id: string,
  signal?: AbortSignal,
): Promise<TrainingProgram> => {
  const { data } = await axiosInstance.get<unknown>(
    `/training-programs/${id}`,
    { signal },
  );
  return parseItemEnvelope<TrainingProgram>(data, 'training program');
};

export const trainingProgramQueryOptions = (id: string) =>
  queryOptions({
    queryKey: trainingProgramKeys.detail(id),
    queryFn: ({ signal }) => fetchTrainingProgram(id, signal),
    staleTime: 5 * 60_000,
  });

export const useTrainingProgram = (id: string) =>
  useQuery({ ...trainingProgramQueryOptions(id), enabled: !!id });

export const createTrainingProgram = async (
  request: CreateTrainingProgramRequest,
): Promise<TrainingProgram> => {
  const { data } = await axiosInstance.post<unknown>(
    '/training-programs',
    request,
  );
  return parseItemEnvelope<TrainingProgram>(data, 'training program');
};

export const updateTrainingProgram = async (
  id: string,
  request: UpdateTrainingProgramRequest,
): Promise<TrainingProgram> => {
  const { data } = await axiosInstance.patch<unknown>(
    `/training-programs/${id}`,
    request,
  );
  return parseItemEnvelope<TrainingProgram>(data, 'training program');
};

export const useCreateTrainingProgram = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTrainingProgram,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: trainingProgramKeys.all }),
  });
};

export const useUpdateTrainingProgram = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...request
    }: UpdateTrainingProgramRequest & { id: string }) =>
      updateTrainingProgram(id, request),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: trainingProgramKeys.all }),
  });
};

export const fetchTrainingEnrollmentsPage = async (
  filters: TrainingEnrollmentFilters = {},
  signal?: AbortSignal,
): Promise<ListResponse<TrainingEnrollment>> => {
  const { data } = await axiosInstance.get<unknown>('/training-enrollments', {
    params: {
      branch_id: filters.branchId,
      student_id: filters.studentId,
      status: filters.status,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    },
    signal,
  });
  return parseListEnvelope<TrainingEnrollment>(data, 'training enrollments');
};

export const trainingEnrollmentsPageQueryOptions = (
  filters: TrainingEnrollmentFilters = {},
) =>
  queryOptions({
    queryKey: trainingEnrollmentKeys.page({ ...filters }),
    queryFn: ({ signal }) => fetchTrainingEnrollmentsPage(filters, signal),
    staleTime: 30_000,
  });

export const useTrainingEnrollmentsPage = (
  filters: TrainingEnrollmentFilters = {},
) => useQuery(trainingEnrollmentsPageQueryOptions(filters));

export const fetchTrainingEnrollment = async (
  id: string,
  signal?: AbortSignal,
): Promise<TrainingEnrollment> => {
  const { data } = await axiosInstance.get<unknown>(
    `/training-enrollments/${id}`,
    { signal },
  );
  return parseItemEnvelope<TrainingEnrollment>(data, 'training enrollment');
};

export const trainingEnrollmentQueryOptions = (id: string) =>
  queryOptions({
    queryKey: trainingEnrollmentKeys.detail(id),
    queryFn: ({ signal }) => fetchTrainingEnrollment(id, signal),
  });

export const useTrainingEnrollment = (id: string) =>
  useQuery({ ...trainingEnrollmentQueryOptions(id), enabled: !!id });

export const createTrainingEnrollment = async (
  request: CreateTrainingEnrollmentRequest,
): Promise<TrainingEnrollment> => {
  const { data } = await axiosInstance.post<unknown>(
    '/training-enrollments',
    request,
  );
  return parseItemEnvelope<TrainingEnrollment>(data, 'training enrollment');
};

export const useCreateTrainingEnrollment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTrainingEnrollment,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: trainingEnrollmentKeys.all }),
  });
};
