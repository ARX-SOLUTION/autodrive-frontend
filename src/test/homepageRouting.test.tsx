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

  it('renders the public landing page at / instead of redirecting to login', async () => {
    window.history.pushState({}, '', '/');

    render(<App />);

    // landing.faq_title is in a clean h2 tag (i18n mocked -> key is rendered as-is)
    expect(await screen.findByText('landing.faq_title')).toBeInTheDocument();
    const loginLinks = screen.getAllByRole('link', { name: 'landing.nav_cta' });
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(loginLinks[0]).toHaveAttribute('href', '/login');
    expect(screen.queryByText('login.title')).not.toBeInTheDocument();
  });

  it('still protects the dashboard route and sends anonymous users to login', async () => {
    window.history.pushState({}, '', '/dashboard');

    render(<App />);

    expect(await screen.findByText('login.title')).toBeInTheDocument();
    expect(screen.getByText('login.email_label')).toBeInTheDocument();
  });
});
