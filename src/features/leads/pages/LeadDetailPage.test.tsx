import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { LeadDetailPage } from './LeadDetailPage';
import type { Lead } from '../types/leads.types';

const mockLead: Lead = {
  id: 'lead-1',
  companyId: 'comp-1',
  branchId: 'branch-1',
  branchName: 'Chilonzor',
  firstName: 'Javohir',
  lastName: 'Tursunov',
  phone: '+998901234567',
  email: 'javohir@example.com',
  courseType: 'tezkor',
  category: 'B',
  source: 'telegram',
  sourceOther: null,
  referrerStudentId: null,
  referrerStaffId: null,
  desiredGroupId: null,
  assigneeUserId: null,
  stageId: 'stage-1',
  stage: {
    id: 'stage-1',
    companyId: 'comp-1',
    name: 'Yangi lid',
    kind: 'NEW',
    position: 0,
    color: '#3b82f6',
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  stageEnteredAt: '2026-01-01',
  nextStepAt: null,
  lastTouchAt: '2026-01-01',
  marketingConsent: true,
  note: 'Telegramdan murojaat qildi',
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

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ id: 'lead-1' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('../queries/leadsQueries', () => ({
  useLeadDetailQuery: () => ({
    data: mockLead,
    isLoading: false,
  }),
  useLeadActivitiesQuery: () => ({
    data: [],
    isLoading: false,
  }),
  useLeadStagesQuery: () => ({
    data: [
      { id: 'stage-1', name: 'Yangi lid', kind: 'NEW', color: '#3b82f6' },
      { id: 'stage-2', name: 'Aloqa qilindi', kind: 'WORK', color: '#eab308' },
    ],
    isLoading: false,
  }),
  useStageTransitionMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateLeadMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteLeadMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useConvertLeadMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useAssignLeadMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCreateActivityMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateActivityMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteActivityMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/staff/api/operatorService', () => ({
  useOperators: () => ({
    data: [{ id: 'op-1', name: 'Operator 1' }],
  }),
}));

vi.mock('@/features/staff/api/teacherService', () => ({
  useTeachers: () => ({
    data: [],
  }),
}));

vi.mock('@/features/students/api/studentService', () => ({
  useStudents: () => ({
    data: [],
  }),
}));

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: () => ({
    data: [{ id: 'branch-1', name: 'Chilonzor' }],
  }),
}));

describe('LeadDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('renders lead header and info card', () => {
    render(<LeadDetailPage />);

    expect(screen.getByText(/javohir tursunov/i)).toBeInTheDocument();
    expect(screen.getAllByText('Chilonzor').length).toBeGreaterThan(0);
    expect(screen.getByText('Telegramdan murojaat qildi')).toBeInTheDocument();
  });

  it('opens convert dialog when clicking convert button', () => {
    render(<LeadDetailPage />);

    const convertBtn = screen.getByRole('button', {
      name: /leads.convert_to_student/i,
    });
    fireEvent.click(convertBtn);

    expect(
      screen.getByRole('heading', { name: 'leads.convert_to_student' }),
    ).toBeInTheDocument();
  });

  it('opens delete confirmation when clicking delete button', () => {
    render(<LeadDetailPage />);

    const deleteBtn = screen.getByRole('button', {
      name: /leads.delete_lead/i,
    });
    fireEvent.click(deleteBtn);

    expect(
      screen.getByRole('heading', { name: /leads.delete_confirm_title/i }),
    ).toBeInTheDocument();
  });
});
