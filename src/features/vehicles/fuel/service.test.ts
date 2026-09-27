import { expect, it, vi } from 'vitest';
import axios from '@/api/axiosInstance';
import { saveFuel, lookupReceipt, fuelImage } from './service';
vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));
it('preserves decimal totals and optimistic version on draft corrections', async () => {
  vi.mocked(axios.patch).mockResolvedValueOnce({
    data: { data: { id: 'fuel' } },
  });
  await saveFuel(
    {
      vehicle_id: 'v',
      station_id: 's',
      occurred_at: '2026-09-27T10:00',
      odometer_km: '100',
      funding_source: 'partner_credit',
      qr_url: '',
      lines: [
        {
          fuel_type: 'petrol',
          unit: 'litre',
          quantity: '2',
          unit_price: '13000.00',
          line_total: '26000.00',
        },
      ],
    },
    'request',
    'fuel',
    3,
    'Fix odometer',
  );
  expect(axios.patch).toHaveBeenCalledWith(
    '/vehicle-fuel/fuel',
    expect.objectContaining({
      expected_version: 3,
      request_id: 'request',
      reason: 'Fix odometer',
      lines: [
        expect.objectContaining({
          line_total: '26000.00',
          unit_price: '13000.00',
        }),
      ],
    }),
  );
});
it('keeps source failure a manual review state without inventing lines', async () => {
  vi.mocked(axios.post).mockResolvedValueOnce({
    data: { data: { status: 'manual_review', reason: 'source_unavailable' } },
  });
  expect(await lookupReceipt('https://ofd.soliq.uz/check?t=A')).toEqual({
    status: 'manual_review',
    reason: 'source_unavailable',
  });
});
it('fetches scoped evidence privately as a cancellable blob', async () => {
  const signal = new AbortController().signal;
  const blob = new Blob(['image']);
  vi.mocked(axios.get).mockResolvedValueOnce({ data: blob });
  expect(await fuelImage('fuel', 'image', signal)).toBe(blob);
  expect(axios.get).toHaveBeenCalledWith('/vehicle-fuel/fuel/evidence/image', {
    signal,
    responseType: 'blob',
  });
});
