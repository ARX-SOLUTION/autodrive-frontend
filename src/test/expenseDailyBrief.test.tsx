import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExpensesPage from '@/pages/ExpensesPage';
import { tashkentTodayCalendarDate } from '@/lib/tashkentDate';
import { validateExpensesSearch } from '@/routes/_authenticated.expenses.index';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

type TestAuthUser = {
  id: string;
  email: string;
  role: 'owner' | 'manager';
  company_id: string;
  branch_id: string | null;
  branch_name: string;
};

const authState = vi.hoisted(
  (): {
    user: TestAuthUser;
    canViewExpenses: boolean;
    canManageFinance: boolean;
    day: string;
    dynamicDay: boolean;
  } => ({
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      role: 'owner' as const,
      company_id: 'company-1',
      branch_id: null as string | null,
      branch_name: 'Chilonzor',
    },
    canViewExpenses: true,
    canManageFinance: true,
    day: '2026-09-01',
    dynamicDay: false,
  }),
);

const mocks = vi.hoisted(() => ({
  useExpensesPage: vi.fn(),
  useOverdueExpenseSweep: vi.fn(),
  useExpenseTriageCounts: vi.fn(),
  useExpenseBranchOptions: vi.fn(),
  createExpense: vi.fn(),
  refetchTriage: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (
    selector: (state: { user: typeof authState.user }) => unknown,
  ) => selector({ user: authState.user }),
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: (capability: string) =>
    capability === 'viewExpenses'
      ? authState.canViewExpenses
      : authState.canManageFinance,
}));

vi.mock('@/lib/tashkentDate', () => ({
  tashkentTodayCalendarDate: vi.fn(() =>
    authState.dynamicDay
      ? new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : authState.day,
  ),
}));

vi.mock('@/services/expenseService', () => ({
  expenseCategoryValues: [
    'rent',
    'utilities',
    'vehicle',
    'marketing',
    'supplies',
    'administrative',
    'other',
  ],
  expenseStatusValues: ['planned', 'partially_paid', 'paid', 'cancelled'],
  useExpensesPage: mocks.useExpensesPage,
  useOverdueExpenseSweep: mocks.useOverdueExpenseSweep,
  useExpenseTriageCounts: mocks.useExpenseTriageCounts,
  useExpenseBranchOptions: mocks.useExpenseBranchOptions,
  useExpenseTeacherOptions: () => ({ data: [] }),
  useExpenseVehicleOptions: () => ({ data: [] }),
  useCreateTeacherSettlement: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateExpense: () => ({ mutate: mocks.createExpense, isPending: false }),
  useUpdateExpense: () => ({ mutate: vi.fn(), isPending: false }),
}));

const counts = {
  pending_total: 12,
  due_today: 2,
  due_within_three_days: 3,
  overdue_1_7: 4,
  overdue_8_30: 5,
  overdue_31_plus: 6,
  created_yesterday: 7,
};

const renderPage = (initialEntry = '/expenses', reactStrictMode = false) =>
  renderWithRouter(<ExpensesPage />, {
    initialEntry,
    routePattern: '/expenses',
    reactStrictMode,
  });

beforeEach(() => {
  localStorage.clear();
  authState.user = {
    id: 'user-1',
    email: 'owner@example.com',
    role: 'owner',
    company_id: 'company-1',
    branch_id: null,
    branch_name: 'Chilonzor',
  };
  authState.canViewExpenses = true;
  authState.canManageFinance = true;
  authState.day = '2026-09-01';
  authState.dynamicDay = false;
  mocks.refetchTriage.mockReset();
  mocks.useOverdueExpenseSweep.mockReset().mockReturnValue({
    data: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.useExpensesPage.mockReset().mockReturnValue({
    data: { data: [], meta: { total: 0, totalPages: 1 } },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.useExpenseTriageCounts.mockReset().mockReturnValue({
    data: counts,
    isLoading: false,
    isError: false,
    refetch: mocks.refetchTriage,
  });
  mocks.useExpenseBranchOptions.mockReset().mockReturnValue({ data: [] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('expenses route overdue search', () => {
  it('accepts only the exact overdue attention value', () => {
    expect(validateExpensesSearch({ attention: 'overdue' })).toMatchObject({
      attention: 'overdue',
    });
    expect(validateExpensesSearch({ attention: 'triage' })).toMatchObject({
      attention: undefined,
    });
  });
});

describe('ExpensesPage daily brief', () => {
  it('renders the four derived metrics and mirrors company list scope', async () => {
    await renderPage('/expenses?scope=company');

    expect(
      screen.getByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('expenses.daily_brief.due')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(
      screen.getByText('expenses.daily_brief.overdue'),
    ).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(
      screen.getByText('expenses.daily_brief.newly_created'),
    ).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(
      screen.getByText('expenses.daily_brief.pending'),
    ).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(mocks.useExpenseTriageCounts).toHaveBeenLastCalledWith(
      { scope: 'company' },
      true,
      '2026-09-01',
    );
    expect(mocks.useExpensesPage.mock.calls.at(-1)?.[0]).toMatchObject({
      scope: 'company',
    });
  });

  it('renders brief-local loading, error/retry, and zero-count states without blocking the table', async () => {
    mocks.useExpenseTriageCounts.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mocks.refetchTriage,
    });
    const loading = await renderPage();
    expect(screen.getByText('expenses.daily_brief.due')).toBeInTheDocument();
    expect(
      screen.getByText('expenses.daily_brief.pending'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'expenses.daily_brief.loading',
    );
    expect(screen.getByText('expenses.empty')).toBeInTheDocument();
    loading.unmount();

    mocks.useExpenseTriageCounts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.refetchTriage,
    });
    const error = await renderPage('/expenses?scope=company');
    expect(screen.getByRole('status')).toHaveTextContent(
      'expenses.daily_brief.load_error',
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(mocks.refetchTriage).toHaveBeenCalledOnce();
    mocks.useExpenseTriageCounts.mockReturnValue({
      data: counts,
      isLoading: false,
      isError: false,
      refetch: mocks.refetchTriage,
    });
    error.rerender(<ExpensesPage />);
    expect(
      screen.getByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).toHaveFocus();
    expect(screen.getByText('expenses.empty')).toBeInTheDocument();
    error.unmount();

    mocks.useExpenseTriageCounts.mockReturnValue({
      data: {
        pending_total: 0,
        due_today: 0,
        due_within_three_days: 0,
        overdue_1_7: 0,
        overdue_8_30: 0,
        overdue_31_plus: 0,
        created_yesterday: 0,
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetchTriage,
    });
    await renderPage('/expenses?branch_id=branch-2');
    expect(screen.getAllByText('0')).toHaveLength(4);
    expect(
      screen.getByText('expenses.daily_brief.no_attention'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'expenses.daily_brief.view_overdue' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'expenses.daily_brief.view_all' }),
    ).toBeInTheDocument();
  });

  it('focuses the brief only after an explicit retry recovers', async () => {
    mocks.useExpenseTriageCounts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.refetchTriage,
    });
    const rendered = await renderPage();
    const viewAll = screen.getByRole('button', {
      name: 'expenses.daily_brief.view_all',
    });
    viewAll.focus();

    mocks.useExpenseTriageCounts.mockReturnValue({
      data: counts,
      isLoading: false,
      isError: false,
      refetch: mocks.refetchTriage,
    });
    rendered.rerender(<ExpensesPage />);

    expect(viewAll).toHaveFocus();
    expect(
      screen.getByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).not.toHaveFocus();

    mocks.useExpenseTriageCounts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.refetchTriage,
    });
    rendered.rerender(<ExpensesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));

    mocks.useExpenseTriageCounts.mockReturnValue({
      data: counts,
      isLoading: false,
      isError: false,
      refetch: mocks.refetchTriage,
    });
    rendered.rerender(<ExpensesPage />);

    expect(mocks.refetchTriage).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).toHaveFocus();
  });

  it('uses atomic overdue/all transitions, preserves scope, and clears conflicts', async () => {
    const { router } = await renderPage(
      '/expenses?scope=company&status=paid&category=rent&date_from=2026-08-01&date_to=2026-08-31&page=3',
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.daily_brief.view_overdue' }),
    );
    await act(() => router.load());
    expect(router.state.location.search).toEqual({
      scope: 'company',
      attention: 'overdue',
    });
    expect(
      screen.getByText('expenses.daily_brief.overdue_filter'),
    ).toBeInTheDocument();
    expect(mocks.useExpensesPage.mock.calls.at(-1)?.[0]).toMatchObject({
      scope: 'company',
      attention: 'overdue',
      status: undefined,
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.daily_brief.view_all' }),
    );
    await act(() => router.load());
    expect(router.state.location.search).toEqual({ scope: 'company' });
  });

  it('gives attention precedence for stale URLs and clears it with clear-all', async () => {
    const { router } = await renderPage(
      '/expenses?branch_id=branch-2&attention=overdue&status=planned',
    );

    expect(mocks.useExpensesPage.mock.calls.at(-1)?.[0]).toMatchObject({
      branchId: 'branch-2',
      attention: 'overdue',
      status: undefined,
    });
    expect(
      screen.getByText('expenses.daily_brief.overdue_filter'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.clear_all' }));
    await act(() => router.load());
    expect(router.state.location.search).toEqual({});
  });

  it('pins manager brief and list scope to the JWT branch', async () => {
    authState.user = {
      ...authState.user,
      role: 'manager',
      branch_id: 'branch-1',
    };
    authState.canManageFinance = false;

    await renderPage('/expenses?branch_id=other&scope=company');

    expect(mocks.useExpenseTriageCounts).toHaveBeenLastCalledWith(
      { branchId: 'branch-1' },
      true,
      '2026-09-01',
    );
    expect(mocks.useExpensesPage.mock.calls.at(-1)?.[0]).toMatchObject({
      branchId: 'branch-1',
      scope: undefined,
    });
  });

  it('hides the brief and disables its hook when a manager has no JWT branch', async () => {
    authState.user = {
      ...authState.user,
      role: 'manager',
      branch_id: null,
    };
    authState.canManageFinance = false;

    await renderPage('/expenses?branch_id=other&scope=company');

    expect(
      screen.queryByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).not.toBeInTheDocument();
    expect(mocks.useExpenseTriageCounts).toHaveBeenLastCalledWith(
      { branchId: undefined },
      false,
      '2026-09-01',
    );
    expect(mocks.useExpensesPage.mock.calls.at(-1)?.[0]).toMatchObject({
      branchId: undefined,
      scope: undefined,
    });
  });

  it('isolates dismissal by user, company, and Tashkent day and resyncs on focus', async () => {
    const rendered = await renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.daily_brief.dismiss' }),
    );
    expect(
      screen.queryByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'expenses.list_title' }),
    ).toHaveFocus();
    const storedKey = localStorage.key(0)!;
    expect(storedKey).toContain('company-1');
    expect(storedKey).toContain('user-1');
    expect(storedKey).toContain('2026-09-01');

    authState.user = { ...authState.user, id: 'user-2' };
    rendered.rerender(<ExpensesPage />);
    expect(
      screen.getByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).toBeInTheDocument();

    authState.user = {
      ...authState.user,
      id: 'user-1',
      company_id: 'company-2',
    };
    rendered.rerender(<ExpensesPage />);
    expect(
      screen.getByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).toBeInTheDocument();

    authState.user = {
      ...authState.user,
      company_id: 'company-1',
    };
    rendered.rerender(<ExpensesPage />);
    expect(
      screen.queryByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).not.toBeInTheDocument();

    authState.day = '2026-09-02';
    fireEvent.focus(window);
    expect(
      screen.getByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.daily_brief.dismiss' }),
    );
    authState.day = '2026-09-03';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    fireEvent(document, new Event('visibilitychange'));
    expect(
      screen.getByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).toBeInTheDocument();
  });

  it('refreshes query identity when a continuously visible page crosses Tashkent midnight', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-31T18:59:59.900Z'));
    authState.dynamicDay = true;

    await renderPage();
    expect(mocks.useExpenseTriageCounts).toHaveBeenLastCalledWith(
      { branchId: undefined },
      true,
      '2026-08-31',
    );
    expect(mocks.useOverdueExpenseSweep.mock.calls.at(-1)?.[2]).toBe(
      '2026-08-31',
    );

    await act(async () => vi.advanceTimersByTime(100));

    expect(mocks.useExpenseTriageCounts).toHaveBeenLastCalledWith(
      { branchId: undefined },
      true,
      '2026-09-01',
    );
    expect(mocks.useOverdueExpenseSweep.mock.calls.at(-1)?.[2]).toBe(
      '2026-09-01',
    );
  });

  it('recalculates midnight after a same-day backward clock adjustment and focus', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-31T18:00:00.000Z'));
    authState.dynamicDay = true;
    const today = vi.mocked(tashkentTodayCalendarDate);

    await renderPage();
    expect(mocks.useExpenseTriageCounts).toHaveBeenLastCalledWith(
      { branchId: undefined },
      true,
      '2026-08-31',
    );

    vi.setSystemTime(new Date('2026-08-31T17:00:00.000Z'));
    fireEvent.focus(window);
    today.mockClear();

    await act(async () => vi.advanceTimersByTime(60 * 60 * 1000));

    expect(today).not.toHaveBeenCalled();
    expect(mocks.useExpenseTriageCounts).toHaveBeenLastCalledWith(
      { branchId: undefined },
      true,
      '2026-08-31',
    );

    await act(async () => vi.advanceTimersByTime(60 * 60 * 1000));

    expect(mocks.useExpenseTriageCounts).toHaveBeenLastCalledWith(
      { branchId: undefined },
      true,
      '2026-09-01',
    );
  });

  it('cleans up the midnight timeout and day-resync listeners on unmount', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-31T18:59:59.900Z'));
    authState.dynamicDay = true;
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const removeWindowListenerSpy = vi.spyOn(window, 'removeEventListener');
    const removeDocumentListenerSpy = vi.spyOn(document, 'removeEventListener');

    const rendered = await renderPage();
    rendered.unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(removeWindowListenerSpy).toHaveBeenCalledWith(
      'focus',
      expect.any(Function),
    );
    expect(removeDocumentListenerSpy).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
  });

  it('re-arms a dismissed brief at Tashkent midnight without focus or visibility events', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-31T18:59:59.900Z'));
    authState.dynamicDay = true;

    await renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.daily_brief.dismiss' }),
    );
    expect(
      screen.queryByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).not.toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(100));

    expect(
      screen.getByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).toBeInTheDocument();
    expect(mocks.useOverdueExpenseSweep.mock.calls.at(-1)?.[2]).toBe(
      '2026-09-01',
    );
  });

  it('fails open for malformed/throwing reads and hides after a throwing write', async () => {
    const first = await renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.daily_brief.dismiss' }),
    );
    const key = localStorage.key(0)!;
    first.unmount();
    localStorage.setItem(key, 'malformed');

    const malformed = await renderPage();
    expect(
      screen.getByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).toBeInTheDocument();
    malformed.unmount();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    const throwingRead = await renderPage();
    expect(
      screen.getByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).toBeInTheDocument();
    throwingRead.unmount();
    vi.restoreAllMocks();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    await renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.daily_brief.dismiss' }),
    );
    expect(
      screen.queryByRole('heading', { name: 'expenses.daily_brief.title' }),
    ).not.toBeInTheDocument();
  });

  it('does not write on mount and dismisses idempotently in StrictMode', async () => {
    const write = vi.spyOn(Storage.prototype, 'setItem');

    await renderPage('/expenses', true);
    expect(write).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.daily_brief.dismiss' }),
    );
    expect(write).toHaveBeenCalledOnce();
  });
});
