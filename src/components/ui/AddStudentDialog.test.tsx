import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AddStudentDialog, {
  type AddStudentPayload,
} from '@/components/ui/AddStudentDialog';

// autodrive-qsgc.3: birth_date/start_date/completion_date/first_payment_date
// went through <Input type="date"> (native, browser-locale-formatted, and
// implicitly coerced by consumers via `new Date(str)`). They're now the
// shared DatePicker (@/lib/calendarDate), whose public contract is a plain
// 'YYYY-MM-DD' string in and out. This proves the wizard's submit payload
// carries that exact string end-to-end -- never a Date object, never a
// datetime.

const BRANCH_ID = '11111111-1111-1111-1111-111111111111';
const COURSE_ID = '22222222-2222-2222-2222-222222222222';

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', branch_id: BRANCH_ID } }),
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: () => true,
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [{ id: BRANCH_ID, name: 'Branch 1' }] }),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [] }),
}));

vi.mock('@/services/courseService', () => ({
  useCourses: () => ({
    data: [
      {
        id: COURSE_ID,
        name: 'Course 1',
        branch_id: BRANCH_ID,
        course_type: 'tezkor',
        price: 500000,
        duration_days: 14,
        is_active: true,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  }),
}));

// Step2ReferralSection (always mounted on step 2) pulls these in via
// ReferralFields -- unrelated to calendar dates, but required to render.
vi.mock('@/services/studentService', () => ({
  useStudents: () => ({ data: [] }),
  useStudentsPage: () => ({ data: undefined }),
}));
vi.mock('@/services/teacherService', () => ({
  useTeachers: () => ({ data: [] }),
}));
vi.mock('@/services/operatorService', () => ({
  useOperators: () => ({ data: [] }),
}));

afterEach(cleanup);

const q = (name: string) =>
  document.querySelector(`input[name="${name}"]`) as HTMLInputElement;

// Types a calendar-date string into a DatePicker's text input and commits it
// via blur (DatePicker.commitText), the same path a keyboard-entering user
// takes -- exercises parseTypedCalendarDate -> formatCalendarDate.
const typeDate = (name: string, value: string) => {
  const input = q(name);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

describe('AddStudentDialog calendar-date wiring (autodrive-qsgc.3)', () => {
  it('submits birth_date/start_date/completion_date/first_payment_date as YYYY-MM-DD strings', async () => {
    const onSubmit = vi.fn();
    render(
      <AddStudentDialog
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        defaultBranchId={BRANCH_ID}
        defaultCourseId={COURSE_ID}
      />,
    );

    // Step 1: personal info.
    fireEvent.change(q('last_name'), { target: { value: 'Ivanov' } });
    fireEvent.change(q('first_name'), { target: { value: 'Ivan' } });
    fireEvent.change(q('phone'), { target: { value: '901234567' } });
    fireEvent.change(q('passport_series'), { target: { value: 'AB' } });
    fireEvent.change(q('passport_number'), { target: { value: '1234567' } });
    typeDate('birth_date', '1995-05-01');
    fireEvent.change(q('address'), {
      target: { value: 'Tashkent, Chilonzor 5' },
    });

    fireEvent.click(screen.getByText('Keyingi'));

    // Step 2: course & branch -- branch_id/course_id are pre-filled via
    // defaultBranchId/defaultCourseId (real UUIDs), so no Radix Select
    // interaction is needed to reach a valid step (matches this repo's
    // PersonModal.test.tsx precedent of not driving Radix Select in tests).
    await waitFor(() => expect(q('start_date')).toBeTruthy());
    typeDate('start_date', '2026-01-10');
    // completion_date auto-fills from start_date + course.duration_days,
    // but only until the user edits it directly (dirtyFields guard) -- type
    // it explicitly here so the payload assertion below is deterministic
    // rather than racing the auto-fill effect.
    typeDate('completion_date', '2026-02-01');

    fireEvent.click(screen.getByText('Keyingi'));

    // Step 3: payment & confirmation. `amount` has no `name` attribute
    // (pre-existing, unrelated to calendar dates), so it's queried by
    // placeholder instead of the `q()` helper used everywhere else.
    const amountInput = await screen.findByPlaceholderText(
      'students.wizard.amount_placeholder',
    );
    fireEvent.change(amountInput, { target: { value: '500000' } });
    typeDate('first_payment_date', '2026-01-12');
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByText('Saqlash va tasdiqlash'));

    const confirmButton = await screen.findByText(
      'students.wizard.confirm_yes',
    );
    fireEvent.click(confirmButton);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0] as AddStudentPayload;

    expect(payload.birth_date).toBe('1995-05-01');
    expect(payload.start_date).toBe('2026-01-10');
    expect(payload.completion_date).toBe('2026-02-01');
    expect(payload.first_payment_date).toBe('2026-01-12');

    // Wire proof: every date is a bare string, never a Date instance.
    for (const key of [
      'birth_date',
      'start_date',
      'completion_date',
      'first_payment_date',
    ] as const) {
      expect(typeof payload[key]).toBe('string');
    }
    const wire = JSON.parse(JSON.stringify(payload)) as AddStudentPayload;
    expect(wire.birth_date).toBe('1995-05-01');
    expect(wire.completion_date).toBe('2026-02-01');
  });
});
