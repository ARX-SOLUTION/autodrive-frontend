import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import PaymentModal from '@/features/payments/api/PaymentModal';
import { useWriteOptions } from '@/hooks/useWriteOptions';
import { useAuthStore } from '@/store/authStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useWriteOptions', () => ({ useWriteOptions: vi.fn() }));

vi.mock('@/features/students/api/studentService', () => ({
  useStudentsPage: () => ({
    data: undefined,
    isFetching: false,
    isError: false,
  }),
}));

const noop = () => {};

// Two students with the same name: only the masked phone and group tell them
// apart. Neither name contains the search text; the server matched on phone.
const students = [
  {
    id: 's1',
    first_name: 'Aziz',
    last_name: 'Karimov',
    branch_id: 'b1',
    course_type: 'avto_maktab' as const,
    group_name: 'B-1',
    phone_last4: '4567',
    total_price: 3_000_000,
    amount_paid: 1_000_000,
  },
  {
    id: 's2',
    first_name: 'Aziz',
    last_name: 'Karimov',
    branch_id: 'b1',
    course_type: 'avto_maktab' as const,
    group_name: 'B-2',
    phone_last4: null,
    total_price: 3_000_000,
    amount_paid: 3_000_000,
  },
];

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: 'owner',
      email: 'owner@example.com',
      role: 'owner',
      permissions: [],
    },
    activeBranchId: 'b1',
  });
  vi.mocked(useWriteOptions).mockReturnValue({
    scoped: true,
    branches: [{ id: 'b1', name: 'Chilonzor' }],
    selectedBranchId: 'b1',
    data: { students, students_total: 120 },
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useWriteOptions>);
});

afterEach(cleanup);

describe('PaymentModal server-side student lookup', () => {
  it('sends search, course type and limit to the server instead of filtering locally', async () => {
    render(
      <PaymentModal
        open
        onClose={noop}
        onSubmit={noop}
        courseType="avto_maktab"
      />,
    );
    fireEvent.click(
      screen.getByRole('combobox', { name: 'payments.student_name' }),
    );
    fireEvent.change(screen.getByLabelText('payments.search_placeholder'), {
      target: { value: '4567' },
    });

    await waitFor(() =>
      expect(vi.mocked(useWriteOptions).mock.calls.at(-1)?.[4]).toEqual({
        search: '4567',
        course_type: 'avto_maktab',
        limit: 50,
      }),
    );
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('tells same-name students apart and shows how many matched in total', () => {
    render(<PaymentModal open onClose={noop} onSubmit={noop} />);
    fireEvent.click(
      screen.getByRole('combobox', { name: 'payments.student_name' }),
    );

    expect(screen.getByText('•• 4567 · B-1')).toBeInTheDocument();
    expect(screen.getByText('B-2')).toBeInTheDocument();
    expect(screen.getByText('2 / 120')).toBeInTheDocument();
  });
});
