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
}));

vi.mock('@/hooks/useUrlParams', () => ({
  useUrlParams: () => ({
    searchParams: new URLSearchParams(queryState.search),
    setParams: vi.fn(),
    setSearchParams: vi.fn(),
  }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner' } }),
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
  LeadsFilterBar: ({ filters }: { filters: ListLeadsQuery }) => (
    <div data-testid="mock-leads-filter-bar">
      {filters.q || 'LeadsFilterBar'}
    </div>
  ),
}));

vi.mock('../components/LeadMetricsView', () => ({
  LeadMetricsView: () => <div data-testid="mock-lead-metrics">LeadMetrics</div>,
}));

vi.mock('../components/CreateLeadDialog', () => ({
  CreateLeadDialog: () => <div data-testid="mock-create-lead-dialog" />,
}));

describe('LeadsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState.search = '';
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
});
