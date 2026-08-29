import { createFileRoute } from '@tanstack/react-router';
import StudentDetailPage from '@/pages/StudentDetailPage';
import { studentDetailQueryOptions } from '@/services/studentService';

type StudentDetailSearch = { tab?: 'payments' };

export const Route = createFileRoute('/_authenticated/students/$id')({
  validateSearch: (search: Record<string, unknown>): StudentDetailSearch => ({
    tab: search.tab === 'payments' ? 'payments' : undefined,
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(studentDetailQueryOptions(params.id)),
  component: StudentDetailPage,
});
