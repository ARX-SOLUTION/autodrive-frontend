import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChunkErrorBoundary } from '@/components/layout/ChunkErrorBoundary';

const Boom = () => {
  throw new Error(
    'Failed to fetch dynamically imported module: https://x/y.js',
  );
};

describe('ChunkErrorBoundary', () => {
  const reload = vi.fn();

  beforeEach(() => {
    reload.mockClear();
    sessionStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      writable: true,
    });
  });

  it('reloads once on a stale-chunk error', () => {
    render(
      <ChunkErrorBoundary>
        <Boom />
      </ChunkErrorBoundary>,
    );
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not loop-reload within the cooldown, shows fallback instead', () => {
    sessionStorage.setItem('chunk-error-reload-at', String(Date.now()));
    render(
      <ChunkErrorBoundary>
        <Boom />
      </ChunkErrorBoundary>,
    );
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByText('Xatolik yuz berdi')).toBeInTheDocument();
  });
});
