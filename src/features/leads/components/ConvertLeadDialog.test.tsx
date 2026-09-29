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
});
