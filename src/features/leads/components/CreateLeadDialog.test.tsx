import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CreateLeadDialog } from './CreateLeadDialog';
import { leadsApi } from '../api/leadsApi';

const mockCreateMutate = vi.fn();
vi.mock('../queries/leadsQueries', () => ({
  useCreateLeadMutation: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useLeadStagesQuery: () => ({
    data: [
      { id: 'stage-1', name: 'Yangi', kind: 'NEW', color: '#3b82f6' },
      { id: 'stage-2', name: 'Aloqa', kind: 'WORK', color: '#eab308' },
    ],
  }),
}));

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: () => ({
    data: [{ id: 'branch-1', name: 'Chilonzor' }],
  }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', branch_id: 'branch-1' } }),
}));

describe('CreateLeadDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('renders form fields when dialog is open', () => {
    render(<CreateLeadDialog open={true} onOpenChange={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'leads.create_lead' }),
    ).toBeInTheDocument();
    expect(document.getElementById('lead-first-name')).toBeInTheDocument();
    expect(document.getElementById('lead-phone')).toBeInTheDocument();
  });

  it('checks for duplicate phone and shows warning', async () => {
    vi.spyOn(leadsApi, 'checkDuplicate').mockResolvedValueOnce({
      hasDuplicate: true,
      duplicateLead: {
        id: 'dup-1',
        firstName: 'Bobur',
        lastName: 'Karimov',
        stageName: 'Yangi',
        branchName: 'Chilonzor',
      },
      duplicateStudent: null,
    });

    render(<CreateLeadDialog open={true} onOpenChange={vi.fn()} />);

    const phoneInput = document.getElementById(
      'lead-phone',
    ) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '+998901234567' } });

    await waitFor(() => {
      expect(screen.getByText(/leads.duplicate_detected/i)).toBeInTheDocument();
      expect(
        screen.getByText(/leads.duplicate_lead_warning/i),
      ).toBeInTheDocument();
    });
  });

  it('submits valid lead data', async () => {
    vi.spyOn(leadsApi, 'checkDuplicate').mockResolvedValueOnce({
      hasDuplicate: false,
    });

    render(<CreateLeadDialog open={true} onOpenChange={vi.fn()} />);

    const nameInput = document.getElementById(
      'lead-first-name',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Sardor' } });

    const phoneInput = document.getElementById(
      'lead-phone',
    ) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '+998901112233' } });

    const submitBtn = screen.getByRole('button', { name: /common.save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Sardor',
          phone: '+998901112233',
          branchId: 'branch-1',
        }),
        expect.any(Object),
      );
    });
  });
});
