import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '@/App';
import { useAuthStore } from '@/store/authStore';

// Note: i18n is mocked in setup.ts: t(key) => key.
// So we search for translation keys, not the actual strings.

describe('homepage routing', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('sends anonymous visitors from / to the app login page', async () => {
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(await screen.findByText('login.title')).toBeInTheDocument();
    expect(screen.getByText('login.email_label')).toBeInTheDocument();
  });

  it('still protects the dashboard route and sends anonymous users to login', async () => {
    window.history.pushState({}, '', '/dashboard');

    render(<App />);

    expect(await screen.findByText('login.title')).toBeInTheDocument();
    expect(screen.getByText('login.email_label')).toBeInTheDocument();
  });
});
