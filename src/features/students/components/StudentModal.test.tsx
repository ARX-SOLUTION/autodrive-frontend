import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import StudentModal, {
  type CreateStudentPayload,
} from '@/features/students/api/StudentModal';
import uz from '@/i18n/locales/uz.json';
import ru from '@/i18n/locales/ru.json';
import en from '@/i18n/locales/en.json';

const translation = vi.hoisted(() => ({ t: (key: string) => key }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translation.t(key),
    i18n: { language: 'uz' },
  }),
}));

// autodrive-qsgc.3: avto_maktab's completion_date went through
// <Input type="date">. It's now the shared DatePicker (@/lib/calendarDate),
// whose public contract is a plain 'YYYY-MM-DD' string. This proves the
// create-student submit payload carries that exact string, not a Date.

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'manager', branch_id: 'b1' } }),
}));

vi.mock('@/hooks/useCan', () => ({
  // canAssignBranch = false -> branch_id comes from the auth user, skipping
  // the branch Radix Select entirely (same rationale as AddStudentDialog's
  // test and this repo's PersonModal.test.tsx precedent).
  useCan: () => false,
}));

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'b1', name: 'Branch 1' }] }),
}));
vi.mock('@/features/courses/api/courseService', () => ({
  useCourses: () => ({ data: [] }),
}));
vi.mock('@/features/groups/api/groupService', () => ({
  useGroups: () => ({ data: [] }),
}));
vi.mock('@/features/students/api/studentService', () => ({
  useStudentsPage: () => ({ data: undefined }),
}));

afterEach(() => {
  cleanup();
  translation.t = (key) => key;
});

const q = (name: string) =>
  document.querySelector(`input[name="${name}"]`) as HTMLInputElement;

describe('StudentModal course label', () => {
  it.each([
    ['uz', uz],
    ['ru', ru],
    ['en', en],
  ] as const)(
    'renders a translated course label in %s',
    async (locale, resource) => {
      const i18n = createInstance();
      await i18n.init({
        lng: locale,
        resources: { [locale]: { translation: resource } },
      });
      translation.t = (key) => i18n.t(key);
      render(
        <StudentModal
          open
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          courseType="tezkor"
        />,
      );

      expect(
        screen.getByRole('combobox', {
          name: resource.students.sections.course,
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/returned an object instead of string/),
      ).toBeNull();
    },
  );
});

describe('StudentModal calendar-date wiring (autodrive-qsgc.3)', () => {
  it('submits completion_date as a YYYY-MM-DD string, never a Date', async () => {
    const onSubmit = vi.fn();
    render(
      <StudentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        loading={false}
        courseType="avto_maktab"
      />,
    );

    fireEvent.change(q('last_name'), { target: { value: 'Ivanov' } });
    fireEvent.change(q('first_name'), { target: { value: 'Ivan' } });
    fireEvent.change(q('learner_password'), { target: { value: 'password1' } });
    fireEvent.change(q('phone'), { target: { value: '901234567' } });

    const completionDateInput = q('completion_date');
    fireEvent.change(completionDateInput, {
      target: { value: '2026-06-15' },
    });
    fireEvent.blur(completionDateInput);

    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0] as CreateStudentPayload;

    expect(payload.completion_date).toBe('2026-06-15');
    expect(typeof payload.completion_date).toBe('string');

    // Wire proof: JSON must carry the bare calendar date, never a datetime.
    const wire = JSON.parse(JSON.stringify(payload)) as CreateStudentPayload;
    expect(wire.completion_date).toBe('2026-06-15');
  });

  it('omits completion_date when left empty (never emits an empty-string wire value)', async () => {
    const onSubmit = vi.fn();
    render(
      <StudentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        loading={false}
        courseType="avto_maktab"
      />,
    );

    fireEvent.change(q('last_name'), { target: { value: 'Petrov' } });
    fireEvent.change(q('first_name'), { target: { value: 'Petr' } });
    fireEvent.change(q('learner_password'), { target: { value: 'password1' } });
    fireEvent.change(q('phone'), { target: { value: '911234567' } });

    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0] as CreateStudentPayload;
    expect(payload.completion_date).toBeUndefined();
  });
});
