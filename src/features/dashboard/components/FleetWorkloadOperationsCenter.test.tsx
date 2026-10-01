import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FleetWorkloadOperationsCenter } from './FleetWorkloadOperationsCenter';

describe('FleetWorkloadOperationsCenter', () => {
  it('explains unavailable integration without fabricated metrics or actions', () => {
    render(<FleetWorkloadOperationsCenter />);
    expect(
      screen.getByText('operations.unavailable_description'),
    ).toBeDefined();
    expect(screen.queryByText('Rustam Qosimov')).toBeNull();
    expect(screen.queryByText('operations.kpi_hours')).toBeNull();
    expect(screen.queryByText('operations.sync_status')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
