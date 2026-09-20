import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FleetMapPage from '@/pages/FleetMapPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const state = vi.hoisted(() => ({
  role: 'manager',
  filters: [] as Array<Record<string, unknown>>,
  error: null as unknown,
  isLoading: false,
  vehicles: [
    {
      id: 'v1',
      branch_id: 'b1',
      plate_number: '01 A 123 BC',
      make: 'Chevrolet',
      model: 'Cobalt',
      status: 'active',
      available_for_booking: true,
    },
  ],
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (value: Record<string, unknown>) => unknown) =>
    selector({
      user: {
        role: state.role,
        branch_id: 'b1',
        branch_name: 'Yunusobod',
      },
    }),
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: (capability: string) =>
    capability === 'viewAllBranches' && state.role === 'owner',
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({
    data: [
      { id: 'b1', name: 'Yunusobod' },
      { id: 'b2', name: 'Chilonzor' },
    ],
  }),
}));

vi.mock('@/services/vehicleService', () => ({
  useVehiclesPage: (filters: Record<string, unknown>) => {
    state.filters.push(filters);
    return {
      data: {
        data: state.vehicles,
        meta: { total: state.vehicles.length, totalPages: 1 },
      },
      isLoading: state.isLoading,
      isError: state.error != null,
      error: state.error,
      refetch: vi.fn(),
    };
  },
}));

beforeEach(() => {
  state.role = 'manager';
  state.filters = [];
  state.error = null;
  state.isLoading = false;
});

afterEach(cleanup);

describe('FleetMapPage before GPS integration', () => {
  it('shows an interactive OSM basemap without claiming vehicle positions', async () => {
    await renderWithRouter(<FleetMapPage />, {
      initialEntry: '/fleet-map',
      routePattern: '/fleet-map',
    });

    const basemap = await screen.findByRole('region', {
      name: 'fleet_map.basemap_label',
    });
    expect(basemap.querySelector('.leaflet-tile-pane')).toBeTruthy();
    expect(
      within(basemap).getByRole('link', { name: /OpenStreetMap/ }),
    ).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
    expect(
      basemap.querySelector('.leaflet-marker-pane')?.children,
    ).toHaveLength(0);
  });

  it('scopes a manager to the JWT branch and never implies that a vehicle has a live position', async () => {
    await renderWithRouter(<FleetMapPage />, {
      initialEntry: '/fleet-map',
      routePattern: '/fleet-map',
    });

    expect(state.filters.at(-1)?.branchId).toBe('b1');
    expect(
      screen.queryByRole('combobox', { name: 'common.branch' }),
    ).toBeNull();
    expect(screen.getByText('01 A 123 BC')).toBeTruthy();
    expect(screen.getByText('fleet_map.gps_unconfigured')).toBeTruthy();
    expect(screen.queryByText('fleet_map.live')).toBeNull();
  });

  it('lets an owner filter the real roster by branch and inspect a selected car', async () => {
    state.role = 'owner';
    await renderWithRouter(<FleetMapPage />, {
      initialEntry: '/fleet-map',
      routePattern: '/fleet-map',
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'common.branch' }), {
      target: { value: 'b2' },
    });
    expect(state.filters.at(-1)?.branchId).toBe('b2');

    fireEvent.click(screen.getByRole('button', { name: /01 A 123 BC/ }));
    expect(screen.getByText('fleet_map.signal_unavailable')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'fleet_map.open_vehicle' }),
    ).toHaveAttribute('href', '/vehicles/v1');
  });

  it('keeps route history visibly unavailable without fabricated playback', async () => {
    await renderWithRouter(<FleetMapPage />, {
      initialEntry: '/fleet-map',
      routePattern: '/fleet-map',
    });

    fireEvent.click(screen.getByRole('tab', { name: 'fleet_map.history' }));
    expect(screen.getByText('fleet_map.history_unavailable')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /play/i })).toBeNull();
  });

  it('lets keyboard users switch between current status and history tabs', async () => {
    await renderWithRouter(<FleetMapPage />, {
      initialEntry: '/fleet-map',
      routePattern: '/fleet-map',
    });

    const current = screen.getByRole('tab', { name: 'fleet_map.current' });
    const history = screen.getByRole('tab', { name: 'fleet_map.history' });
    current.focus();
    fireEvent.keyDown(current, { key: 'ArrowRight' });

    expect(history).toHaveAttribute('aria-selected', 'true');
    expect(history).toHaveFocus();
    expect(current).toHaveAttribute('tabindex', '-1');
  });

  it('separates a denied vehicle request from an empty roster', async () => {
    state.error = { response: { status: 403 }, isAxiosError: true };
    await renderWithRouter(<FleetMapPage />, {
      initialEntry: '/fleet-map',
      routePattern: '/fleet-map',
    });

    expect(screen.getByText('fleet_map.access_denied')).toBeTruthy();
    expect(screen.queryByText('fleet_map.no_vehicles')).toBeNull();
  });

  it('hides previously selected vehicle details if the server later denies access', async () => {
    const { rerender } = await renderWithRouter(<FleetMapPage />, {
      initialEntry: '/fleet-map',
      routePattern: '/fleet-map',
    });
    fireEvent.click(screen.getByRole('button', { name: /01 A 123 BC/ }));
    expect(screen.getByText('fleet_map.signal_unavailable')).toBeTruthy();

    state.error = { response: { status: 403 }, isAxiosError: true };
    rerender(<FleetMapPage />);

    expect(screen.getByText('fleet_map.access_denied')).toBeTruthy();
    expect(screen.queryByText('fleet_map.signal_unavailable')).toBeNull();
  });
});
