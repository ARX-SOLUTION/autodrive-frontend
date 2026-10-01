import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { LeadsPage } from './LeadsPage';
import type { ListLeadsQuery } from '../types/leads.types';

const queryState = vi.hoisted(() => ({
  search: '',
  board: vi.fn(),
  list: vi.fn(),
  metrics: vi.fn(),
  filterBar: vi.fn(),
  setParams: vi.fn(),
  setSearchParams: vi.fn(),
  user: { role: 'owner', branch_id: undefined as string | undefined },
}));

vi.mock('@/hooks/useUrlParams', () => ({
  useUrlParams: () => ({
    searchParams: new URLSearchParams(queryState.search),
    setParams: queryState.setParams,
    setSearchParams: queryState.setSearchParams,
  }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: queryState.user }),
}));

const mockStages = [
  {
    id: 's-1',
    name: 'Yangi lid',
    kind: 'NEW',
    color: '#3b82f6',
    isSystem: true,
    isActive: true,
  },
  {
    id: 's-2',
    name: 'Aloqa',
    kind: 'WORK',
    color: '#eab308',
    isSystem: false,
    isActive: true,
  },
];
const mockBoard: unknown[] = [];
const mockListData = { items: [], total: 0 };
const mockMetrics = null;

vi.mock('../queries/leadsQueries', () => ({
  useLeadStagesQuery: () => ({
    data: mockStages,
    isLoading: false,
  }),
  useLeadBoardQuery: (query: ListLeadsQuery) => {
    queryState.board(query);
    return { data: mockBoard, isLoading: false, isFetching: false };
  },
  useLeadsQuery: (query: ListLeadsQuery) => {
    queryState.list(query);
    return {
      data: mockListData,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
  useLeadMetricsQuery: () => ({
    data: mockMetrics,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateLeadStagesMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateLeadMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useLeadSourcesQuery: () => ({
    data: [],
    isLoading: false,
  }),
  useCreateLeadSourceMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteLeadSourceMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: () => ({
    data: [{ id: 'branch-1', name: 'Chilonzor' }],
  }),
}));

vi.mock('../components/LeadBoard', () => ({
  LeadBoard: () => <div data-testid="mock-lead-board">LeadBoard</div>,
}));

vi.mock('../components/LeadsTable', () => ({
  LeadsTable: () => <div data-testid="mock-leads-table">LeadsTable</div>,
}));

vi.mock('../components/LeadsFilterBar', () => ({
  LeadsFilterBar: ({
    filters,
    isBoardView,
    onClearAll,
  }: {
    filters: ListLeadsQuery;
    isBoardView: boolean;
    onClearAll: () => void;
  }) => {
    queryState.filterBar({ filters, isBoardView });
    return (
      <div data-testid="mock-leads-filter-bar">
        {filters.q || 'LeadsFilterBar'}
        <button type="button" onClick={onClearAll}>
          clear all
        </button>
      </div>
    );
  },
}));

vi.mock('../components/LeadMetricsView', () => ({
  LeadMetricsView: (props: { branchId?: string; period?: string }) => {
    queryState.metrics(props);
    return <div data-testid="mock-lead-metrics">LeadMetrics</div>;
  },
}));

vi.mock('../components/CreateLeadDialog', () => ({
  CreateLeadDialog: () => <div data-testid="mock-create-lead-dialog" />,
}));

describe('LeadsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState.search = '';
    queryState.user = { role: 'owner', branch_id: undefined };
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders page header and configure stages button for owner', () => {
    render(<LeadsPage />);

    // Page header title
    expect(screen.getByText('leads.title')).toBeInTheDocument();

    // Configure stages button is present
    const settingsBtn = screen.getByRole('button', {
      name: /leads\.manage_stages/i,
    });
    expect(settingsBtn).toBeInTheDocument();
    expect(queryState.filterBar.mock.lastCall?.[0].isBoardView).toBe(true);
  });

  it('opens stage settings dialog when configure stages button is clicked', () => {
    render(<LeadsPage />);

    const settingsBtn = screen.getByRole('button', {
      name: /leads\.manage_stages/i,
    });
    fireEvent.click(settingsBtn);

    // Dialog title should now be in the document
    expect(screen.getAllByText('leads.manage_stages').length).toBeGreaterThan(
      1,
    );
  });

  it('debounces only the requested search while updating the input and branch immediately', () => {
    vi.useFakeTimers();
    const { rerender } = render(<LeadsPage />);
    queryState.search = 'q=A';
    rerender(<LeadsPage />);
    act(() => vi.advanceTimersByTime(150));
    queryState.search = 'q=Aziz';
    rerender(<LeadsPage />);

    expect(screen.getByTestId('mock-leads-filter-bar')).toHaveTextContent(
      'Aziz',
    );
    expect(queryState.board.mock.lastCall?.[0].q).toBeUndefined();
    expect(queryState.list.mock.lastCall?.[0].q).toBeUndefined();
    act(() => vi.advanceTimersByTime(299));
    queryState.search = 'q=Aziz&branch_id=branch-b';
    rerender(<LeadsPage />);
    expect(queryState.board.mock.lastCall?.[0]).toMatchObject({
      branch_id: 'branch-b',
      q: undefined,
    });

    act(() => vi.advanceTimersByTime(1));
    expect(queryState.board.mock.lastCall?.[0]).toMatchObject({
      branch_id: 'branch-b',
      q: 'Aziz',
    });
    expect(queryState.list.mock.lastCall?.[0].q).toBe('Aziz');
  });

  it('ignores tab filters on board while keeping them on list', () => {
    queryState.search = 'tab=won';

    const { rerender } = render(<LeadsPage />);

    expect(queryState.filterBar.mock.lastCall?.[0].filters.tab).toBeUndefined();
    expect(queryState.board.mock.lastCall?.[0].tab).toBeUndefined();

    queryState.search = 'tab=won&view=list';
    rerender(<LeadsPage />);

    expect(queryState.filterBar.mock.lastCall?.[0].filters.tab).toBe('won');
    expect(queryState.list.mock.lastCall?.[0].tab).toBe('won');
  });

  it('clears only lead filter params in one URL update', () => {
    queryState.search =
      'q=Aziz&branch_id=branch-b&stage_id=s-1&source=telegram&course_type=tezkor&category=B&assigned_to_me=true&assignee_user_id=user-1&overdue_only=true&has_task=true&period=7d&tab=new&page=4&view=list&limit=50&company_id=company-1';

    render(<LeadsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'clear all' }));

    expect(queryState.setSearchParams).toHaveBeenCalledTimes(1);
    expect(queryState.filterBar.mock.lastCall?.[0].isBoardView).toBe(false);
    const [updater, options] = queryState.setSearchParams.mock.lastCall ?? [];
    expect(options).toEqual({ replace: true });
    const next = updater(new URLSearchParams(queryState.search));

    expect(next.toString()).toBe('view=list&limit=50&company_id=company-1');
  });

  it.each(['manager', 'operator'])(
    'uses the signed-in branch for %s users',
    (role) => {
      queryState.user = { role, branch_id: `branch-${role}` };
      queryState.search = 'branch_id=branch-url&view=metrics';

      render(<LeadsPage />);

      expect(queryState.board.mock.lastCall?.[0].branch_id).toBe(
        `branch-${role}`,
      );
      expect(queryState.list.mock.lastCall?.[0].branch_id).toBe(
        `branch-${role}`,
      );
      expect(queryState.metrics.mock.lastCall?.[0].branchId).toBe(
        `branch-${role}`,
      );
    },
  );

  it('lets owners use an explicit branch from the URL', () => {
    queryState.user = { role: 'owner', branch_id: 'branch-owner' };
    queryState.search = 'branch_id=branch-url&view=metrics';

    render(<LeadsPage />);

    expect(queryState.board.mock.lastCall?.[0].branch_id).toBe('branch-url');
    expect(queryState.list.mock.lastCall?.[0].branch_id).toBe('branch-url');
    expect(queryState.metrics.mock.lastCall?.[0].branchId).toBe('branch-url');
  });
});
