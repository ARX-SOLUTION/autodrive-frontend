import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import OwnerCrmTour from './OwnerCrmTour';
import { persistCrmTourCompletion } from './persistCrmTourCompletion';

vi.mock('./persistCrmTourCompletion', () => ({
  persistCrmTourCompletion: vi.fn(),
}));

const originalGetClientRects = HTMLElement.prototype.getClientRects;

afterEach(() => {
  HTMLElement.prototype.getClientRects = originalGetClientRects;
});

describe('OwnerCrmTour', () => {
  it('shows the first step, advances, and skip closes while saving', async () => {
    HTMLElement.prototype.getClientRects = () =>
      [{ width: 40, height: 40 }] as unknown as DOMRectList;

    const onFinished = vi.fn();
    const releaseChrome = vi.fn();

    await renderWithRouter(
      <>
        <nav data-tour="crm-sidebar-mobile">menu</nav>
        <div data-tour="crm-dashboard">filters</div>
        <OwnerCrmTour
          onFinished={onFinished}
          prepareChrome={vi.fn()}
          releaseChrome={releaseChrome}
        />
      </>,
      { initialEntry: '/dashboard', routePattern: '/$' },
    );

    expect(
      await screen.findByRole('heading', { name: 'crm_tour.sidebar_title' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'crm_tour.next' }));

    expect(
      await screen.findByRole('heading', { name: 'crm_tour.dashboard_title' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'crm_tour.skip' }));

    await waitFor(() => {
      expect(onFinished).toHaveBeenCalledTimes(1);
    });
    expect(persistCrmTourCompletion).toHaveBeenCalledTimes(1);
    expect(releaseChrome).toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', { name: 'crm_tour.dashboard_title' }),
    ).not.toBeInTheDocument();
  });
});
