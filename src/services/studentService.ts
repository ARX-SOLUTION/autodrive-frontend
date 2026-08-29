import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useIsCrossTenant } from '@/hooks/useCan';
import { Student, CourseType, StudentStatus } from '@/types/student';
import type { CreateStudentPayload } from '@/components/ui/StudentModal';
import { track } from '@/lib/umami';
import type { ListResponse } from '@/types/list';
import { parseListResponse } from '@/lib/listResponse';
import { parseItemEnvelope } from '@/lib/apiEnvelope';
import type { AddStudentPayload } from '@/components/ui/AddStudentDialog';
import {
  studentKeys,
  paymentKeys,
  dashboardKeys,
  groupKeys,
} from '@/lib/queryKeys';
import type {
  CreateStudentRequest,
  StudentsQuery,
  UpdateStudentRequest,
} from '@/shared/api/contract';

export const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const toStudentSortBy = (value?: string): StudentsQuery['sort_by'] =>
  value === 'first_name' ||
  value === 'last_name' ||
  value === 'total_price' ||
  value === 'debt' ||
  value === 'created_at'
    ? value
    : undefined;

export interface StudentListOptions {
  enabled?: boolean;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  hasDebt?: boolean;
  hasGroup?: boolean;
  status?: StudentStatus;
  referredByUserId?: string;
  referredByStudentId?: string;
  // autodrive-cg9: owner-only "show deleted" toggle on StudentsPage. Never
  // sent unless the caller is an owner -- a non-owner sending it gets a 403.
  includeDeleted?: boolean;
  // CourseDetailPage's Talabalar roster tab (GET /students?course_id=<uuid>) --
  // rides in `options` like the other filters so it lands in the query key
  // and caches separately per course.
  courseId?: string;
}

export interface StudentListParams extends Omit<StudentListOptions, 'enabled'> {
  courseType?: CourseType;
  branchId?: string;
  page?: number;
  limit?: number;
  operatorId?: string;
}

const toStudentQueryParams = ({
  courseType,
  branchId,
  page,
  limit,
  operatorId,
  search,
  dateFrom,
  dateTo,
  sortBy,
  sortOrder,
  hasDebt,
  hasGroup,
  status,
  referredByUserId,
  referredByStudentId,
  includeDeleted,
  courseId,
}: StudentListParams): StudentsQuery => ({
  course_type: courseType,
  branch_id: branchId,
  page,
  limit,
  operator_id: operatorId,
  search: search?.trim() || undefined,
  date_from: dateFrom ? toLocalDateStr(dateFrom) : undefined,
  date_to: dateTo ? toLocalDateStr(dateTo) : undefined,
  sort_by: toStudentSortBy(sortBy),
  sort_order: sortOrder,
  has_debt: hasDebt,
  has_group: hasGroup,
  status,
  referred_by_user_id: referredByUserId,
  referred_by_student_id: referredByStudentId,
  include_deleted: includeDeleted || undefined,
  course_id: courseId,
});

export const fetchStudentsPage = async (
  params: StudentListParams,
  signal?: AbortSignal,
): Promise<ListResponse<Student>> => {
  const { data } = await axiosInstance.get<unknown>('/students', {
    params: toStudentQueryParams(params),
    signal,
  });
  return parseListResponse<Student>(data, params.page, params.limit);
};

export const studentsPageQueryOptions = (
  params: StudentListParams,
  enabled = true,
) => {
  const queryParams = toStudentQueryParams(params);

  return queryOptions({
    queryKey: studentKeys.page(queryParams),
    enabled,
    queryFn: ({ signal }) => fetchStudentsPage(params, signal),
  });
};

export const fetchAllStudents = async (
  params: StudentListParams,
): Promise<Student[]> => {
  const limit = 100;
  let page = 1;
  const rows: Student[] = [];

  for (;;) {
    const result = await fetchStudentsPage({ ...params, page, limit });
    rows.push(...result.data);
    if (!result.meta.hasNextPage) break;
    page += 1;
  }

  return rows;
};

export const useStudentsPage = (
  courseType?: CourseType,
  branchId?: string,
  page?: number,
  limit?: number,
  operatorId?: string,
  options?: StudentListOptions,
) => {
  const isCrossTenant = useIsCrossTenant();
  const baseEnabled = !!branchId || isCrossTenant;
  const { enabled: optionEnabled = true, ...listOptions } = options ?? {};
  return useQuery(
    studentsPageQueryOptions(
      { courseType, branchId, page, limit, operatorId, ...listOptions },
      optionEnabled && baseEnabled,
    ),
  );
};

export const useStudents = (
  courseType?: CourseType,
  branchId?: string,
  page?: number,
  limit?: number,
  operatorId?: string,
  options?: StudentListOptions,
) => {
  const isCrossTenant = useIsCrossTenant();
  const baseEnabled = !!branchId || isCrossTenant;
  const { enabled: optionEnabled = true, ...listOptions } = options ?? {};
  const params: StudentListParams = {
    courseType,
    branchId,
    page,
    limit,
    operatorId,
    ...listOptions,
  };
  return useQuery<ListResponse<Student>, Error, Student[]>({
    queryKey: studentKeys.list(toStudentQueryParams(params)),
    enabled: optionEnabled && baseEnabled,
    queryFn: ({ signal }) => fetchStudentsPage(params, signal),
    select: (result) => result.data,
  });
};

// Single student for the detail card (header + Ma'lumot/Imtihonlar tabs).
export const studentDetailQueryOptions = (id?: string, enabled = !!id) =>
  queryOptions({
    queryKey: studentKeys.detail(id),
    enabled,
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get<unknown>(`/students/${id}`, {
        signal,
      });
      return parseItemEnvelope<Student>(data, 'student');
    },
  });

export const useStudent = (id?: string) =>
  useQuery(studentDetailQueryOptions(id));

export const useCreateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (student: CreateStudentPayload) => {
      const { data } = await axiosInstance.post<unknown>('/students', student);
      return parseItemEnvelope<Student>(data, 'student');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all });
      qc.invalidateQueries({ queryKey: paymentKeys.all });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      track('student_create');
    },
  });
};

export const useUpdateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...student
    }: UpdateStudentRequest & { id: string }) => {
      const { data } = await axiosInstance.patch<unknown>(
        `/students/${id}`,
        student,
      );
      return parseItemEnvelope<Student>(data, 'student');
    },
    onSuccess: () => {
      // studentKeys.all (root 'students') now covers the old singular
      // 'student' detail key too, and paymentKeys.all covers the old
      // standalone 'payment-snapshot' root -- both nest under Stage 2's
      // factory roots now.
      qc.invalidateQueries({ queryKey: studentKeys.all });
      qc.invalidateQueries({ queryKey: paymentKeys.all });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      track('student_update');
    },
  });
};

export const useDeleteStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/students/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all });
      qc.invalidateQueries({ queryKey: paymentKeys.all });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      track('student_delete');
    },
  });
};

// autodrive-cg9: owner-only restore, paired with the includeDeleted list
// toggle above. Un-deletes only this row -- see StudentsPage's restore
// confirm copy (common.confirm_restore_desc) for the no-cascade caveat.
export const useRestoreStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.patch<unknown>(`/students/${id}/restore`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all });
      qc.invalidateQueries({ queryKey: paymentKeys.all });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      track('student_restore');
    },
  });
};

export const searchStudents = async (q: string): Promise<Student[]> => {
  const result = await fetchStudentsPage({ search: q, page: 1, limit: 50 });
  return result.data;
};

export const useCreateStudentWithPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddStudentPayload) => {
      const paymentMethod = {
        CASH: 'naqd',
        CARD: 'karta',
        TRANSFER: 'perechisleniya',
      }[payload.payment_method] as CreateStudentPayload['payment_method'];

      // Student creation records the initial payment atomically in backend.
      // Referral fields are optional — undefined keys are dropped by JSON.
      const request: CreateStudentRequest = {
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone,
        course_type: payload.course_type,
        course_id: payload.course_id,
        total_price: payload.course_price,
        initial_payment: payload.amount,
        payment_method: paymentMethod,
        branch_id: payload.branch_id,
        group_id: payload.group_id,
        completion_date: payload.completion_date,
        has_document: false,
        o83: false,
        result: 'oqimoqda',
        notes: '',
        status: 'active',
        birth_date: payload.birth_date,
        gender: payload.gender === 'MALE' ? 'male' : 'female',
        address: payload.address,
        passport_series: payload.passport_series,
        passport_number: payload.passport_number,
        lead_source: payload.lead_source,
        lead_source_other: payload.lead_source_other,
        referred_by_student_id: payload.referred_by_student_id,
        referred_by_user_id: payload.referred_by_user_id,
      };
      const { data: studentData } = await axiosInstance.post<unknown>(
        '/students',
        request,
      );

      return parseItemEnvelope<Student>(studentData, 'student');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all });
      qc.invalidateQueries({ queryKey: paymentKeys.all });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      qc.invalidateQueries({ queryKey: groupKeys.all });
      track('student_create_with_payment');
    },
  });
};
