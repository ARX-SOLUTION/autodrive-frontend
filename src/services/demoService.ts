import { useMutation } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';

export interface DemoRequestPayload {
  full_name: string;
  phone: string;
  region: string;
  center_name?: string;
  student_count?: string;
  note?: string;
}

export const useCreateDemoRequest = () =>
  useMutation({
    mutationFn: (payload: DemoRequestPayload) =>
      axiosInstance.post('/demo-requests', payload),
  });
