import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BranchesPage from '@/pages/BranchesPage';
import { branchDeleteDescArgs } from '@/pages/branchDeleteDescArgs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Branch } from '@/types/branch';

// Mock branchService
const mockMutate = vi.fn();
let mockBranchesData: Branch[] = [];

const auth = vi.hoisted(() => ({ role: 'owner' as string }));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: { role: auth.role },
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
    useRestoreBranch: () => ({
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
    auth.role = 'owner';
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
      '+998 90 123 45 67',
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('Test Branch 1');
    expect(addressInput.value).toBe('Test Location 1');
    // Phone is now shown via the UZ input mask (formatUzPhoneInput).
    expect(phoneInput.value).toBe('+998 90 123 45 67');
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

  // autodrive-6cq.5.15: overlay/Escape used to call onOpenChange -> close
  // directly, silently discarding whatever the user had just typed.
  it('confirms before closing the edit dialog via Escape when the form is dirty', () => {
    renderComponent();

    fireEvent.click(screen.getAllByLabelText('common.edit')[0]);
    expect(screen.getByText('branches.edit')).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue(
      'Test Branch 1',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Changed Name' } });

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    // Still open, with a discard-changes confirm step surfaced instead of
    // a silent close.
    expect(screen.getByText('branches.edit')).toBeInTheDocument();
    expect(
      screen.getByText('common.discard_changes_title'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('common.discard'));
    expect(screen.queryByText('branches.edit')).toBeNull();
  });
});

// Regression test for autodrive-f9u.9: canManageBranches used to be an
// ad-hoc `role === 'owner'` check in authStore, excluding `dev` -- which
// permissions.ts documents as a strict superset of `owner`. Now derived
// from the same CAPABILITIES matrix via useCan('manageBranches').
describe('BranchesPage manage-branches capability (autodrive-f9u.9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBranchesData = [];
  });

  it('shows the Add button for dev (previously hidden)', () => {
    auth.role = 'dev';
    renderComponent();
    expect(screen.getAllByText('branches.add').length).toBeGreaterThan(0);
  });

  it('shows the Add button for owner', () => {
    auth.role = 'owner';
    renderComponent();
    expect(screen.getAllByText('branches.add').length).toBeGreaterThan(0);
  });

  it('hides the Add button for manager', () => {
    auth.role = 'manager';
    renderComponent();
    expect(screen.queryByText('branches.add')).not.toBeInTheDocument();
  });
});

// autodrive-cg9: branch delete really does cascade -- branches.service.ts
// remove() soft-deletes every student (plus staff/groups/schedules/lessons)
// scoped to the branch in the same transaction -- so active_students
// (already shown on the same card) is a genuine blast-radius count. Same
// rationale as groupDeleteDescArgs in groupsPage.test.tsx: the pure function
// is asserted directly because the suite's react-i18next mock drops
// interpolation options, so a rendered count is never observable via
// screen.getByText.
describe('branchDeleteDescArgs (autodrive-cg9)', () => {
  it('picks the with-students key and carries the real count for a branch with students', () => {
    expect(
      branchDeleteDescArgs({ name: 'Yunusobod', active_students: 7 }),
    ).toEqual({
      key: 'branches.confirm_delete_desc_with_students',
      options: { name: 'Yunusobod', count: 7 },
    });
  });

  it('picks the empty-branch key with no count for a branch with zero students', () => {
    expect(
      branchDeleteDescArgs({ name: 'Chilonzor', active_students: 0 }),
    ).toEqual({
      key: 'branches.confirm_delete_desc_empty',
      options: { name: 'Chilonzor' },
    });
  });

  it('returns undefined when the branch is not (yet) found', () => {
    expect(branchDeleteDescArgs(undefined)).toBeUndefined();
  });
});

describe('BranchesPage delete confirmation blast radius (autodrive-cg9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.role = 'owner';
  });

  it('renders the with-students copy key for a branch that has students', () => {
    mockBranchesData = [
      {
        id: 'branch-1',
        name: 'Test Branch 1',
        location: 'Test Location 1',
        active_students: 10,
        created_at: '2026-06-28T00:00:00Z',
      },
    ];
    renderComponent();
    fireEvent.click(screen.getAllByLabelText('common.delete')[0]);
    expect(
      screen.getByText('branches.confirm_delete_desc_with_students'),
    ).toBeTruthy();
    expect(screen.queryByText('branches.confirm_delete_desc_empty')).toBeNull();
  });

  it('renders the distinct empty-branch copy key for a branch with zero students', () => {
    mockBranchesData = [
      {
        id: 'branch-2',
        name: 'Empty Branch',
        location: 'Test Location 2',
        active_students: 0,
        created_at: '2026-06-28T00:00:00Z',
      },
    ];
    renderComponent();
    fireEvent.click(screen.getAllByLabelText('common.delete')[0]);
    expect(screen.getByText('branches.confirm_delete_desc_empty')).toBeTruthy();
    expect(
      screen.queryByText('branches.confirm_delete_desc_with_students'),
    ).toBeNull();
  });
});
