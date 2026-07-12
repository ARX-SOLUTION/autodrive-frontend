import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordInput } from './password-input';

describe('PasswordInput toggle button', () => {
  it('reflects visibility in aria-pressed', () => {
    render(<PasswordInput />);
    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables the toggle when the input is disabled', () => {
    render(<PasswordInput disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
