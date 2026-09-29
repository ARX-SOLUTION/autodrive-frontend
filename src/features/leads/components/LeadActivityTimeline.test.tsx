import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { LeadActivityTimeline } from './LeadActivityTimeline';
import type { LeadActivity } from '../types/leads.types';

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('../queries/leadsQueries', () => ({
  useCreateActivityMutation: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateActivityMutation: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteActivityMutation: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

const mockActivities: LeadActivity[] = [
  {
    id: 'act-1',
    companyId: 'comp-1',
    branchId: 'branch-1',
    leadId: 'lead-1',
    kind: 'NOTE',
    body: 'Mijoz ertalab kelishini aytdi',
    dueAt: null,
    doneAt: null,
    authorUserId: 'u-1',
    authorName: 'Azizbek',
    meta: null,
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'act-2',
    companyId: 'comp-1',
    branchId: 'branch-1',
    leadId: 'lead-1',
    kind: 'TASK',
    body: 'Shartnoma loyihasini yuborish',
    dueAt: '2026-01-02T15:00:00Z',
    doneAt: null,
    authorUserId: 'u-1',
    authorName: 'Azizbek',
    meta: null,
    createdAt: '2026-01-01T11:00:00Z',
  },
];

describe('LeadActivityTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('renders timeline activities and authors', () => {
    render(
      <LeadActivityTimeline leadId="lead-1" activities={mockActivities} />,
    );

    expect(
      screen.getByText('Mijoz ertalab kelishini aytdi'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Shartnoma loyihasini yuborish'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Azizbek').length).toBeGreaterThan(0);
  });

  it('toggles task completion status', () => {
    render(
      <LeadActivityTimeline leadId="lead-1" activities={mockActivities} />,
    );

    const taskCheckbox = screen.getByRole('checkbox');
    fireEvent.click(taskCheckbox);

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: 'act-2',
        payload: expect.objectContaining({
          doneAt: expect.any(String),
        }),
      }),
      expect.any(Object),
    );
  });

  it('submits a new quick note', () => {
    render(
      <LeadActivityTimeline leadId="lead-1" activities={mockActivities} />,
    );

    const textarea = screen.getByPlaceholderText(/leads.note_placeholder/i);
    fireEvent.change(textarea, { target: { value: 'Yangi qayd matni' } });

    const submitBtn = screen.getByRole('button', {
      name: /leads.add_activity/i,
    });
    fireEvent.click(submitBtn);

    expect(mockCreateMutate).toHaveBeenCalledWith(
      {
        kind: 'NOTE',
        body: 'Yangi qayd matni',
        dueAt: undefined,
      },
      expect.any(Object),
    );
  });
});
