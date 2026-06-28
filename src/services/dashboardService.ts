import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { CourseType } from '@/types/student';

export interface DashboardAnalytics {
  total_students: number;
  active_tezkor: number;
  active_avto: number;
  new_this_month: number;
  new_last_month: number;
  total_revenue: number;
  total_debt: number;
  avg_debt: number;
  this_month_revenue: number;
  last_month_revenue: number;
  payment_status: { paid: number; partial: number; debt: number };
  result_stats: { oqimoqda: number; topshirdi: number; yiqildi: number };
  monthly_enrollment: { month: string; tezkor: number; avto_maktab: number }[];
  monthly_revenue: { month: string; amount: number }[];
  branch_stats: {
    branch: string;
    students: number;
    revenue: number;
    debt: number;
  }[];
}

export const useDashboardAnalytics = (
  branchId?: string,
  courseType?: CourseType,
) => {
  const role = useAuthStore((s) => s.user?.role);
  const isOwnerOrDev = role === 'owner' || role === 'dev';
  return useQuery<DashboardAnalytics>({
    queryKey: ['dashboard', branchId, courseType],
    enabled: !!branchId || isOwnerOrDev,
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/dashboard/analytics', {
        params: { branch_id: branchId, course_type: courseType },
      });
      return res?.data || res;
    },
  });
};

export interface TeacherAnalytics {
  active_groups: number;
  total_students: number;
  result_stats: { oqimoqda: number; topshirdi: number; yiqildi: number };
}

export const useTeacherAnalytics = () => {
  return useQuery<TeacherAnalytics>({
    queryKey: ['dashboard', 'teacher-analytics'],
    queryFn: async () => {
      const { data: res } = await axiosInstance.get(
        '/dashboard/teacher-analytics',
      );
      return res?.data || res;
    },
  });
};
