import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import GroupsPage from '@/pages/GroupsPage';
import type { Group, GroupOverview } from '@/types/group';

// Characterization tests for GroupsPage, written BEFORE decomposing the page
// into src/pages/groups/* — they pin the page's observable behavior:
// (1) rows/cards render from list data, (2) URL params drive the useGroups
// fetch params, (3) explicit empty state, (4) role gating (delete button +
// branch filter are owner/dev-side, teacher is pinned to own branch).

const h = vi.hoisted(() => ({
  auth: { role: 'owner', branch_id: null as string | null },
  groupsData: [] as unknown[],
  overviewData: [] as unknown[],
  useGroupsSpy: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: h.auth.role, branch_id: h.auth.branch_id } }),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: (params: unknown) => {
    h.useGroupsSpy(params);
    return {
      data: h.groupsData,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
  useGroupsOverview: () => ({ data: h.overviewData }),
  useCreateGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteGroup: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({
    data: [
      { id: 'b1', name: 'Yunusobod filiali' },
      { id: 'b2', name: 'Chilonzor filiali' },
    ],
    isLoading: false,
  }),
}));

const GROUPS: Partial<Group>[] = [
  {
    id: 'g1',
    name: 'Alpha guruh',
    branch_id: 'b1',
    branch_name: 'Yunusobod filiali',
    course_type: 'avto_maktab',
    active_students: 12,
    is_active: true,
    created_at: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'g2',
    name: 'Beta guruh',
    branch_id: 'b2',
    branch_name: 'Chilonzor filiali',
    course_type: 'tezkor',
    active_students: 5,
    is_active: false,
    created_at: '2026-06-15T00:00:00.000Z',
  },
];

const OVERVIEW: Partial<GroupOverview>[] = [
  {
    branch_id: 'b1',
    branch_name: 'Yunusobod filiali',
    groups: [GROUPS[0] as Group],
  },
];

const renderPage = (url = '/groups') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <GroupsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  h.auth.role = 'owner';
  h.auth.branch_id = null;
  h.groupsData = GROUPS;
  h.overviewData = OVERVIEW;
  h.useGroupsSpy.mockClear();
});

afterEach(cleanup);

describe('GroupsPage rendering', () => {
  it('renders a table row and a mobile card per group', () => {
    renderPage();
    // jsdom applies no media queries, so the desktop table AND the mobile
    // DataCard list both render — each group name appears at least twice.
    expect(screen.getAllByText('Alpha guruh').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Beta guruh').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Chilonzor filiali').length).toBeGreaterThan(0);
    // Header count reflects the full (unpaginated) list.
    expect(screen.getByText('groups.count')).toBeTruthy();
  });

  it('renders the by-branch overview and expands a branch on click', () => {
    h.groupsData = [];
    renderPage();
    const header = screen.getByRole('button', {
      name: /Yunusobod filiali/,
    });
    // Collapsed: the overview group's row is not shown yet (list is empty so
    // no table row can match either).
    expect(screen.queryByText('Alpha guruh')).toBeNull();
    fireEvent.click(header);
    expect(screen.getByText('Alpha guruh')).toBeTruthy();
  });
});

describe('GroupsPage URL filter params', () => {
  it('feeds q/course_type/branch_id from the URL into useGroups', () => {
    renderPage('/groups?q=alpha&course_type=tezkor&branch_id=b2');
    const lastCall = h.useGroupsSpy.mock.calls.at(-1)?.[0];
    expect(lastCall).toEqual({
      search: 'alpha',
      branchId: 'b2',
      courseType: 'tezkor',
    });
    // Search input is hydrated from the URL too.
    expect(
      screen.getByPlaceholderText<HTMLInputElement>('groups.search_placeholder')
        .value,
    ).toBe('alpha');
  });

  it('defaults to no filters for a cross-tenant owner', () => {
    renderPage();
    expect(h.useGroupsSpy.mock.calls.at(-1)?.[0]).toEqual({
      search: '',
      branchId: undefined,
      courseType: undefined,
    });
  });
});

describe('GroupsPage empty state', () => {
  it('shows the explicit empty state instead of a blank table', () => {
    h.groupsData = [];
    h.overviewData = [];
    renderPage();
    expect(screen.getByText('groups.not_found')).toBeTruthy();
  });
});

describe('GroupsPage role gating', () => {
  it('owner sees delete buttons and the branch filter select', () => {
    renderPage();
    expect(screen.getAllByLabelText('common.delete').length).toBeGreaterThan(0);
    // Filter bar has course-type + branch selects for cross-tenant roles.
    expect(screen.getAllByRole('combobox').length).toBe(2);
  });

  it('teacher gets no delete button, no branch filter, and is pinned to own branch', () => {
    h.auth.role = 'teacher';
    h.auth.branch_id = 'b1';
    renderPage();
    expect(screen.queryAllByLabelText('common.delete').length).toBe(0);
    // Edit stays available regardless of manageGroups.
    expect(screen.getAllByLabelText('common.edit').length).toBeGreaterThan(0);
    // Only the course-type select renders — no branch picker.
    expect(screen.getAllByRole('combobox').length).toBe(1);
    // Fetch is pinned to the teacher's own branch from the auth store.
    expect(h.useGroupsSpy.mock.calls.at(-1)?.[0]).toEqual({
      search: '',
      branchId: 'b1',
      courseType: undefined,
    });
  });
});
