import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FleetWorkloadOperationsCenter } from './FleetWorkloadOperationsCenter';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

describe('FleetWorkloadOperationsCenter', () => {
  it('renders executive radar heading and kpi cards', () => {
    const { container } = render(<FleetWorkloadOperationsCenter />);

    // Check main title by translation key (test/setup.ts returns key)
    expect(screen.getByText('operations.title')).toBeDefined();

    // Check KPI titles
    expect(screen.getByText('operations.kpi_hours')).toBeDefined();
    expect(screen.getByText('operations.kpi_instructors')).toBeDefined();
    expect(screen.getByText('operations.kpi_fuel_risk')).toBeDefined();
    expect(screen.getByText('operations.kpi_expense')).toBeDefined();

    // Verify antislop rule R-02: Zero em-dashes anywhere in rendered container
    expect(container.innerHTML.includes('—')).toBe(false);
  });

  it('switches between Radar, Instructors, and Fuel tabs', () => {
    render(<FleetWorkloadOperationsCenter />);

    // Initial tab is radar alerts
    expect(screen.getByText('operations.radar_heading')).toBeDefined();

    // Switch to Instructors tab
    const instructorsTab = screen.getByText('operations.tab_instructors');
    fireEvent.click(instructorsTab);
    expect(screen.getByText('operations.instructors_heading')).toBeDefined();
    expect(screen.getAllByText('Rustam Qosimov').length).toBeGreaterThan(0);

    // Switch to Fleet & Fuel tab
    const fuelTab = screen.getByText('operations.tab_fleet_fuel');
    fireEvent.click(fuelTab);
    expect(screen.getByText('operations.fleet_fuel_heading')).toBeDefined();
    expect(screen.getAllByText('01 777 AAA').length).toBeGreaterThan(0);
  });

  it('filters data by search input', () => {
    render(<FleetWorkloadOperationsCenter />);

    // Switch to Instructors tab
    fireEvent.click(screen.getByText('operations.tab_instructors'));

    const searchInput = screen.getByPlaceholderText(
      'operations.search_placeholder',
    );
    fireEvent.change(searchInput, { target: { value: 'Rustam' } });

    expect(screen.getAllByText('Rustam Qosimov').length).toBeGreaterThan(0);
    expect(screen.queryByText('Farhod Aliyev')).toBeNull();
  });

  it('opens action modal and confirms resolution on radar signal', () => {
    render(<FleetWorkloadOperationsCenter />);

    // Click "Chora ko‘rish" (operations.action_resolve) on the first alert
    const resolveButtons = screen.getAllByText('operations.action_resolve');
    fireEvent.click(resolveButtons[0]);

    // Modal should be open
    expect(screen.getByText('operations.modal_title')).toBeDefined();
    expect(screen.getByText('operations.modal_select_action')).toBeDefined();

    // Submit action
    const submitBtn = screen.getByText('operations.modal_submit');
    fireEvent.click(submitBtn);

    // Modal closes and badge says "Chora ko‘rildi"
    expect(screen.getAllByText('Chora ko‘rildi').length).toBeGreaterThan(0);
  });

  it('navigates to schedule and fuel logs from table actions', () => {
    mockNavigate.mockClear();
    render(<FleetWorkloadOperationsCenter />);

    // Instructors tab navigation to attendance/schedule
    fireEvent.click(screen.getByText('operations.tab_instructors'));
    const scheduleButtons = screen.getAllByText('operations.btn_schedule');
    fireEvent.click(scheduleButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/attendance' });

    // Fleet tab navigation to vehicles
    fireEvent.click(screen.getByText('operations.tab_fleet_fuel'));
    const fuelButtons = screen.getAllByText('operations.btn_fuel_logs');
    fireEvent.click(fuelButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/vehicles' });
  });
});
