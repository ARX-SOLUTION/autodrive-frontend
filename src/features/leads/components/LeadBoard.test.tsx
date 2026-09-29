import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { LeadBoard } from './LeadBoard';
import type { LeadBoardColumn, LeadStage } from '../types/leads.types';

const mockMutate = vi.fn();
vi.mock('../queries/leadsQueries', () => ({
  useStageTransitionMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

const mockStages: LeadStage[] = [
  {
    id: 'stage-new',
    companyId: 'comp-1',
    name: 'Yangi lid',
    kind: 'NEW',
    position: 0,
    color: '#3b82f6',
    isSystem: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'stage-contacted',
    companyId: 'comp-1',
    name: 'Aloqa qilindi',
    kind: 'WORK',
    position: 1,
    color: '#eab308',
    isSystem: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'stage-lost',
    companyId: 'comp-1',
    name: 'Yo‘qotildi',
    kind: 'LOST',
    position: 2,
    color: '#ef4444',
    isSystem: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockColumns: LeadBoardColumn[] = [
  {
    stage: mockStages[0],
    count: 1,
    leads: [
      {
        id: 'lead-1',
        firstName: 'Ali',
        lastName: 'Valiyev',
        phone: '+998901234567',
        branchId: 'b-1',
        branchName: 'Chilonzor',
        source: 'telegram',
        category: 'B',
        assigneeUserId: 'u-1',
        assigneeName: 'Admin',
        stageId: 'stage-new',
        nextStepAt: null,
        lastTouchAt: '2026-01-01',
        version: 1,
        createdAt: '2026-01-01',
      },
    ],
  },
  {
    stage: mockStages[1],
    count: 0,
    leads: [],
  },
  {
    stage: mockStages[2],
    count: 0,
    leads: [],
  },
];

describe('LeadBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('renders all kanban columns with counts', () => {
    render(<LeadBoard columns={mockColumns} />);

    expect(screen.getByText('Yangi lid')).toBeInTheDocument();
    expect(screen.getByText('Aloqa qilindi')).toBeInTheDocument();
    expect(screen.getByText('Yo‘qotildi')).toBeInTheDocument();
    expect(screen.getByText(/Ali/i)).toBeInTheDocument();
  });

  it('calls onAddLeadClick when clicking plus button on NEW stage', () => {
    const handleAdd = vi.fn();
    render(<LeadBoard columns={mockColumns} onAddLeadClick={handleAdd} />);

    const addButton = screen.getByLabelText(/leads.create_lead/i);
    expect(addButton).toBeInTheDocument();
    fireEvent.click(addButton);

    expect(handleAdd).toHaveBeenCalledWith('stage-new');
  });

  it('handles drop to transition lead to another stage', () => {
    render(<LeadBoard columns={mockColumns} />);

    const targetCol = screen.getByTestId('kanban-column-stage-contacted');

    const dragData = JSON.stringify({
      id: 'lead-1',
      currentStageId: 'stage-new',
      version: 1,
    });

    fireEvent.drop(targetCol, {
      dataTransfer: {
        getData: (format: string) =>
          format === 'application/json' ? dragData : '',
      },
    });

    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: 'lead-1',
        payload: {
          stageId: 'stage-contacted',
          version: 1,
        },
      },
      expect.any(Object),
    );
  });

  it('opens LeadLostDialog when dropping onto LOST stage', async () => {
    render(<LeadBoard columns={mockColumns} />);

    const lostCol = screen.getByTestId('kanban-column-stage-lost');

    const dragData = JSON.stringify({
      id: 'lead-1',
      currentStageId: 'stage-new',
      version: 1,
    });

    fireEvent.drop(lostCol, {
      dataTransfer: {
        getData: (format: string) =>
          format === 'application/json' ? dragData : '',
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
