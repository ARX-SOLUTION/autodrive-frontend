import * as React from 'react';
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeadsFilterBar } from './LeadsFilterBar';
import type { ListLeadsQuery } from '../types/leads.types';

const h = vi.hoisted(() => ({
  canViewAllBranches: true,
  onChange: vi.fn(),
  onClearAll: vi.fn(),
  exportLeads: vi.fn(),
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: (capability: string) =>
    capability === 'viewAllBranches' ? h.canViewAllBranches : false,
}));

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: () => ({
    data: [
      { id: 'branch-1', name: 'Chilonzor' },
      { id: 'branch-2', name: 'Yunusobod' },
    ],
  }),
}));

vi.mock('../queries/leadsQueries', () => ({
  useLeadStagesQuery: () => ({
    data: [
      {
        id: 'stage-1',
        companyId: 'company-1',
        name: 'New',
        kind: 'NEW',
        position: 1,
        color: '#2563eb',
        isSystem: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'stage-2',
        companyId: 'company-1',
        name: 'Follow-up',
        kind: 'WORK',
        position: 2,
        color: '#16a34a',
        isSystem: false,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  }),
}));

vi.mock('../api/leadsApi', () => ({
  leadsApi: {
    exportLeads: h.exportLeads,
  },
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: ReactNode;
  }) => {
    let label = 'select';
    const options: ReactNode[] = [];

    const visit = (node: ReactNode) => {
      if (!node || typeof node !== 'object' || !('type' in node)) return;
      const el = node as React.ReactElement<{
        children?: ReactNode;
        value?: string;
        'aria-label'?: string;
      }>;
      if (el.type === SelectTrigger) label = el.props['aria-label'] ?? label;
      if (el.type === SelectItem && el.props.value) {
        options.push(
          <option key={el.props.value} value={el.props.value}>
            {el.props.children}
          </option>,
        );
      }
      if (el.props.children) {
        React.Children.forEach(el.props.children, visit);
      }
    };

    React.Children.forEach(children, visit);

    return (
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {options}
      </select>
    );
  },
  SelectTrigger,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem,
}));

function SelectTrigger({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function SelectItem({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const renderBar = (
  filters: ListLeadsQuery = {},
  props: { isBoardView?: boolean } = {},
) =>
  render(
    <LeadsFilterBar
      filters={filters}
      onChange={h.onChange}
      onClearAll={h.onClearAll}
      {...props}
    />,
  );

beforeEach(() => {
  h.canViewAllBranches = true;
  h.onChange.mockClear();
  h.onClearAll.mockClear();
  h.exportLeads.mockReset().mockResolvedValue(undefined);
});

describe('LeadsFilterBar', () => {
  it('counts real filters in the badge while keeping search as a chip', () => {
    renderBar({
      q: 'ali',
      branch_id: 'branch-1',
      stage_id: 'stage-1',
      source: 'telegram',
      category: 'B',
      assigned_to_me: false,
      overdue_only: false,
      course_type: 'tezkor',
      assignee_user_id: 'user-1',
      has_task: true,
      period: '30d',
      tab: 'won',
    });

    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    expect(
      screen.queryByTestId('active-filter-chip-has_task'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('active-filter-chip-q')).toHaveTextContent('ali');
    expect(
      screen.queryByTestId('active-filter-chip-assigned_to_me'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('active-filter-chip-overdue_only'),
    ).not.toBeInTheDocument();
  });

  it('changes primary filters immediately', () => {
    renderBar({ stage_id: 'stage-1' });

    fireEvent.change(screen.getAllByLabelText('leads.stage')[0], {
      target: { value: 'stage-2' },
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'leads.assigned_to_me' })[0],
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: 'leads.overdue_tasks' })[0],
    );

    expect(h.onChange).toHaveBeenNthCalledWith(1, { stage_id: 'stage-2' });
    expect(h.onChange).toHaveBeenNthCalledWith(2, { assigned_to_me: true });
    expect(h.onChange).toHaveBeenNthCalledWith(3, { overdue_only: true });
  });

  it('changes nested filters, removes chips, clears all, and exports the same filters prop', async () => {
    const filters: ListLeadsQuery = {
      q: 'ali',
      source: 'telegram',
      category: 'B',
      assigned_to_me: true,
    };
    renderBar(filters);

    fireEvent.change(screen.getByLabelText('leads.source'), {
      target: { value: 'instagram' },
    });
    fireEvent.click(
      screen.getByTestId('active-filter-chip-source').querySelector('button')!,
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.clear_all' }));
    const exportButtons = screen.getAllByRole('button', {
      name: 'leads.export_csv',
    });
    expect(exportButtons).toHaveLength(2);
    exportButtons.forEach((button) => fireEvent.click(button));

    expect(h.onChange).toHaveBeenNthCalledWith(1, { source: 'instagram' });
    expect(h.onChange).toHaveBeenNthCalledWith(2, { source: undefined });
    expect(h.onClearAll).toHaveBeenCalledTimes(1);
    expect(h.exportLeads).toHaveBeenCalledWith(filters);
    expect(h.exportLeads).toHaveBeenCalledTimes(2);
  });

  it('hides branch chip and branch controls without viewAllBranches', () => {
    h.canViewAllBranches = false;
    renderBar({ q: 'ali', branch_id: 'branch-1' });

    expect(
      screen.queryByTestId('active-filter-chip-branch_id'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('common.branch')).not.toBeInTheDocument();
  });

  it('does not show the legacy tab chip or count it while board view is active', () => {
    renderBar({ tab: 'won' }, { isBoardView: true });

    expect(
      screen.queryByTestId('active-filter-chip-tab'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('still shows and counts the tab chip outside board view', () => {
    renderBar({ tab: 'won' });

    expect(screen.getByTestId('active-filter-chip-tab')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });
});
