import { createFileRoute } from '@tanstack/react-router';
import StudentDetailPage from '@/pages/StudentDetailPage';
import { studentDetailQueryOptions } from '@/services/studentService';

export const Route = createFileRoute('/_authenticated/students/$id')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(studentDetailQueryOptions(params.id)),
  component: StudentDetailPage,
});
