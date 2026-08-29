import { createFileRoute } from '@tanstack/react-router';
import AttendancePage from '@/pages/AttendancePage';

type AttendanceSearch = { lesson?: string };

export const Route = createFileRoute('/_authenticated/attendance')({
  validateSearch: (search: Record<string, unknown>): AttendanceSearch => ({
    lesson: typeof search.lesson === 'string' ? search.lesson : undefined,
  }),
  component: AttendancePage,
});
