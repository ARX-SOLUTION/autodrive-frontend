import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import type { AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { ExpenseMonthCloseDialog } from '@/pages/expenses/ExpenseMonthCloseDialog';
import {
  fetchExpenseMonthCloseCsv,
  getExpenseMonthCloseFilename,
  toExpenseMonthCloseQueryParams,
} from '@/services/expenseService';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/api/axiosInstance', () => ({
  default: { get: mocks.get, post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
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

const monthCloseResponse = (
  blob: Blob,
  contentDisposition = 'attachment; filename="month-close.csv"',
) =>
  ({
    data: blob,
    headers: { get: vi.fn(() => contentDisposition) },
  }) as unknown as AxiosResponse<Blob>;

const dialog = (open = true) => (
  <ExpenseMonthCloseDialog
    open={open}
    branches={[
      { id: 'branch-1', name: 'Chilonzor' },
      { id: 'branch-2', name: 'Yunusobod' },
    ]}
    isBranchesLoading={false}
    isBranchesError={false}
    onRetryBranches={vi.fn()}
    onClose={onClose}
  />
);

const renderDialog = () =>
  renderWithRouter(dialog(), {
    initialEntry: '/expenses',
    routePattern: '/expenses',
  });

beforeEach(() => {
  vi.mocked(axiosInstance.get).mockReset();
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
    vi.mocked(axiosInstance.get).mockResolvedValue(
      monthCloseResponse(
        blob,
        'attachment; filename="month-close-2026-08.csv"',
      ),
    );
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

    await waitFor(() => expect(axiosInstance.get).toHaveBeenCalled());
    expect(createObjectUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(mocks.success).toHaveBeenCalledWith('expenses.month_close.success');
  });

  it('aborts a pending request on unmount without download or feedback', async () => {
    vi.mocked(axiosInstance.get).mockImplementation(
      (_url, config) =>
        new Promise((_resolve, reject) => {
          config?.signal?.addEventListener?.('abort', () => {
            reject(new Error('aborted'));
          });
        }),
    );
    const { unmount } = await renderDialog();

    fireEvent.change(screen.getByLabelText('expenses.month_close.month'), {
      target: { value: '2026-08' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.month_close.submit' }),
    );
    const signal = vi.mocked(axiosInstance.get).mock.calls[0]?.[1]?.signal;

    unmount();

    await waitFor(() => expect(signal?.aborted).toBe(true));
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  it('aborts a pending request when the dialog closes', async () => {
    vi.mocked(axiosInstance.get).mockImplementation(
      (_url, config) =>
        new Promise((_resolve, reject) => {
          config?.signal?.addEventListener?.('abort', () => {
            reject(new Error('aborted'));
          });
        }),
    );
    await renderDialog();
    fireEvent.change(screen.getByLabelText('expenses.month_close.month'), {
      target: { value: '2026-08' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.month_close.submit' }),
    );
    const signal = vi.mocked(axiosInstance.get).mock.calls[0]?.[1]?.signal;

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(signal?.aborted).toBe(true);
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  it('aborts a pending request when a parent closes the dialog', async () => {
    vi.mocked(axiosInstance.get).mockImplementation(
      (_url, config) =>
        new Promise((_resolve, reject) => {
          config?.signal?.addEventListener?.('abort', () => {
            reject(new Error('aborted'));
          });
        }),
    );
    const view = await renderDialog();
    fireEvent.change(screen.getByLabelText('expenses.month_close.month'), {
      target: { value: '2026-08' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.month_close.submit' }),
    );
    const signal = vi.mocked(axiosInstance.get).mock.calls[0]?.[1]?.signal;

    view.rerender(dialog(false));

    await waitFor(() => expect(signal?.aborted).toBe(true));
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  it('blocks synchronous duplicate submissions while a request is pending', async () => {
    let resolveRequest: (response: AxiosResponse<Blob>) => void = () =>
      undefined;
    vi.mocked(axiosInstance.get).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    await renderDialog();
    fireEvent.change(screen.getByLabelText('expenses.month_close.month'), {
      target: { value: '2026-08' },
    });
    const form = screen
      .getByRole('button', { name: 'expenses.month_close.submit' })
      .closest('form');
    expect(form).not.toBeNull();

    act(() => {
      form!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
      form!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });

    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    resolveRequest(monthCloseResponse(new Blob(['csv'])));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledTimes(1));
  });

  it('revokes the object URL after the browser can consume the download', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue(
      monthCloseResponse(new Blob(['csv'])),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const deferredCallbacks: Array<() => void> = [];
    vi.spyOn(window, 'setTimeout').mockImplementation((handler, timeout) => {
      if (timeout === 0 && typeof handler === 'function') {
        deferredCallbacks.push(() => handler());
      }
      return 1 as unknown as ReturnType<typeof window.setTimeout>;
    });
    await renderDialog();

    fireEvent.change(screen.getByLabelText('expenses.month_close.month'), {
      target: { value: '2026-08' },
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'expenses.month_close.submit' }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createObjectUrl).toHaveBeenCalled();
    expect(revokeObjectUrl).not.toHaveBeenCalled();
    expect(deferredCallbacks).not.toHaveLength(0);
    deferredCallbacks.forEach((callback) => callback());
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:month-close');
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
    expect(
      getExpenseMonthCloseFilename(
        "attachment; filename=backup.csv; filename*=UTF-8''month%20close.csv",
      ),
    ).toBe('month close.csv');
    expect(
      getExpenseMonthCloseFilename('attachment; filename="report\u0000.csv"'),
    ).toBe('report_.csv');
  });

  it('reports download errors without creating an object URL', async () => {
    vi.mocked(axiosInstance.get).mockRejectedValue(new Error('offline'));
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

describe('expense month-close service', () => {
  it('sends the abort signal with the exact CSV request', async () => {
    const blob = new Blob(['csv']);
    const getHeader = vi.fn(() => 'attachment; filename="close-2026-08.csv"');
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: blob,
      headers: { get: getHeader },
    } as unknown as AxiosResponse<Blob>);
    const signal = new AbortController().signal;

    expect(toExpenseMonthCloseQueryParams({ month: '2026-08' })).toEqual({
      month: '2026-08',
    });

    const result = await fetchExpenseMonthCloseCsv(
      { month: '2026-08', branchId: 'branch-2' },
      signal,
    );

    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/expenses/month-close.csv',
      {
        params: { month: '2026-08', branch_id: 'branch-2' },
        responseType: 'blob',
        signal,
      },
    );
    expect(getHeader).toHaveBeenCalledWith('content-disposition');
    expect(result).toEqual({
      blob,
      contentDisposition: 'attachment; filename="close-2026-08.csv"',
    });
  });
});
