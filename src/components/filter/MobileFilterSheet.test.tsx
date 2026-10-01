import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileFilterSheet } from './MobileFilterSheet';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

describe('MobileFilterSheet', () => {
  it('renders default trigger with activeCount badge', () => {
    render(
      <MobileFilterSheet open={false} onOpenChange={vi.fn()} activeCount={3}>
        <div>Filter Contents</div>
      </MobileFilterSheet>,
    );

    const trigger = screen.getByRole('button', { name: /Filters/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders children when sheet is open', () => {
    render(
      <MobileFilterSheet open={true} onOpenChange={vi.fn()} activeCount={1}>
        <div data-testid="filter-child">Filter Contents</div>
      </MobileFilterSheet>,
    );

    expect(screen.getByTestId('filter-child')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'common.close' }),
    ).toBeInTheDocument();
  });

  it('triggers onClearAll when clear all button is clicked', () => {
    const onClearAll = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <MobileFilterSheet
        open={true}
        onOpenChange={onOpenChange}
        activeCount={2}
        onClearAll={onClearAll}
      >
        <div>Filter Contents</div>
      </MobileFilterSheet>,
    );

    const clearBtn = screen.getByRole('button', { name: /common\.clear_all/i });
    fireEvent.click(clearBtn);

    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes sheet when Apply is clicked', () => {
    const onOpenChange = vi.fn();

    render(
      <MobileFilterSheet open={true} onOpenChange={onOpenChange}>
        <div>Filter Contents</div>
      </MobileFilterSheet>,
    );

    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    fireEvent.click(applyBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes with a supplied label without clearing active filters', () => {
    const onOpenChange = vi.fn();
    const onClearAll = vi.fn();
    render(
      <MobileFilterSheet
        open={true}
        onOpenChange={onOpenChange}
        onClearAll={onClearAll}
        activeCount={2}
        applyLabel="Close filters"
      >
        <div>Selected filters</div>
      </MobileFilterSheet>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close filters' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onClearAll).not.toHaveBeenCalled();
  });
});
