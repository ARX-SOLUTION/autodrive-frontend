import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import PaymentModal from '@/components/ui/PaymentModal';

// Relation-add convention (bd 6ef.6): an "Add payment" button on a student
// detail card passes lockedStudentId so the student is pinned and the picker
// is hidden — the same prefill idiom as RecordExamModal.
vi.mock('@/services/studentService', () => ({
  useStudentsPage: () => ({
    data: { data: [], meta: { total: 0, totalPages: 1 } },
    isFetching: false,
    isError: false,
  }),
}));

const noop = () => {};

afterEach(cleanup);

describe('PaymentModal locked-student mode', () => {
  // The student picker button shows the `students.select_student` placeholder
  // when nothing is picked; locked mode replaces the whole picker with the
  // pinned name. (Assert on that text, not role="combobox" — the payment-method
  // Select is also a combobox.)
  it('hides the picker and pins the student when lockedStudentId is set', () => {
    render(
      <PaymentModal
        open
        onClose={noop}
        onSubmit={noop}
        lockedStudentId="s1"
        lockedStudentName="Aziz Karimov"
      />,
    );
    expect(screen.getByText('Aziz Karimov')).toBeTruthy();
    expect(screen.queryByText('students.select_student')).toBeNull();
  });

  it('shows the picker when no locked student is given', () => {
    render(<PaymentModal open onClose={noop} onSubmit={noop} />);
    expect(screen.getByText('students.select_student')).toBeTruthy();
  });
});
