import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { demoLoginRequest } from './authApi';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe('auth API', () => {
  it('starts demo login without sending browser-held credentials', async () => {
    const auth = { token: 'demo-token', user: { id: 'demo-owner' } };
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({
      data: { success: true, data: auth },
    });

    await expect(demoLoginRequest()).resolves.toEqual(auth);
    expect(axiosInstance.post).toHaveBeenCalledWith('/auth/demo');
  });
});
