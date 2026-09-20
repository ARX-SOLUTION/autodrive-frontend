import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { parseItemEnvelope, parseListEnvelope } from '@/lib/apiEnvelope';
import {
  drivingSessionKeys,
  teacherKeys,
  trainingEnrollmentKeys,
} from '@/lib/queryKeys';
import type { ListResponse } from '@/types/list';
import type { User } from '@/types/user';
import type {
  ApproveDrivingSessionRequest,
  CorrectDrivingSessionRequest,
  CreateDrivingSessionRequest,
  DrivingSession,
  DrivingSessionFilters,
  DrivingSummary,
  ReasonRequest,
  SubmitDrivingSessionRequest,
} from '@/types/drivingSession';

export const fetchPracticeInstructors = async (
  branchId: string,
  signal?: AbortSignal,
): Promise<User[]> => {
  const instructors: User[] = [];
  let page = 1;
  for (;;) {
    const { data } = await axiosInstance.get<unknown>('/users', {
      params: { role: 'teacher', branchId, isActive: true, page, limit: 100 },
      signal,
    });
    const result = parseListEnvelope<User>(data, 'practice instructors');
    instructors.push(
      ...result.data.filter((user) => user.specialization === 'PRACTICE'),
    );
    if (!result.meta.hasNextPage) return instructors;
    page += 1;
  }
};

export const usePracticeInstructors = (branchId: string, enabled = true) =>
  useQuery({
    queryKey: teacherKeys.list({ branchId, practiceOnly: true }),
    queryFn: ({ signal }) => fetchPracticeInstructors(branchId, signal),
    enabled: enabled && !!branchId,
    staleTime: 5 * 60_000,
  });

export const fetchDrivingSessionsPage = async (
  filters: DrivingSessionFilters = {},
  signal?: AbortSignal,
): Promise<ListResponse<DrivingSession>> => {
  const { data } = await axiosInstance.get<unknown>('/driving-sessions', {
    params: {
      branch_id: filters.branchId,
      enrollment_id: filters.enrollmentId,
      student_id: filters.studentId,
      vehicle_id: filters.vehicleId,
      instructor_id: filters.instructorId,
      status: filters.status,
      from: filters.from,
      to: filters.to,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    },
    signal,
  });
  return parseListEnvelope<DrivingSession>(data, 'driving sessions');
};

export const drivingSessionsPageQueryOptions = (
  filters: DrivingSessionFilters = {},
) =>
  queryOptions({
    queryKey: drivingSessionKeys.page({ ...filters }),
    queryFn: ({ signal }) => fetchDrivingSessionsPage(filters, signal),
    staleTime: 15_000,
  });

export const useDrivingSessionsPage = (filters: DrivingSessionFilters = {}) =>
  useQuery(drivingSessionsPageQueryOptions(filters));

export const fetchDrivingSessionsForReport = async (
  enrollmentId: string,
  signal?: AbortSignal,
): Promise<DrivingSession[]> => {
  const sessions: DrivingSession[] = [];
  let page = 1;
  for (;;) {
    const result = await fetchDrivingSessionsPage(
      { enrollmentId, page, limit: 100 },
      signal,
    );
    sessions.push(...result.data);
    if (!result.meta.hasNextPage) return sessions;
    page += 1;
  }
};

export const useDrivingSessionsForReport = (enrollmentId: string) =>
  useQuery({
    queryKey: drivingSessionKeys.report(enrollmentId),
    queryFn: ({ signal }) =>
      fetchDrivingSessionsForReport(enrollmentId, signal),
    enabled: !!enrollmentId,
  });

export const fetchDrivingSession = async (
  id: string,
  signal?: AbortSignal,
): Promise<DrivingSession> => {
  const { data } = await axiosInstance.get<unknown>(`/driving-sessions/${id}`, {
    signal,
  });
  return parseItemEnvelope<DrivingSession>(data, 'driving session');
};

export const drivingSessionQueryOptions = (id: string) =>
  queryOptions({
    queryKey: drivingSessionKeys.detail(id),
    queryFn: ({ signal }) => fetchDrivingSession(id, signal),
  });

export const useDrivingSession = (id: string) =>
  useQuery({ ...drivingSessionQueryOptions(id), enabled: !!id });

export const fetchDrivingSummary = async (
  enrollmentId: string,
  signal?: AbortSignal,
): Promise<DrivingSummary> => {
  const { data } = await axiosInstance.get<unknown>(
    '/driving-sessions/summary',
    {
      params: { enrollment_id: enrollmentId },
      signal,
    },
  );
  return parseItemEnvelope<DrivingSummary>(data, 'driving summary');
};

export const drivingSummaryQueryOptions = (enrollmentId: string) =>
  queryOptions({
    queryKey: drivingSessionKeys.summary(enrollmentId),
    queryFn: ({ signal }) => fetchDrivingSummary(enrollmentId, signal),
  });

export const useDrivingSummary = (enrollmentId: string) =>
  useQuery({
    ...drivingSummaryQueryOptions(enrollmentId),
    enabled: !!enrollmentId,
  });

export const createDrivingSession = async (
  request: CreateDrivingSessionRequest,
): Promise<DrivingSession> => {
  const { data } = await axiosInstance.post<unknown>(
    '/driving-sessions',
    request,
  );
  return parseItemEnvelope<DrivingSession>(data, 'driving session');
};

const postDecision = async <T>(
  id: string,
  action: string,
  request: T,
): Promise<DrivingSession> => {
  const { data } = await axiosInstance.post<unknown>(
    `/driving-sessions/${id}/${action}`,
    request,
  );
  return parseItemEnvelope<DrivingSession>(data, 'driving session');
};

export const submitDrivingSession = (
  id: string,
  request: SubmitDrivingSessionRequest,
) => postDecision(id, 'submit', request);
export const approveDrivingSession = (
  id: string,
  request: ApproveDrivingSessionRequest,
) => postDecision(id, 'approve', request);
export const rejectDrivingSession = (id: string, request: ReasonRequest) =>
  postDecision(id, 'reject', request);
export const cancelDrivingSession = (id: string, request: ReasonRequest) =>
  postDecision(id, 'cancel', request);
export const correctDrivingSession = (
  id: string,
  request: CorrectDrivingSessionRequest,
) => postDecision(id, 'correct', request);

const useSessionMutation = <T>(
  mutationFn: (request: T) => Promise<DrivingSession>,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: drivingSessionKeys.all });
      qc.invalidateQueries({ queryKey: trainingEnrollmentKeys.all });
    },
  });
};

export const useCreateDrivingSession = () =>
  useSessionMutation(createDrivingSession);
export const useSubmitDrivingSession = () =>
  useSessionMutation(
    ({ id, ...request }: SubmitDrivingSessionRequest & { id: string }) =>
      submitDrivingSession(id, request),
  );
export const useApproveDrivingSession = () =>
  useSessionMutation(
    ({ id, ...request }: ApproveDrivingSessionRequest & { id: string }) =>
      approveDrivingSession(id, request),
  );
export const useRejectDrivingSession = () =>
  useSessionMutation(({ id, ...request }: ReasonRequest & { id: string }) =>
    rejectDrivingSession(id, request),
  );
export const useCancelDrivingSession = () =>
  useSessionMutation(({ id, ...request }: ReasonRequest & { id: string }) =>
    cancelDrivingSession(id, request),
  );
export const useCorrectDrivingSession = () =>
  useSessionMutation(
    ({ id, ...request }: CorrectDrivingSessionRequest & { id: string }) =>
      correctDrivingSession(id, request),
  );
