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
});
