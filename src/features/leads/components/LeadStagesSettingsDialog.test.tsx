import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { LeadStagesSettingsDialog } from './LeadStagesSettingsDialog';
import type { LeadStage } from '../types/leads.types';

const mockMutateAsync = vi.fn();

const mockStages: LeadStage[] = [
  {
    id: 'stage-new',
    companyId: 'comp-1',
    name: 'Yangi lid',
    kind: 'NEW',
    position: 0,
    color: '#3B82F6',
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'stage-work-1',
    companyId: 'comp-1',
    name: 'Bog‘lanildi',
    kind: 'WORK',
    position: 1,
    color: '#F59E0B',
    isSystem: false,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'stage-work-2',
    companyId: 'comp-1',
    name: 'Sinov darsi',
    kind: 'WORK',
    position: 2,
    color: '#8B5CF6',
    isSystem: false,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'stage-won',
    companyId: 'comp-1',
    name: 'O‘quvchiga aylandi',
    kind: 'WON',
    position: 3,
    color: '#10B981',
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'stage-lost',
    companyId: 'comp-1',
    name: 'Yo‘qotildi',
    kind: 'LOST',
    position: 4,
    color: '#EF4444',
    isSystem: true,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

vi.mock('../queries/leadsQueries', () => ({
  useLeadStagesQuery: () => ({
    data: mockStages,
    isLoading: false,
  }),
  useUpdateLeadStagesMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LeadStagesSettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all stages when open is true', () => {
    render(<LeadStagesSettingsDialog open={true} onOpenChange={vi.fn()} />);

    // System stages rendered
    expect(screen.getByText('Yangi lid')).toBeInTheDocument();
    expect(screen.getByText('O‘quvchiga aylandi')).toBeInTheDocument();
    expect(screen.getByText('Yo‘qotildi')).toBeInTheDocument();

    // Work stages rendered
    expect(screen.getByDisplayValue('Bog‘lanildi')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sinov darsi')).toBeInTheDocument();
  });

  it('allows reordering work stages using move up/down buttons', () => {
    render(<LeadStagesSettingsDialog open={true} onOpenChange={vi.fn()} />);

    const moveDownButtons = screen.getAllByRole('button', {
      name: /leads\.move_down|pastga surish|move down/i,
    });
    expect(moveDownButtons.length).toBeGreaterThan(0);

    // Click move down on first work stage
    fireEvent.click(moveDownButtons[0]);

    // Stage order updated
    const inputs = screen.getAllByRole('textbox');
    expect((inputs[0] as HTMLInputElement).value).toBe('Sinov darsi');
    expect((inputs[1] as HTMLInputElement).value).toBe('Bog‘lanildi');
  });

  it('allows adding a new stage when active count is below limit', () => {
    render(<LeadStagesSettingsDialog open={true} onOpenChange={vi.fn()} />);

    const addBtn = screen.getByRole('button', {
      name: /leads\.add_stage|bosqich qo'shish|add stage/i,
    });
    fireEvent.click(addBtn);

    // There should now be 3 work stage textboxes
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBe(3);
    expect((inputs[2] as HTMLInputElement).value).toBe('');
  });

  it('submits updated stages payload on Save', async () => {
    const handleOpenChange = vi.fn();
    mockMutateAsync.mockResolvedValueOnce([]);

    render(
      <LeadStagesSettingsDialog open={true} onOpenChange={handleOpenChange} />,
    );

    const saveBtn = screen.getByRole('button', {
      name: /common\.save|saqlash|save/i,
    });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const callPayload = mockMutateAsync.mock.calls[0][0];
    expect(callPayload.stages).toHaveLength(2);
    expect(callPayload.stages[0].name).toBe('Bog‘lanildi');
    expect(callPayload.stages[1].name).toBe('Sinov darsi');
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
