import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import AuditLogPage from '@/pages/AuditLogPage';
import type { AuditLog } from '@/types/audit';

// Characterization tests for AuditLogPage (autodrive decomposition ticket):
// pin current observable behavior before/after extracting src/pages/audit/*.
// No role-gating test: the page itself has no role branching — gating lives
// in auditService (`enabled: canViewAudit`) and route config, both mocked out
// here and out of this page's scope.

vi.mock('@/services/auditService', () => ({
  useAuditLogs: vi.fn(),
}));

vi.mock('@/services/userService', () => ({
  useUsers: () => ({
    data: [
      { id: 'u-alice', name: 'Alice Aliyeva' },
      { id: 'u-bob1', name: 'Bobur Karimov' },
      { id: 'u-bob2', name: 'Bobir Toshev' },
    ],
  }),
}));

// The page only imports the pure toLocalDateStr helper from studentService;
// mock it inline to avoid pulling the whole service (axios, auth store).
vi.mock('@/services/studentService', () => ({
  toLocalDateStr: (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
}));

// Identity debounce so the search->userId resolution is synchronous in tests.
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: <T,>(v: T) => v,
}));

import { useAuditLogs } from '@/services/auditService';
const mockUseAuditLogs = useAuditLogs as Mock;

const makeLog = (overrides: Partial<AuditLog>): AuditLog => ({
  id: 'log-1',
  action: 'CREATE',
  entity: 'student',
  entity_id: 'e-1',
  user_id: 'u-alice',
  user_name: 'Alice Aliyeva',
  user_role: 'manager',
  branch_id: 'b-1',
  company_id: 'c-1',
  changes: null,
  created_at: '2026-07-10T09:00:00.000Z',
  ...overrides,
});

const queryResult = (logs: AuditLog[], total = logs.length) => ({
  data: { data: logs, meta: { total } },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
});

const renderPage = (url = '/audit') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <AuditLogPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  mockUseAuditLogs.mockReset();
  mockUseAuditLogs.mockReturnValue(queryResult([]));
});

describe('AuditLogPage', () => {
  it('renders rows (desktop table + mobile cards) from list data with total count', () => {
    mockUseAuditLogs.mockReturnValue(
      queryResult([
        makeLog({ id: 'log-1', user_name: 'Alice Aliyeva' }),
        makeLog({ id: 'log-2', user_name: 'Bobur Karimov', action: 'DELETE' }),
      ]),
    );
    renderPage();

    // Each log renders in both the desktop table and the mobile card list
    // (responsiveness is CSS-only), so names appear at least once each.
    expect(screen.getAllByText('Alice Aliyeva').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bobur Karimov').length).toBeGreaterThan(0);
    // Count label: "<total> audit.entry_count" (i18n mocked to return keys).
    expect(screen.getByText(/audit\.entry_count/)).toHaveTextContent('2');
    // Not the empty state.
    expect(screen.queryByText('audit.not_found')).not.toBeInTheDocument();
  });

  it('drives the fetch from URL filter params (entity, action, dates, page, q->userId)', () => {
    mockUseAuditLogs.mockReturnValue(
      queryResult([makeLog({})], 120), // 120 total -> 3 pages of 50
    );
    renderPage(
      '/audit?entity=student&action=CREATE&q=Alice&date_from=2026-07-01&date_to=2026-07-10&page=2',
    );

    const args = mockUseAuditLogs.mock.calls.at(-1)?.[0];
    expect(args).toMatchObject({
      entity: 'student',
      action: 'CREATE',
      page: 2,
      limit: 50,
      userId: 'u-alice', // 'Alice' uniquely matches one user -> real id
    });
    expect(args.startDate).toEqual(new Date('2026-07-01'));
    expect(args.endDate).toEqual(new Date('2026-07-10'));

    // Row numbering continues across pages: page 2 starts at 51.
    expect(screen.getByText('51')).toBeInTheDocument();
    // Pagination reflects total/limit.
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('forces an empty result via sentinel userId when the name search is ambiguous', () => {
    renderPage('/audit?q=Bob'); // matches Bobur AND Bobir

    const args = mockUseAuditLogs.mock.calls.at(-1)?.[0];
    expect(args.userId).toBe('__no_match__');
  });

  it('renders the explicit empty state, not a blank table, when there are no logs', () => {
    mockUseAuditLogs.mockReturnValue(queryResult([]));
    renderPage();

    // Empty state appears in both desktop table and mobile list variants.
    expect(screen.getAllByText('audit.not_found').length).toBeGreaterThan(0);
  });

  it('renders the error state with a retry action on query error', () => {
    const refetch = vi.fn();
    mockUseAuditLogs.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    renderPage();

    expect(screen.getAllByText('common.error').length).toBeGreaterThan(0);
    screen.getAllByText('common.retry')[0].click();
    expect(refetch).toHaveBeenCalled();
  });
});
