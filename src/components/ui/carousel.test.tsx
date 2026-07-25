import { act, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from './carousel';

// react-hooks/set-state-in-effect fix: canScrollPrev/canScrollNext used to
// be a useState mirror pushed from an effect that imperatively called
// onSelect(api) on setup, then re-called it from embla's 'select'/'reInit'
// events. Now read via useSyncExternalStore subscribed to those same embla
// events. This locks down that the prev/next buttons still reflect embla's
// state on mount AND still update when embla fires 'select'.

const listeners: Record<string, Array<() => void>> = {};
const emblaApi = {
  canScrollPrev: vi.fn(() => false),
  canScrollNext: vi.fn(() => true),
  scrollPrev: vi.fn(),
  scrollNext: vi.fn(),
  on: (event: string, cb: () => void) => {
    (listeners[event] ??= []).push(cb);
    return emblaApi;
  },
  off: (event: string, cb: () => void) => {
    listeners[event] = (listeners[event] ?? []).filter((l) => l !== cb);
    return emblaApi;
  },
};

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), emblaApi],
}));

const fireSelect = () => listeners.select?.forEach((cb) => cb());

afterEach(() => {
  Object.keys(listeners).forEach((k) => delete listeners[k]);
  cleanup();
});

const renderCarousel = () =>
  render(
    <Carousel>
      <CarouselContent>
        <CarouselItem>slide</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>,
  );

describe('Carousel prev/next buttons', () => {
  it('reflects embla canScrollPrev/canScrollNext on mount, no flash-then-correct render', () => {
    renderCarousel();
    expect(screen.getByText('Previous slide').closest('button')).toBeDisabled();
    expect(screen.getByText('Next slide').closest('button')).toBeEnabled();
  });

  it('updates after embla fires a select event', () => {
    renderCarousel();

    emblaApi.canScrollPrev.mockReturnValue(true);
    emblaApi.canScrollNext.mockReturnValue(false);
    act(() => fireSelect());

    expect(screen.getByText('Previous slide').closest('button')).toBeEnabled();
    expect(screen.getByText('Next slide').closest('button')).toBeDisabled();
  });
});
