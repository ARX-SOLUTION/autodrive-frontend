import { expect, it, vi } from 'vitest';
import axios from '@/api/axiosInstance';
import { uploadEvidence, fetchEvidence } from './service';
vi.mock('@/api/axiosInstance', () => ({
  default: {
    post: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({ data: new Blob(['image']) }),
  },
}));
it('sends camera evidence as multipart instead of inherited JSON', async () => {
  const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
  await uploadEvidence('i', 'front', file, '', vi.fn());
  const [, body, config] = vi.mocked(axios.post).mock.calls[0];
  expect(body).toBeInstanceOf(FormData);
  expect((body as FormData).get('file')).toBe(file);
  expect(config?.headers?.['Content-Type']).toBe('multipart/form-data');
});
it('fetches private evidence through authenticated axios as a cancellable blob', async () => {
  const signal = new AbortController().signal;
  await fetchEvidence('i', 'e', signal);
  expect(axios.get).toHaveBeenCalledWith('/vehicle-inspections/i/evidence/e', {
    responseType: 'blob',
    signal,
  });
});
