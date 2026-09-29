import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { LeadsTable } from './LeadsTable';
import type { Lead } from '../types/leads.types';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    companyId: 'comp-1',
    branchId: 'branch-1',
    branchName: 'Chilonzor',
    firstName: 'Anvar',
    lastName: 'Qosimov',
    phone: '+998901234567',
    email: null,
    courseType: 'tezkor',
    category: 'B',
    source: 'telegram',
    sourceOther: null,
    referrerStudentId: null,
    referrerStaffId: null,
    desiredGroupId: null,
    assigneeUserId: 'u-1',
    assigneeName: 'Jamshid',
    stageId: 's-1',
    stage: {
      id: 's-1',
      companyId: 'comp-1',
      name: 'Yangi lid',
      kind: 'NEW',
      position: 0,
      color: '#3b82f6',
      isSystem: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    stageEnteredAt: '2026-01-01',
    nextStepAt: '2026-01-02T10:00:00Z',
    lastTouchAt: '2026-01-01',
    marketingConsent: true,
    note: 'Qiziqmoqda',
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
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z',
  },
];

describe('LeadsTable', () => {
  afterEach(cleanup);

  it('renders lead row with name, phone, branch, and stage', () => {
    render(
      <LeadsTable
        leads={mockLeads}
        isLoading={false}
        currentPage={1}
        pageSize={20}
        totalLeads={1}
        totalPages={1}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Anvar Qosimov')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Chilonzor')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Yangi lid')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Jamshid')[0]).toBeInTheDocument();
  });

  it('triggers onOpenLead when row is clicked', () => {
    const handleOpen = vi.fn();
    render(
      <LeadsTable
        leads={mockLeads}
        isLoading={false}
        currentPage={1}
        pageSize={20}
        totalLeads={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onOpenLead={handleOpen}
      />,
    );

    const nameCell = screen.getAllByText('Anvar Qosimov')[0];
    fireEvent.click(nameCell);

    expect(handleOpen).toHaveBeenCalledWith(mockLeads[0]);
  });

  it('renders empty state when there are no leads', () => {
    render(
      <LeadsTable
        leads={[]}
        isLoading={false}
        currentPage={1}
        pageSize={20}
        totalLeads={0}
        totalPages={1}
        onPageChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'leads.no_leads' }),
    ).toBeInTheDocument();
  });
});
