import { createFileRoute } from '@tanstack/react-router';
import StudentsPage from '@/pages/StudentsPage';

export const Route = createFileRoute('/_authenticated/students/')({
  component: StudentsPage,
});
