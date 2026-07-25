import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from '@/hooks/useTheme';
import { Toaster, toast } from './sonner';

// FE-B4 regression: next-themes' useTheme() was called in this file with no
// ThemeProvider mounted anywhere in the app, so the `theme` prop it read was
// always undefined and fell back to 'system' -- toasts followed the OS
// preference instead of the app's own theme. Locks down that toggling the
// app theme actually changes what <Toaster> passes to sonner.

const ToggleButton = () => {
  const { toggle } = useTheme();
  return <button onClick={toggle}>toggle</button>;
};

const renderToaster = () =>
  render(
    <ThemeProvider
      attribute="class"
      storageKey="theme"
      defaultTheme="dark"
      enableSystem={false}
    >
      <ToggleButton />
      <Toaster />
    </ThemeProvider>,
  );

describe('Toaster theme (FE-B4 regression)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('follows the app theme and updates when it is toggled', async () => {
    renderToaster();
    // The toast list only mounts (with data-sonner-toaster) once a toast
    // exists -- an empty Toaster renders just an unmarked <section>.
    toast('hello');
    const getToaster = () => document.querySelector('[data-sonner-toaster]');
    await waitFor(() =>
      expect(getToaster()).toHaveAttribute('data-theme', 'dark'),
    );

    fireEvent.click(screen.getByText('toggle'));

    await waitFor(() =>
      expect(getToaster()).toHaveAttribute('data-theme', 'light'),
    );
  });
});
