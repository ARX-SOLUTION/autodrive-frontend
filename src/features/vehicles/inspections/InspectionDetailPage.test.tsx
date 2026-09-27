import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import Page from './InspectionDetailPage';
const state = vi.hoisted(() => ({
  user: { id: 'author', role: 'teacher' },
  row: {
    id: 'i',
    vehicle_id: 'v',
    author_id: 'author',
    receiver_id: 'receiver',
    kind: 'return',
    status: 'draft',
    odometer_km: 120,
    notes: null,
    vehicle: { plate_number: '01 A 123 BC' },
    author: { name: 'Author' },
    receiver: { name: 'Receiver' },
    evidence: [],
    reviews: [],
  },
}));
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ id: 'i' }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: state.user }),
}));
vi.mock('./service', () => ({
  useInspection: () => ({ data: state.row }),
  useVehicleDefects: () => ({ data: { data: [], meta: { totalPages: 1 } } }),
  useInspectionMutation: () => ({ isPending: false, mutate: vi.fn() }),
  fetchEvidence: vi.fn(),
  uploadEvidence: vi.fn(),
  inspectionAction: vi.fn(),
}));
beforeEach(() => {
  state.user = { id: 'author', role: 'teacher' };
  state.row.status = 'draft';
});
it('keeps submission disabled before required photos have uploaded', () => {
  render(<Page />);
  expect(
    screen.getByRole('button', { name: 'inspections.submit' }),
  ).toBeDisabled();
  expect(screen.getByLabelText('inspections.front')).toHaveAttribute(
    'capture',
    'environment',
  );
});
it('offers receiver acknowledgment without management decisions', () => {
  state.user = { id: 'receiver', role: 'teacher' };
  state.row.status = 'submitted';
  render(<Page />);
  expect(
    screen.getByRole('button', { name: 'inspections.approve' }),
  ).toBeEnabled();
  expect(
    screen.queryByRole('button', { name: 'inspections.stop' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'inspections.submit' }),
  ).not.toBeInTheDocument();
});

it('allows a manager to enter a reasoned missing-photo override', () => {
  state.user = { id: 'manager', role: 'manager' };
  render(<Page />);
  expect(
    screen.getByRole('button', { name: 'inspections.submit' }),
  ).toBeDisabled();
  expect(screen.getByText('inspections.reason')).toBeVisible();
});
