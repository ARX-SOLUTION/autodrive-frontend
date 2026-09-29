import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { LeadsPage } from './LeadsPage';

vi.mock('@/hooks/useUrlParams', () => ({
  useUrlParams: () => ({
    searchParams: new URLSearchParams(''),
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
  useLeadBoardQuery: () => ({
    data: mockBoard,
    isLoading: false,
  }),
  useLeadsQuery: () => ({
    data: mockListData,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
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
  LeadsFilterBar: () => (
    <div data-testid="mock-leads-filter-bar">LeadsFilterBar</div>
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
  });

  afterEach(() => {
    cleanup();
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
});
