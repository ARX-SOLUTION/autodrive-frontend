import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchWithHotkey } from './SearchWithHotkey';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

describe('SearchWithHotkey', () => {
  it('renders input with placeholder and hotkey badge when empty', () => {
    render(
      <SearchWithHotkey value="" onChange={vi.fn()} placeholder="Search..." />,
    );

    const input = screen.getByRole('textbox', { name: 'Search...' });
    expect(input).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('renders clear button when value is present and clears on click', () => {
    const onChange = vi.fn();
    render(<SearchWithHotkey value="John" onChange={onChange} />);

    const clearButton = screen.getByRole('button', { name: 'common.clear' });
    expect(clearButton).toBeInTheDocument();
    expect(screen.queryByText('/')).not.toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('focuses input when "/" is pressed on window outside of form inputs', () => {
    render(<SearchWithHotkey value="" onChange={vi.fn()} />);

    const input = screen.getByRole('textbox');
    expect(document.activeElement).not.toBe(input);

    fireEvent.keyDown(window, { key: '/' });
    expect(document.activeElement).toBe(input);
  });

  it('does not intercept "/" if user is already typing in another input', () => {
    render(
      <div>
        <input data-testid="other-input" />
        <SearchWithHotkey value="" onChange={vi.fn()} />
      </div>,
    );

    const otherInput = screen.getByTestId('other-input');
    otherInput.focus();

    const searchInput = screen.getByRole('textbox', { name: 'common.search' });
    fireEvent.keyDown(otherInput, { key: '/' });

    expect(document.activeElement).toBe(otherInput);
    expect(document.activeElement).not.toBe(searchInput);
  });
});
