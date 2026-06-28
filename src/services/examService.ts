import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { ExamResult, CreateExamPayload } from '@/types/exam';

export const useStudentExams = (studentId?: string) => {
  return useQuery<ExamResult[]>({
    queryKey: ['exams', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/exams/student/${studentId}`);
      return data?.data || data || [];
    },
  });
};

export const useCreateExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExamPayload) => {
      const { data } = await axiosInstance.post('/exams', payload);
      return data?.data || data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['exams', variables.student_id] });
    },
  });
};
