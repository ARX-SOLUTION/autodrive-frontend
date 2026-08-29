import { createFileRoute } from '@tanstack/react-router';
import AttendancePage from '@/pages/AttendancePage';

export const Route = createFileRoute('/_authenticated/attendance')({
  component: AttendancePage,
});
