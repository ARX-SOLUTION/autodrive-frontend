import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { leadsApi } from './leadsApi';

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('leadsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches paginated leads list', async () => {
    const mockData = {
      items: [{ id: 'lead-1', firstName: 'Ali', phone: '+998901234567' }],
      total: 1,
      page: 1,
      limit: 20,
    };
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({ data: mockData });

    const result = await leadsApi.getLeads({ q: 'Ali' });
    expect(axiosInstance.get).toHaveBeenCalledWith('/leads', {
      params: { q: 'Ali' },
      signal: undefined,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].firstName).toBe('Ali');
    expect(result.total).toBe(1);
  });

  it('sends backend lead filter params for list, board, and export', async () => {
    const query = {
      q: 'Ali',
      branch_id: 'branch-1',
      stage_id: 'stage-1',
      source: 'telegram' as const,
      course_type: 'tezkor' as const,
      category: 'B' as const,
      assigned_to_me: false,
      assignee_user_id: 'user-1',
      overdue_only: false,
      has_task: true,
      period: '30d' as const,
      tab: 'new' as const,
      page: 2,
      limit: 50,
    };
    const expectedParams = {
      q: 'Ali',
      branchId: 'branch-1',
      stageId: 'stage-1',
      source: 'telegram',
      courseType: 'tezkor',
      category: 'B',
      mine: false,
      assigneeId: 'user-1',
      overdueOnly: false,
      period: '30d',
      tab: 'new',
      page: 2,
      limit: 50,
    };
    const originalQuery = { ...query };
    const createObjectURL = vi.fn(() => 'blob:leads-export');
    const revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({
        data: { items: [], total: 0, page: 1, limit: 20 },
      })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: new Blob(['csv']) });

    await leadsApi.getLeads(query);
    await leadsApi.getLeadBoard(query);
    await leadsApi.exportLeads(query);

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, '/leads', {
      params: expectedParams,
      signal: undefined,
    });
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, '/leads/board', {
      params: expectedParams,
      signal: undefined,
    });
    expect(axiosInstance.get).toHaveBeenNthCalledWith(3, '/leads/export.xlsx', {
      params: expectedParams,
      responseType: 'blob',
    });
    expect(query).toEqual(originalQuery);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:leads-export');
    expect(click).toHaveBeenCalledOnce();
  });

  it('fetches lead board', async () => {
    const mockBoard = [
      {
        stage: { id: 's1', name: 'Yangi', kind: 'NEW', position: 1 },
        leads: [{ id: 'l1', firstName: 'Vali' }],
        count: 1,
      },
    ];
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({ data: mockBoard });

    const result = await leadsApi.getLeadBoard();
    expect(axiosInstance.get).toHaveBeenCalledWith('/leads/board', {
      params: {},
      signal: undefined,
    });
    expect(result).toHaveLength(1);
    expect(result[0].stage.name).toBe('Yangi');
  });

  it('filters normalized board columns by explicit stage filter', async () => {
    const mockBoard = [
      {
        stageId: 'stage-new',
        stageName: 'Yangi',
        stageColor: '#111111',
        items: [
          { id: 'l1', name: 'Ali', phone: '+998901', source: 'telegram' },
        ],
        total: 1,
      },
      {
        stageId: 'stage-work',
        stageName: 'Aloqa',
        stageColor: '#222222',
        items: [
          { id: 'l2', name: 'Vali', phone: '+998902', source: 'instagram' },
        ],
        total: 1,
      },
    ];
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({ data: mockBoard })
      .mockResolvedValueOnce({ data: mockBoard });

    const filtered = await leadsApi.getLeadBoard({ stage_id: 'stage-work' });
    const unfiltered = await leadsApi.getLeadBoard();

    expect(filtered).toHaveLength(1);
    expect(filtered[0].stage.id).toBe('stage-work');
    expect(unfiltered).toHaveLength(2);
  });

  it('creates a new lead', async () => {
    const payload = {
      firstName: 'Sanjar',
      phone: '+998901112233',
      branchId: 'b-1',
      source: 'telegram' as const,
    };
    const mockCreated = { id: 'new-lead-1', ...payload };
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({ data: mockCreated });

    const result = await leadsApi.createLead(payload);
    expect(axiosInstance.post).toHaveBeenCalledWith('/leads', payload);
    expect(result.id).toBe('new-lead-1');
  });

  it('transitions lead stage', async () => {
    const payload = {
      stageId: 's-won',
      version: 1,
    };
    vi.mocked(axiosInstance.patch).mockResolvedValueOnce({
      data: { id: 'l-1', stageId: 's-won', version: 2 },
    });

    const result = await leadsApi.transitionStage('l-1', payload);
    expect(axiosInstance.patch).toHaveBeenCalledWith(
      '/leads/l-1/stage',
      payload,
    );
    expect(result.stageId).toBe('s-won');
  });

  it('converts lead to student', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({
      data: {
        studentId: 'stu-1',
        student: { id: 'stu-1', firstName: 'Sanjar' },
      },
    });

    const result = await leadsApi.convertLead('l-1', { force: true });
    expect(axiosInstance.post).toHaveBeenCalledWith('/leads/l-1/convert', {
      force: true,
    });
    expect(result.studentId).toBe('stu-1');
  });

  it('checks duplicates by phone', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: {
        hasDuplicate: true,
        duplicateLead: { id: 'dup-1', firstName: 'Ali' },
      },
    });

    const result = await leadsApi.checkDuplicate({
      phone: '+998901234567',
      branchId: 'b-1',
    });
    expect(axiosInstance.get).toHaveBeenCalledWith('/leads/check-duplicate', {
      params: {
        phone: '+998901234567',
        branchId: 'b-1',
        excludeLeadId: undefined,
      },
      signal: undefined,
    });
    expect(result.hasDuplicate).toBe(true);
  });

  it('fetches lead stages', async () => {
    const mockStages = [
      { id: 's1', name: 'Yangi', kind: 'NEW' },
      { id: 's2', name: 'Won', kind: 'WON' },
    ];
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({ data: mockStages });

    const result = await leadsApi.getStages();
    expect(axiosInstance.get).toHaveBeenCalledWith('/lead-stages', {
      signal: undefined,
    });
    expect(result).toHaveLength(2);
  });

  it('creates and deletes activities', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({
      data: { id: 'act-1', kind: 'NOTE', body: 'Qo‘ng‘iroq qilindi' },
    });
    vi.mocked(axiosInstance.delete).mockResolvedValueOnce({
      data: { success: true },
    });

    const act = await leadsApi.createActivity('l-1', {
      kind: 'NOTE',
      body: 'Qo‘ng‘iroq qilindi',
    });
    expect(act.id).toBe('act-1');

    await leadsApi.deleteActivity('l-1', 'act-1');
    expect(axiosInstance.delete).toHaveBeenCalledWith(
      '/leads/l-1/activities/act-1',
    );
  });

  it('adapts backend lead metrics response', async () => {
    const rawBackendMetrics = {
      openPerStage: [
        { stageId: 's1', stageName: 'Yangi', count: 5 },
        { stageId: 's2', stageName: 'Aloqa', count: 3 },
      ],
      funnelStages: [{ stageId: 's1', stageName: 'Yangi', count: 10 }],
      leadToStudent: 25.5,
      overdueCount: 2,
      untouchedCount: 1,
      lostByReason: [
        { reason: 'EXPENSIVE', count: 3 },
        { reason: 'FAR_AWAY', count: 2 },
      ],
      totalCreated: 20,
      totalConverted: 5,
    };
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: rawBackendMetrics,
    });

    const result = await leadsApi.getMetrics({
      branchId: 'b-1',
      period: '30d',
    });
    expect(axiosInstance.get).toHaveBeenCalledWith('/leads/metrics', {
      params: { branchId: 'b-1', period: '30d' },
      signal: undefined,
    });
    expect(result.totalLeads).toBe(20);
    expect(result.wonLeads).toBe(5);
    expect(result.conversionRate).toBe(25.5);
    expect(result.byStage).toEqual({ Yangi: 5, Aloqa: 3 });
    expect(result.byLostReason).toEqual({ EXPENSIVE: 3, FAR_AWAY: 2 });
    expect(result.lostLeads).toBe(5);
    expect(result.overdueCount).toBe(2);
    expect(result.untouchedCount).toBe(1);
    expect(result.bySource).toEqual({});
  });

  it('preserves mock lead metrics response', async () => {
    const mockMetrics = {
      totalLeads: 10,
      wonLeads: 2,
      lostLeads: 1,
      conversionRate: 20,
      avgTimeToWonDays: 4,
      bySource: { telegram: { count: 5, won: 1, conversionRate: 20 } },
      byLostReason: { OTHER: 1 },
      byStage: { Yangi: 7 },
    };
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: mockMetrics,
    });

    const result = await leadsApi.getMetrics();
    expect(result.totalLeads).toBe(10);
    expect(result.wonLeads).toBe(2);
    expect(result.conversionRate).toBe(20);
    expect(result.byStage).toEqual({ Yangi: 7 });
  });
});
