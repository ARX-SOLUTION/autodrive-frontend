import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import Page from './FuelDetailPage';
const state = vi.hoisted(() => ({
  source: {
    status: 'source_verified',
    seller_name: 'Station seller',
    seller_tin: '123456789',
    total: '105000.00',
    warnings: ['station_tin_mismatch'],
    lines: [
      {
        index: 0,
        name: 'Petrol original',
        mxik: '111',
        quantity: '10',
        unit: 'litre',
        line_total: '100000.00',
      },
      {
        index: 1,
        name: 'Nonfuel coffee',
        mxik: '222',
        quantity: '1',
        unit: 'piece',
        line_total: '5000.00',
      },
    ],
  } as Record<string, unknown>,
}));
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ id: 'f' }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (fn: (s: unknown) => unknown) =>
    fn({ user: { id: 'reviewer', role: 'accountant' } }),
}));
vi.mock('./FuelForm', () => ({ default: () => null }));
vi.mock('./service', () => ({
  useFuel: () => ({
    data: {
      id: 'f',
      author_id: 'author',
      vehicle_plate: 'CAR',
      station_name: 'Station',
      status: 'submitted',
      source_status: state.source.status,
      source_data: state.source,
      occurred_at: '2026-09-27T10:00:00Z',
      odometer_km: 100,
      funding_source: 'partner_credit',
      lines: [
        {
          name: 'Selected petrol',
          fuel_type: 'petrol',
          quantity: '10',
          unit: 'litre',
          unit_price: '10000.00',
          line_total: '100000.00',
        },
      ],
      evidence: [],
      history: [],
    },
  }),
  useFuelMutation: () => ({ isPending: false, mutate: vi.fn() }),
  fuelAction: vi.fn(),
  fuelImage: vi.fn(),
  uploadFuelEvidence: vi.fn(),
}));
it('shows full original basket and seller warning separately from selected fuel', () => {
  render(<Page />);
  const source = screen.getByRole('region', { name: 'fuel.original_receipt' });
  expect(within(source).getByText('Station seller')).toBeInTheDocument();
  expect(within(source).getByText('123456789')).toBeInTheDocument();
  expect(within(source).getByText('105000.00')).toBeInTheDocument();
  expect(within(source).getByText(/Nonfuel coffee/)).toBeInTheDocument();
  expect(
    within(source).getByText('fuel.source_reasons.station_tin_mismatch'),
  ).toBeInTheDocument();
  expect(within(source).queryByText(/Selected petrol/)).not.toBeInTheDocument();
});
it('shows manual source failure reason without claiming source verification', () => {
  state.source = { status: 'manual_review', reason: 'source_unavailable' };
  render(<Page />);
  expect(
    within(
      screen.getByRole('region', { name: 'fuel.original_receipt' }),
    ).getByText('fuel.source_reasons.source_unavailable'),
  ).toBeInTheDocument();
});
