import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ImportStudentsModal from '@/components/ui/ImportStudentsModal';

vi.mock('@/store/authStore', () => ({
  // The modal reads role via useIsCrossTenant (owner||dev) → provide user.role.
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner' }, isOwner: () => true }),
}));

// autodrive-0d6: h.existingPhones drives the mocked check-phones response --
// individual tests set it before selecting a file.
const h = vi.hoisted(() => ({ existingPhones: [] as string[] }));

vi.mock('@/services/studentService', () => ({
  bulkCreateStudents: vi.fn(),
  useCheckStudentPhones: () => ({
    mutate: (
      _phones: string[],
      opts?: { onSuccess?: (res: { existing_phones: string[] }) => void },
    ) => {
      opts?.onSuccess?.({ existing_phones: h.existingPhones });
    },
  }),
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
const selectFile = (csv = 'a,b') => {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const file = new File([csv], 'students.csv', { type: 'text/csv' });
  fireEvent.change(input, { target: { files: [file] } });
};

const SAMPLE = `firstName,lastName,phone,courseType
John,Doe,+998901111111,tezkor
Jane,Smith,+998902222222,avto_maktab`;

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

// autodrive-0d6: client-side CSV preview + phone dedupe + per-row import
// errors (previously the modal only showed an aggregate success/error count).
describe('ImportStudentsModal — CSV preview, dedupe, and per-row errors', () => {
  beforeEach(() => {
    h.existingPhones = [];
  });

  it('parses the CSV on file-select and renders a preview row per line', async () => {
    renderModal('branch-1');
    selectFile(SAMPLE);

    expect(await screen.findByText('+998901111111')).toBeInTheDocument();
    expect(screen.getByText('+998902222222')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('flags a row missing a required field before upload', async () => {
    const csv = `firstName,lastName,phone,courseType
John,,+998901111111,tezkor`;
    renderModal('branch-1');
    selectFile(csv);

    expect(
      await screen.findByText('students.import.preview.error_missing'),
    ).toBeInTheDocument();
  });

  it('flags a row with an invalid courseType before upload', async () => {
    const csv = `firstName,lastName,phone,courseType
John,Doe,+998901111111,not_a_course`;
    renderModal('branch-1');
    selectFile(csv);

    expect(
      await screen.findByText('students.import.preview.error_course_type'),
    ).toBeInTheDocument();
  });

  it('shows a dismissible, non-blocking duplicate warning when a phone matches an existing student', async () => {
    h.existingPhones = ['+998901111111'];
    renderModal('branch-1');
    selectFile(SAMPLE);

    expect(
      await screen.findByText('students.import.duplicate_warning.title'),
    ).toBeInTheDocument();
    // Non-blocking -- upload stays enabled.
    expect(
      screen.getByRole('button', { name: /students\.import\.upload_button/ }),
    ).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText('common.close'));
    expect(
      screen.queryByText('students.import.duplicate_warning.title'),
    ).toBeNull();
  });

  it('renders per-row import errors from a partial-failure bulk-create response', async () => {
    const { bulkCreateStudents } = await import('@/services/studentService');
    vi.mocked(bulkCreateStudents).mockResolvedValue({
      data: {
        successCount: 1,
        errorCount: 1,
        errors: [
          {
            row: 2,
            data: {
              firstName: 'Jane',
              lastName: '',
              phone: '',
              courseType: '',
            },
            error:
              'Missing required fields (firstName, lastName, phone, courseType)',
          },
        ],
      },
    });

    renderModal('branch-1');
    selectFile(SAMPLE);
    await screen.findByText('+998901111111');

    fireEvent.click(
      screen.getByRole('button', { name: /students\.import\.upload_button/ }),
    );

    expect(
      await screen.findByText('students.import.errors.title'),
    ).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Missing required fields (firstName, lastName, phone, courseType)',
      ),
    ).toBeInTheDocument();
  });
});
