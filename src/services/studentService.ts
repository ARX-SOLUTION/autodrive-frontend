import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { Student, CourseType } from '@/types/student';
import type { CreateStudentPayload } from '@/components/ui/StudentModal';
import { track } from '@/lib/umami';
import type { ListResponse } from '@/types/list';
import { parseListResponse } from '@/lib/listResponse';

export const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface StudentListOptions {
  enabled?: boolean;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  hasDebt?: boolean;
}

interface StudentListParams extends StudentListOptions {
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
}: StudentListParams) => ({
  course_type: courseType,
  branch_id: branchId,
  page,
  limit,
  operator_id: operatorId,
  search: search?.trim() || undefined,
  date_from: dateFrom ? toLocalDateStr(dateFrom) : undefined,
  date_to: dateTo ? toLocalDateStr(dateTo) : undefined,
  sort_by: sortBy,
  sort_order: sortOrder,
  has_debt: hasDebt,
});

export const fetchStudentsPage = async (
  params: StudentListParams,
): Promise<ListResponse<Student>> => {
  const { data } = await axiosInstance.get('/students', {
    params: toStudentQueryParams(params),
  });
  return parseListResponse<Student>(data, params.page, params.limit);
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
  const role = useAuthStore((s) => s.user?.role);
  const isOwnerOrDev = role === 'owner' || role === 'dev';
  const baseEnabled = !!branchId || isOwnerOrDev;
  return useQuery<ListResponse<Student>>({
    queryKey: [
      'students',
      courseType,
      branchId,
      page,
      limit,
      operatorId,
      options?.search,
      options?.dateFrom,
      options?.dateTo,
      options?.sortBy,
      options?.sortOrder,
      options?.hasDebt,
    ],
    enabled: (options?.enabled ?? true) && baseEnabled,
    queryFn: () =>
      fetchStudentsPage({
        courseType,
        branchId,
        page,
        limit,
        operatorId,
        ...options,
      }),
  });
};

export const useStudents = (
  courseType?: CourseType,
  branchId?: string,
  page?: number,
  limit?: number,
  operatorId?: string,
  options?: StudentListOptions,
) => {
  const role = useAuthStore((s) => s.user?.role);
  const isOwnerOrDev = role === 'owner' || role === 'dev';
  const baseEnabled = !!branchId || isOwnerOrDev;
  return useQuery<ListResponse<Student>, Error, Student[]>({
    queryKey: [
      'students',
      courseType,
      branchId,
      page,
      limit,
      operatorId,
      options?.search,
      options?.dateFrom,
      options?.dateTo,
      options?.sortBy,
      options?.sortOrder,
      options?.hasDebt,
    ],
    enabled: (options?.enabled ?? true) && baseEnabled,
    queryFn: () =>
      fetchStudentsPage({
        courseType,
        branchId,
        page,
        limit,
        operatorId,
        ...options,
      }),
    select: (result) => result.data,
  });
};

export const useCreateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (student: CreateStudentPayload) => {
      const { data } = await axiosInstance.post('/students', student);
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['payment-snapshot'] });
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
    }: Partial<CreateStudentPayload> & { id: string }) => {
      const { data } = await axiosInstance.patch(`/students/${id}`, student);
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['payment-snapshot'] });
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
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['payment-snapshot'] });
      track('student_delete');
    },
  });
};

export const searchStudents = async (q: string): Promise<Student[]> => {
  const result = await fetchStudentsPage({ search: q, page: 1, limit: 50 });
  return result.data;
};

export const bulkCreateStudents = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosInstance.post('/students/bulk-create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
