import { render, screen, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { StudentsTable } from '@/pages/students/StudentsTable';
import { StudentsMobileList } from '@/pages/students/StudentsMobileList';
import { StudentsPageHeader } from '@/pages/students/StudentsPageHeader';
import { formatMoney } from '@/lib/money';
import type { Student } from '@/types/student';

// autodrive-vh0.2: teacher must never see payment amounts. These three
// components previously rendered the debt/price columns, the mobile debt
// field, and the Excel export button (which embeds total_price/debt columns
// in every row) unconditionally -- no capability check existed at all.

afterEach(cleanup);

const STUDENT: Student = {
  id: 's1',
  last_name: 'Karimov',
  first_name: 'Aziz',
  phone: '+998901234567',
  total_price: 3000000,
  course_type: 'tezkor',
  branch_id: 'b1',
  payment_method: 'naqd',
  debt: 500000,
  has_document: true,
  registered_by: 'Nigora',
  result: 'oqimoqda',
  created_at: '2026-07-01T00:00:00.000Z',
  amount_paid: 2500000,
  initial_payment: 1000000,
};

// autodrive-vh0.6: total_price/debt are now honestly optional on Student --
// the backend actually OMITS them for a teacher requester rather than the FE
// merely hiding populated numbers. STUDENT above still models a non-teacher
// payload (real numbers, hidden only by the canViewPayments prop); this
// fixture models the real teacher shape -- no total_price/debt/
// initial_payment/second_payment/third_payment keys at all -- so tests using
// it prove the omission itself is handled safely, not just the prop gate.
const TEACHER_STUDENT: Student = {
  id: 's2',
  last_name: 'Yusupova',
  first_name: 'Malika',
  phone: '+998907654321',
  course_type: 'tezkor',
  branch_id: 'b1',
  payment_method: 'naqd',
  has_document: true,
  registered_by: 'Nigora',
  result: 'oqimoqda',
  created_at: '2026-07-01T00:00:00.000Z',
};

const tableProps = {
  students: [STUDENT],
  isLoading: false,
  isError: false,
  onRetry: vi.fn(),
  totalStudents: 1,
  startIndex: 0,
  sortField: 'created_at',
  sortDir: 'desc' as const,
  toggleSort: vi.fn(),
  canManageStudents: true,
  isCrossTenant: true,
  onOpenStudent: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onCreate: vi.fn(),
};

describe('StudentsTable payment-column gating (autodrive-vh0.2)', () => {
  // autodrive-vh0.5: the debt column is no longer dropped for a teacher --
  // it switches to a paid/owing badge. has_debt is undefined on the base
  // STUDENT fixture, so neither badge state nor the amount should render.
  it('keeps the debt column header but renders no amount or badge when has_debt is undefined and canViewPayments is false', () => {
    render(
      <StudentsTable
        {...tableProps}
        courseType="tezkor"
        canViewPayments={false}
      />,
    );
    expect(screen.getByText('students.debt')).toBeTruthy();
    expect(screen.queryByText(formatMoney(STUDENT.debt))).toBeNull();
    expect(screen.queryByText('students.debt_status_owed')).toBeNull();
    expect(screen.queryByText('students.debt_status_paid')).toBeNull();
  });

  it('shows the owing badge, never an amount, (tezkor) when canViewPayments is false and has_debt is true', () => {
    render(
      <StudentsTable
        {...tableProps}
        students={[{ ...STUDENT, has_debt: true }]}
        courseType="tezkor"
        canViewPayments={false}
      />,
    );
    expect(screen.getByText('students.debt_status_owed')).toBeTruthy();
    expect(screen.queryByText('students.debt_status_paid')).toBeNull();
    expect(screen.queryByText(formatMoney(STUDENT.debt))).toBeNull();
  });

  it('shows the paid badge (tezkor) when canViewPayments is false and has_debt is false', () => {
    render(
      <StudentsTable
        {...tableProps}
        students={[{ ...STUDENT, has_debt: false }]}
        courseType="tezkor"
        canViewPayments={false}
      />,
    );
    expect(screen.getByText('students.debt_status_paid')).toBeTruthy();
    expect(screen.queryByText('students.debt_status_owed')).toBeNull();
  });

  it('shows the debt column (tezkor) when canViewPayments is true (regression)', () => {
    render(
      <StudentsTable
        {...tableProps}
        courseType="tezkor"
        canViewPayments={true}
      />,
    );
    expect(screen.getByText('students.debt')).toBeTruthy();
  });

  it('hides all money columns (avto_maktab) when canViewPayments is false', () => {
    render(
      <StudentsTable
        {...tableProps}
        courseType="avto_maktab"
        canViewPayments={false}
      />,
    );
    expect(screen.queryByText('students.initial_payment')).toBeNull();
    expect(screen.queryByText('2-students.payment')).toBeNull();
    expect(screen.queryByText('3-students.payment')).toBeNull();
    // debt column header stays (badge, not amount -- autodrive-vh0.5); no
    // amount and no badge for this fixture's undefined has_debt.
    expect(screen.getByText('students.debt')).toBeTruthy();
    expect(screen.queryByText(formatMoney(STUDENT.debt))).toBeNull();
    // Non-money columns stay.
    expect(screen.getByText('students.last_name')).toBeTruthy();
  });

  it('shows all money columns (avto_maktab) when canViewPayments is true (regression)', () => {
    render(
      <StudentsTable
        {...tableProps}
        courseType="avto_maktab"
        canViewPayments={true}
      />,
    );
    expect(screen.getByText('students.initial_payment')).toBeTruthy();
    expect(screen.getByText('2-students.payment')).toBeTruthy();
    expect(screen.getByText('3-students.payment')).toBeTruthy();
    expect(screen.getByText('students.debt')).toBeTruthy();
  });
});

describe('StudentsMobileList debt field gating (autodrive-vh0.2)', () => {
  const mobileProps = {
    students: [STUDENT],
    isLoading: false,
    isError: false,
    onRetry: vi.fn(),
    canManageStudents: true,
    isCrossTenant: true,
    onOpenStudent: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onCreate: vi.fn(),
  };

  it('hides the debt field when canViewPayments is false', () => {
    render(<StudentsMobileList {...mobileProps} canViewPayments={false} />);
    expect(screen.queryByText('students.detail.debt')).toBeNull();
  });

  it('shows the debt field when canViewPayments is true (regression)', () => {
    render(<StudentsMobileList {...mobileProps} canViewPayments={true} />);
    expect(screen.getByText('students.detail.debt')).toBeTruthy();
  });

  // autodrive-vh0.5: paid/owing badge instead of a blank for a teacher.
  it('shows the owing badge when canViewPayments is false and has_debt is true', () => {
    render(
      <StudentsMobileList
        {...mobileProps}
        students={[{ ...STUDENT, has_debt: true }]}
        canViewPayments={false}
      />,
    );
    expect(screen.getByText('students.detail.debt')).toBeTruthy();
    expect(screen.getByText('students.debt_status_owed')).toBeTruthy();
  });

  it('shows the paid badge when canViewPayments is false and has_debt is false', () => {
    render(
      <StudentsMobileList
        {...mobileProps}
        students={[{ ...STUDENT, has_debt: false }]}
        canViewPayments={false}
      />,
    );
    expect(screen.getByText('students.detail.debt')).toBeTruthy();
    expect(screen.getByText('students.debt_status_paid')).toBeTruthy();
  });
});

describe('StudentsPageHeader export-button gating (autodrive-vh0.2)', () => {
  // Export embeds total_price/debt in every row -- must disappear entirely
  // for a teacher rather than leak payment data via a downloaded file.
  const headerProps = {
    totalStudents: 5,
    isExporting: false,
    onExport: vi.fn(),
    canManageStudents: true,
    onCreate: vi.fn(),
  };

  it('hides the export button when canViewPayments is false', () => {
    render(<StudentsPageHeader {...headerProps} canViewPayments={false} />);
    expect(screen.queryByText('students.export_excel')).toBeNull();
  });

  it('shows the export button when canViewPayments is true (regression)', () => {
    render(<StudentsPageHeader {...headerProps} canViewPayments={true} />);
    expect(screen.getByText('students.export_excel')).toBeTruthy();
  });
});

describe('genuinely payment-less teacher payload: no money string, no misleading 0 (autodrive-vh0.6)', () => {
  it('StudentsTable (tezkor): owing badge only, no money string anywhere when has_debt is true', () => {
    render(
      <StudentsTable
        {...tableProps}
        students={[{ ...TEACHER_STUDENT, has_debt: true }]}
        courseType="tezkor"
        canViewPayments={false}
      />,
    );
    expect(screen.getByText('students.debt_status_owed')).toBeTruthy();
    expect(screen.queryAllByText(/so'm/)).toHaveLength(0);
    expect(screen.queryByText("0 so'm")).toBeNull();
  });

  it('StudentsTable (tezkor): no badge and no money string when has_debt is absent', () => {
    render(
      <StudentsTable
        {...tableProps}
        students={[TEACHER_STUDENT]}
        courseType="tezkor"
        canViewPayments={false}
      />,
    );
    expect(screen.queryByText('students.debt_status_owed')).toBeNull();
    expect(screen.queryByText('students.debt_status_paid')).toBeNull();
    expect(screen.queryAllByText(/so'm/)).toHaveLength(0);
  });

  it('StudentsTable (avto_maktab): payment columns absent and no money string anywhere', () => {
    render(
      <StudentsTable
        {...tableProps}
        students={[{ ...TEACHER_STUDENT, has_debt: true }]}
        courseType="avto_maktab"
        canViewPayments={false}
      />,
    );
    expect(screen.queryByText('students.initial_payment')).toBeNull();
    expect(screen.queryByText('2-students.payment')).toBeNull();
    expect(screen.queryByText('3-students.payment')).toBeNull();
    expect(screen.getByText('students.debt_status_owed')).toBeTruthy();
    expect(screen.queryAllByText(/so'm/)).toHaveLength(0);
  });

  it('StudentsMobileList: owing badge, never a money string or a misleading 0', () => {
    render(
      <StudentsMobileList
        students={[{ ...TEACHER_STUDENT, has_debt: true }]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        canManageStudents={true}
        isCrossTenant={true}
        canViewPayments={false}
        onOpenStudent={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreate={vi.fn()}
      />,
    );
    expect(screen.getByText('students.detail.debt')).toBeTruthy();
    expect(screen.getByText('students.debt_status_owed')).toBeTruthy();
    expect(screen.queryAllByText(/so'm/)).toHaveLength(0);
    expect(screen.queryByText("0 so'm")).toBeNull();
  });
});
