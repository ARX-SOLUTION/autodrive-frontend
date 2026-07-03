import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '@/App';
import { useAuthStore } from '@/store/authStore';

describe('homepage routing', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('renders the public landing page at / instead of redirecting to login', async () => {
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(
      await screen.findByText(
        'Avtomaktabingizdagi dars, to‘lov va jadval bir joyda.',
      ),
    ).toBeInTheDocument();
    const loginLinks = screen.getAllByRole('link', { name: 'Kirish' });
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
