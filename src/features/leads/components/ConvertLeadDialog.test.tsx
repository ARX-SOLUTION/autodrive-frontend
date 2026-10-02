import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import type { Lead } from '../types/leads.types';

const mockConvertMutate = vi.fn();
vi.mock('../queries/leadsQueries', () => ({
  useConvertLeadMutation: () => ({
    mutate: mockConvertMutate,
    isPending: false,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

const mockLead: Lead = {
  id: 'lead-1',
  companyId: 'comp-1',
  branchId: 'branch-1',
  branchName: 'Chilonzor',
  firstName: 'Temur',
  lastName: 'Aliyev',
  phone: '+998901234567',
  email: 'temur@example.com',
  courseType: 'tezkor',
  category: 'B',
  source: 'telegram',
  sourceOther: null,
  referrerStudentId: null,
  referrerStaffId: null,
  desiredGroupId: null,
  assigneeUserId: null,
  stageId: 's-1',
  stageEnteredAt: '2026-01-01',
  nextStepAt: null,
  lastTouchAt: '2026-01-01',
  marketingConsent: true,
  note: null,
  lostReason: null,
  lostReasonOther: null,
  studentId: null,
  convertedAt: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  referrer: null,
  landing: null,
  version: 1,
  createdBy: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('ConvertLeadDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('renders lead details in confirmation modal', () => {
    render(
      <ConvertLeadDialog lead={mockLead} open={true} onOpenChange={vi.fn()} />,
    );

    expect(
      screen.getByRole('heading', { name: 'leads.convert_to_student' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Temur Aliyev')).toBeInTheDocument();
    expect(screen.getByText('Chilonzor')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('submits conversion mutation on confirm click', () => {
    render(
      <ConvertLeadDialog lead={mockLead} open={true} onOpenChange={vi.fn()} />,
    );

    const confirmBtn = screen.getByRole('button', {
      name: /leads.confirm_convert/i,
    });
    fireEvent.click(confirmBtn);

    expect(mockConvertMutate).toHaveBeenCalledWith(
      {
        id: 'lead-1',
        payload: { force: false },
      },
      expect.any(Object),
    );
  });

  it('links to the existing student only after an explicit choice', () => {
    mockConvertMutate.mockImplementationOnce((_vars, opts) =>
      opts.onError({
        response: {
          status: 409,
          data: { message: 'O‘quvchi allaqachon mavjud: Salim Vohidov' },
        },
      }),
    );
    render(
      <ConvertLeadDialog lead={mockLead} open={true} onOpenChange={vi.fn()} />,
    );
    const confirm = screen.getByRole('button', {
      name: /leads.confirm_convert/i,
    });
    fireEvent.click(confirm);

    expect(
      screen.getByText('O‘quvchi allaqachon mavjud: Salim Vohidov'),
    ).toBeInTheDocument();
    const choice = screen.getByRole('checkbox', {
      name: 'leads.force_convert',
    });
    expect(choice).toHaveAccessibleDescription('leads.force_convert_hint');
    expect(confirm).toBeDisabled();

    fireEvent.click(choice);
    fireEvent.click(confirm);
    expect(mockConvertMutate).toHaveBeenLastCalledWith(
      { id: 'lead-1', payload: { force: true } },
      expect.any(Object),
    );
  });

  it('drops the duplicate choice when the dialog closes or the lead changes', () => {
    mockConvertMutate.mockImplementation((_vars, opts) =>
      opts.onError({ response: { status: 409, data: {} } }),
    );
    const { rerender } = render(
      <ConvertLeadDialog lead={mockLead} open={true} onOpenChange={vi.fn()} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /leads.confirm_convert/i }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'leads.force_convert' }),
    );

    rerender(
      <ConvertLeadDialog lead={mockLead} open={false} onOpenChange={vi.fn()} />,
    );
    rerender(
      <ConvertLeadDialog
        lead={{ ...mockLead, id: 'lead-2' }}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    mockConvertMutate.mockReset();
    fireEvent.click(
      screen.getByRole('button', { name: /leads.confirm_convert/i }),
    );
    expect(mockConvertMutate).toHaveBeenCalledWith(
      { id: 'lead-2', payload: { force: false } },
      expect.any(Object),
    );
  });
});
