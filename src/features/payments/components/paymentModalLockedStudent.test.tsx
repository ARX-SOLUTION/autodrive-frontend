import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { createInstance } from 'i18next';
import PaymentModal from '@/features/payments/api/PaymentModal';
import type { Student } from '@/features/students/types';
import uz from '@/i18n/locales/uz.json';
import ru from '@/i18n/locales/ru.json';
import en from '@/i18n/locales/en.json';

const translation = vi.hoisted(() => ({
  t: (key: string, _options?: { defaultValue?: string }) => key,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      translation.t(key, options),
  }),
}));

const picker = vi.hoisted(() => ({
  students: [] as Pick<
    Student,
    | 'id'
    | 'first_name'
    | 'last_name'
    | 'phone'
    | 'branch_name'
    | 'group_name'
    | 'debt'
  >[],
}));

const sameNameStudents = [
  {
    id: 's1',
    first_name: 'Aziz',
    last_name: 'Karimov',
    phone: '+998901234567',
    branch_name: 'Yunusobod',
    group_name: 'B-1',
    debt: 100000,
  },
  {
    id: 's2',
    first_name: 'Aziz',
    last_name: 'Karimov',
    phone: '+998911234567',
    branch_name: 'Chilonzor',
    group_name: 'B-2',
    debt: 100000,
  },
];

// Relation-add convention (bd 6ef.6): an "Add payment" button on a student
// detail card passes lockedStudentId so the student is pinned and the picker
// is hidden — the same prefill idiom as RecordExamModal.
vi.mock('@/features/students/api/studentService', () => ({
  useStudentsPage: () => ({
    data: {
      data: picker.students,
      meta: { total: picker.students.length, totalPages: 1 },
    },
    isFetching: false,
    isError: false,
  }),
}));

const noop = () => {};

afterEach(() => {
  cleanup();
  picker.students = [];
  translation.t = (key) => key;
});

describe('PaymentModal locked-student mode', () => {
  it.each([
    ['uz', uz],
    ['ru', ru],
    ['en', en],
  ] as const)(
    'localizes the picker and payment methods in %s',
    async (locale, resource) => {
      const i18n = createInstance();
      await i18n.init({
        lng: locale,
        resources: { [locale]: { translation: resource } },
      });
      translation.t = (key, options) => i18n.t(key, options);
      render(<PaymentModal open onClose={noop} onSubmit={noop} />);

      expect(
        screen.getByRole('combobox', { name: resource.payments.student_name }),
      ).toHaveTextContent(resource.payments.validation.select_student);
      const method = screen.getByRole('combobox', {
        name: `${resource.payments.payment_method} *`,
      });
      expect(method).toHaveTextContent(resource.payments.method.naqd);
      fireEvent.keyDown(method, { key: 'ArrowDown' });
      expect(
        await screen.findByRole('option', {
          name: resource.payments.method.karta,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', {
          name: resource.payments.method.perechisleniya,
        }),
      ).toBeInTheDocument();
    },
  );

  // The student picker button shows the `payments.validation.select_student` placeholder
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
    expect(screen.queryByText('payments.validation.select_student')).toBeNull();
  });

  it('shows the picker when no locked student is given', () => {
    render(<PaymentModal open onClose={noop} onSubmit={noop} />);
    expect(screen.getByText('payments.validation.select_student')).toBeTruthy();
  });

  it('keeps the chosen same-name student identifiable and submits that student id', async () => {
    picker.students = sameNameStudents;
    const onSubmit = vi.fn();
    render(<PaymentModal open onClose={noop} onSubmit={onSubmit} />);
    fireEvent.click(
      screen.getByRole('combobox', { name: 'payments.student_name' }),
    );
    fireEvent.click(await screen.findByRole('option', { name: /911234567/ }));

    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByText('+998911234567')).toBeVisible();
    expect(screen.getByText('Chilonzor · B-2')).toBeVisible();
    expect(screen.queryByText('+998901234567')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('0'), {
      target: { value: '50000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0].student_id).toBe('s2');
  });

  it('uses the supplied locked student context even when cached picker results omit them', () => {
    picker.students = [sameNameStudents[1]];
    render(
      <PaymentModal
        open
        onClose={noop}
        onSubmit={noop}
        students={[sameNameStudents[0]]}
        lockedStudentId="s1"
        lockedStudentName="Karimov Aziz"
        lockedStudentDebt={100000}
      />,
    );

    expect(screen.getByText('+998901234567')).toBeVisible();
    expect(screen.getByText('Yunusobod · B-1')).toBeVisible();
    expect(screen.queryByText('+998911234567')).toBeNull();
    expect(
      screen.queryByRole('combobox', { name: 'payments.student_name' }),
    ).toBeNull();
  });

  it('retains context when discard is cancelled and clears it after close and reopen', async () => {
    picker.students = sameNameStudents;
    const props = { onClose: vi.fn(), onSubmit: vi.fn() };
    const { rerender } = render(<PaymentModal open {...props} />);
    fireEvent.click(
      screen.getByRole('combobox', { name: 'payments.student_name' }),
    );
    fireEvent.click(await screen.findByRole('option', { name: /901234567/ }));
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));

    const confirmation = screen.getByRole('dialog', {
      name: 'common.discard_changes_title',
    });
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.click(
      within(confirmation).getByRole('button', { name: 'common.cancel' }),
    );
    expect(screen.getByText('+998901234567')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.discard' }));
    expect(props.onClose).toHaveBeenCalledOnce();

    rerender(<PaymentModal open={false} {...props} />);
    rerender(<PaymentModal open {...props} />);
    expect(
      screen.getByRole('combobox', { name: 'payments.student_name' }),
    ).not.toHaveTextContent('Karimov Aziz');
    expect(screen.queryByText('+998901234567')).toBeNull();
    expect(screen.queryByText('Yunusobod · B-1')).toBeNull();
  });
});
