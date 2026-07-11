import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BranchesPage from '@/pages/BranchesPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Branch } from '@/types/branch';

// Mock branchService
const mockMutate = vi.fn();
let mockBranchesData: Branch[] = [];

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      canManageBranches: () => true,
    }),
}));

vi.mock('@/services/branchService', () => {
  return {
    useBranches: () => ({
      data: mockBranchesData,
      isLoading: false,
    }),
    useCreateBranch: () => ({
      mutate: mockMutate,
      isPending: false,
    }),
    useUpdateBranch: () => ({
      mutate: mockMutate,
      isPending: false,
    }),
    useDeleteBranch: () => ({
      mutate: mockMutate,
      isPending: false,
    }),
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BranchesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('BranchesPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBranchesData = [
      {
        id: 'branch-1',
        name: 'Test Branch 1',
        location: 'Test Location 1',
        phone: '+998901234567',
        manager_name: 'Test Manager 1',
        active_students: 10,
        created_at: '2026-06-28T00:00:00Z',
      },
    ];
  });

  it('should render branches and display their phone numbers', () => {
    renderComponent();

    // Verify branch details are displayed on the screen
    expect(screen.getAllByText('Test Branch 1')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Test Location 1')[0]).toBeInTheDocument();
    expect(screen.getAllByText('+998901234567')[0]).toBeInTheDocument();
  });

  it('should open edit modal and pre-fill phone number', () => {
    renderComponent();

    // Find and click the edit button (first Pencil icon)
    const editButtons = screen.getAllByLabelText('common.edit');
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);

    // Verify edit dialog title is in the document
    expect(screen.getByText('branches.edit')).toBeInTheDocument();

    // The inputs should contain the prefilled values
    const nameInput = screen.getByDisplayValue(
      'Test Branch 1',
    ) as HTMLInputElement;
    const addressInput = screen.getByPlaceholderText(
      'branches.address',
    ) as HTMLInputElement;
    const phoneInput = screen.getByPlaceholderText(
      '+998...',
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('Test Branch 1');
    expect(addressInput.value).toBe('Test Location 1');
    expect(phoneInput.value).toBe('+998901234567');
  });

  // autodrive-6ef.19: card navigates to branch detail; edit/delete buttons
  // stopPropagation so they don't also trigger navigation.
  it('navigates to the detail page when a card is clicked, but not via the edit button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/branches']}>
          <Routes>
            <Route path="/branches" element={<BranchesPage />} />
            <Route
              path="/branches/:id"
              element={<div>branch-detail-page</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getAllByLabelText('common.edit')[0]);
    expect(screen.queryByText('branch-detail-page')).toBeNull();

    fireEvent.click(screen.getAllByText('Test Branch 1')[0]);
    expect(screen.getByText('branch-detail-page')).toBeTruthy();
  });
});
