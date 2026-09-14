import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ExpenseMonthCloseDialog,
  getExpenseMonthCloseFilename,
} from '@/pages/expenses/ExpenseMonthCloseDialog';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const mocks = vi.hoisted(() => ({
  fetchExpenseMonthCloseCsv: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/services/expenseService', () => ({
  fetchExpenseMonthCloseCsv: mocks.fetchExpenseMonthCloseCsv,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.success,
    error: mocks.error,
  },
}));

const onClose = vi.fn();
const createObjectUrl = vi.fn(() => 'blob:month-close');
const revokeObjectUrl = vi.fn();

const renderDialog = () =>
  renderWithRouter(
    <ExpenseMonthCloseDialog
      open
      branches={[
        { id: 'branch-1', name: 'Chilonzor' },
        { id: 'branch-2', name: 'Yunusobod' },
      ]}
      onClose={onClose}
    />,
    { initialEntry: '/expenses', routePattern: '/expenses' },
  );

beforeEach(() => {
  mocks.fetchExpenseMonthCloseCsv.mockReset();
  mocks.success.mockReset();
  mocks.error.mockReset();
  onClose.mockReset();
  createObjectUrl.mockClear();
  revokeObjectUrl.mockClear();
  vi.stubGlobal('URL', {
    createObjectURL: createObjectUrl,
    revokeObjectURL: revokeObjectUrl,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ExpenseMonthCloseDialog', () => {
  it('downloads the independently selected month and branch CSV', async () => {
    const blob = new Blob(['csv']);
    mocks.fetchExpenseMonthCloseCsv.mockResolvedValue({
      blob,
      contentDisposition: 'attachment; filename="month-close-2026-08.csv"',
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    await renderDialog();

    fireEvent.change(screen.getByLabelText('expenses.month_close.month'), {
      target: { value: '2026-08' },
    });
    fireEvent.change(screen.getByLabelText('expenses.month_close.branch'), {
      target: { value: 'branch-2' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.month_close.submit' }),
    );

    await waitFor(() =>
      expect(mocks.fetchExpenseMonthCloseCsv).toHaveBeenCalledWith({
        month: '2026-08',
        branchId: 'branch-2',
      }),
    );
    expect(createObjectUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:month-close');
    expect(onClose).toHaveBeenCalled();
    expect(mocks.success).toHaveBeenCalledWith('expenses.month_close.success');
  });

  it('uses a safe filename from the server response', () => {
    expect(
      getExpenseMonthCloseFilename(
        "attachment; filename*=UTF-8''month%20close%202026-08.csv",
      ),
    ).toBe('month close 2026-08.csv');
    expect(
      getExpenseMonthCloseFilename('attachment; filename="../../report.csv"'),
    ).toBe('.._.._report.csv');
    expect(
      getExpenseMonthCloseFilename('attachment; filename="report.exe"'),
    ).toBe('expenses-month-close.csv');
  });

  it('reports download errors without creating an object URL', async () => {
    mocks.fetchExpenseMonthCloseCsv.mockRejectedValue(new Error('offline'));
    await renderDialog();

    fireEvent.change(screen.getByLabelText('expenses.month_close.month'), {
      target: { value: '2026-08' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.month_close.submit' }),
    );

    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith('expenses.month_close.error'),
    );
    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
