import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '@/App';
import { getLoginCopy } from '@/pages/loginCopy';
import { useAuthStore } from '@/store/authStore';

const copy = getLoginCopy('uz');

describe('homepage routing', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('sends anonymous visitors from / to the app login page', async () => {
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(await screen.findByText(copy.title)).toBeInTheDocument();
    expect(screen.getByText(copy.emailLabel)).toBeInTheDocument();
  });

  it('still protects the dashboard route and sends anonymous users to login', async () => {
    window.history.pushState({}, '', '/dashboard');

    render(<App />);

    expect(await screen.findByText(copy.title)).toBeInTheDocument();
    expect(screen.getByText(copy.emailLabel)).toBeInTheDocument();
  });
});
