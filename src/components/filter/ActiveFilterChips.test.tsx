import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActiveFilterChips } from './ActiveFilterChips';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

describe('ActiveFilterChips', () => {
  it('renders nothing when chips array is empty', () => {
    const { container } = render(<ActiveFilterChips chips={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders chips with label, colon, and value without em dashes', () => {
    const remove1 = vi.fn();
    const remove2 = vi.fn();

    render(
      <ActiveFilterChips
        chips={[
          { id: 'status', label: 'Holati', value: 'Faol', onRemove: remove1 },
          { id: 'debt', label: 'Qarz', value: 'Bor', onRemove: remove2 },
        ]}
      />,
    );

    expect(screen.getByText('Holati:')).toBeInTheDocument();
    expect(screen.getByText('Faol')).toBeInTheDocument();
    expect(screen.getByText('Qarz:')).toBeInTheDocument();
    expect(screen.getByText('Bor')).toBeInTheDocument();

    // Verify antislop rule: no em dash in chip text
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });

  it('calls onRemove when removing a chip', () => {
    const remove1 = vi.fn();

    render(
      <ActiveFilterChips
        chips={[
          { id: 'status', label: 'Status', value: 'Active', onRemove: remove1 },
        ]}
      />,
    );

    const removeBtn = screen.getByRole('button', {
      name: 'Remove Status filter',
    });
    fireEvent.click(removeBtn);
    expect(remove1).toHaveBeenCalledTimes(1);
  });

  it('renders clear all button and handles click', () => {
    const onClearAll = vi.fn();

    render(
      <ActiveFilterChips
        chips={[
          { id: 'status', label: 'Status', value: 'Active', onRemove: vi.fn() },
        ]}
        onClearAll={onClearAll}
      />,
    );

    const clearAllBtn = screen.getByRole('button', {
      name: /common\.clear_all/i,
    });
    expect(clearAllBtn).toBeInTheDocument();
    fireEvent.click(clearAllBtn);
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});
