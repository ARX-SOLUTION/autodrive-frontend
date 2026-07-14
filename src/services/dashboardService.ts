import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useIsCrossTenant } from '@/hooks/useCan';
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
  const isCrossTenant = useIsCrossTenant();
  return useQuery<DashboardAnalytics>({
    queryKey: ['dashboard', branchId, courseType],
    enabled: !!branchId || isCrossTenant,
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

export interface CompanyOverviewQuery {
  branchId?: string;
  courseType?: CourseType;
  companyId?: string;
  from?: string;
  to?: string;
  granularity?: 'day' | 'week';
}

export interface CompanyOverview {
  timezone: 'Asia/Tashkent';
  filters: {
    branch_id?: string;
    course_type?: string;
    from: string;
    to: string;
    granularity: 'day' | 'week';
  };
  freshness: { generated_at: string; data_through: string | null };
  kpis: {
    revenue: {
      today: number;
      period: number;
      previous_period: number;
      period_from?: string;
      period_to?: string;
      period_to_inclusive?: string;
      previous_period_from?: string;
      previous_period_to?: string;
      previous_period_to_inclusive?: string;
      delta_percent: number | null;
      currency: 'UZS';
    };
    debt: {
      current_outstanding: number;
      students_with_debt: number;
      avg_per_debtor: number;
    };
    students: {
      active: number;
      new: number;
      new_previous_period?: number;
      completed: number;
      dropped: number;
      suspended?: number;
    };
    result_stats?: { oqimoqda: number; topshirdi: number; yiqildi: number };
    course_mix: { tezkor: number; avto_maktab: number };
    collection: {
      paid: number;
      partial: number;
      debt: number;
      coverage_rate: number;
    };
    debt_aging: {
      bucket_0_30: number;
      bucket_31_60: number;
      bucket_61_90: number;
      bucket_90_plus: number;
    };
    arpu: number;
    cash_collection_rate: number;
    revenue_by_course_type: {
      tezkor: { revenue: number; per_lesson: number | null };
      avto_maktab: { revenue: number; per_lesson: number | null };
    };
    // O'quv jarayoni (academic) block — autodrive-sgf.3
    attendance_rate?: number | null;
    dropout_rate?: number;
    exam_first_attempt_pass_rate?: number | null;
    completion_time_median_days?: number | null;
    enrollment_funnel?: {
      contract: number;
      active: number;
      graduated: number;
      dropped_or_suspended: number;
    };
    // Xodim (staff) block (autodrive-sgf.4)
    teacher_load?: {
      avg_lessons_per_active_teacher: number | null;
      avg_students_per_teacher: number | null;
      active_teacher_count: number;
      top_teachers: Array<{ id: string; name: string; lesson_count: number }>;
    };
    on_time_attendance_marking_rate?: number | null;
    avg_operator_payment_follow_through_rate?: number | null;
  };
  revenue_trend: Array<{
    period_start: string;
    amount: number;
    payment_count: number;
  }>;
  enrollment_trend?: Array<{
    month: string;
    tezkor: number;
    avto_maktab: number;
  }>;
  branch_performance: Array<{
    id: string;
    name: string;
    active_students: number;
    collected_revenue: number;
    outstanding_debt: number;
    new_students: number;
    collection_rate: number;
  }>;
  recovery_queue: Array<{
    student_id: string;
    student_name: string;
    branch_name: string;
    course_type: string;
    debt: number;
    total_price: number;
    last_payment_at: string | null;
  }>;
  operations: {
    next_lessons: Array<{
      id: string;
      title: string;
      date: string;
      lesson_type: string;
      group_name: string;
      branch_id: string;
    }>;
    incomplete_attendance_lessons: Array<{
      id: string;
      title: string;
      date: string;
      group_name: string;
      branch_id: string;
    }>;
    attendance_status: Record<string, number>;
  };
}

export const useCompanyOverview = (query: CompanyOverviewQuery = {}) => {
  const isCrossTenant = useIsCrossTenant();
  const enabled = !!query.branchId || isCrossTenant || !!query.companyId;
  return useQuery<CompanyOverview>({
    queryKey: ['company-dashboard', query],
    enabled,
    queryFn: async () => {
      const { data: res } = await axiosInstance.get(
        '/dashboard/company-overview',
        {
          params: {
            branch_id: query.branchId,
            course_type: query.courseType,
            company_id: query.companyId,
            from: query.from,
            to: query.to,
            granularity: query.granularity,
          },
        },
      );
      return res?.data || res;
    },
    staleTime: 30_000,
  });
};
