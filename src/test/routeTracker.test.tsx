import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { RouteTracker } from '@/components/RouteTracker';

describe('RouteTracker', () => {
  it('does not call ymHit for authenticated app routes', () => {
    const ymSpy = vi.fn();
    (window as unknown as { ym: typeof ymSpy }).ym = ymSpy;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <RouteTracker />
      </MemoryRouter>,
    );

    expect(ymSpy).not.toHaveBeenCalled();
  });
});
