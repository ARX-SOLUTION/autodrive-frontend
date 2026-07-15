import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { ExamResult, CreateExamPayload } from '@/types/exam';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { examKeys } from '@/lib/queryKeys';

export const useStudentExams = (studentId?: string) => {
  return useQuery<ExamResult[]>({
    queryKey: examKeys.byStudent(studentId),
    enabled: !!studentId,
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get(`/exams/student/${studentId}`, {
        signal,
      });
      return parseListEnvelope<ExamResult>(data, 'exams').data;
    },
  });
};

export const useCreateExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExamPayload) => {
      const { data } = await axiosInstance.post('/exams', payload);
      return parseItemEnvelope<ExamResult>(data, 'exam');
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: examKeys.byStudent(variables.student_id),
      });
    },
  });
};
