import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import ImportStudentsModal from '@/components/ui/ImportStudentsModal';

vi.mock('@/store/authStore', () => ({
  // The modal reads role via useIsCrossTenant (owner||dev) → provide user.role.
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner' }, isOwner: () => true }),
}));

vi.mock('@/services/studentService', () => ({
  bulkCreateStudents: vi.fn(),
}));

const renderModal = (branchId?: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ImportStudentsModal open onClose={() => {}} branchId={branchId} />
    </QueryClientProvider>,
  );
};

// Dialog content renders through a Radix Portal appended to document.body,
// not inside RTL's `container` — query the document instead.
const selectFile = () => {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const file = new File(['a,b'], 'students.csv', { type: 'text/csv' });
  fireEvent.change(input, { target: { files: [file] } });
};

// Regression test for autodrive-6cq.5.19: owner bulk-import used to fire
// without a branch_id, which the backend rejects with "Branch ID is
// required for bulk create". The modal now requires a branch up front.
describe('ImportStudentsModal — owner branch requirement', () => {
  it('disables upload and shows helper text when an owner has no branch selected', () => {
    renderModal(undefined);
    selectFile();

    expect(
      screen.getByRole('button', { name: /students\.import\.upload_button/ }),
    ).toBeDisabled();
    expect(
      screen.getByText('students.import.branch_required'),
    ).toBeInTheDocument();
  });

  it('enables upload once a branch is selected', () => {
    renderModal('branch-1');
    selectFile();

    expect(
      screen.getByRole('button', { name: /students\.import\.upload_button/ }),
    ).not.toBeDisabled();
    expect(
      screen.queryByText('students.import.branch_required'),
    ).not.toBeInTheDocument();
  });
});
