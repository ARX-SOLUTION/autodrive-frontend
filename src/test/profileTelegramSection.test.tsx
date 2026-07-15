import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import ProfilePage from '@/pages/ProfilePage';
import {
  useTelegramLinkStatus,
  useTelegramUnlink,
} from '@/services/telegramService';

// bd autodrive-1ju.7: Profile page Telegram link/unlink + daily-report
// toggle. Backend PATCH /telegram/daily-report is @Roles(owner, manager)
// only (403 for others), so the FE toggle must be gated the same way.

const auth = vi.hoisted(() => ({ role: 'owner' as string }));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: { id: 'u1', role: auth.role, name: 'Test User' },
      setUser: vi.fn(),
    }),
}));

vi.mock('@/services/authService', () => ({
  useChangePassword: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/services/userService', () => ({
  useUpdateUser: () => ({ mutate: vi.fn(), isPending: false }),
}));

const linkStatus = vi.hoisted(() => ({
  linked: false,
  daily_report_enabled: false,
}));

vi.mock('@/services/telegramService', () => ({
  useTelegramLinkStatus: vi.fn(),
  useTelegramLinkToken: () => ({ mutate: vi.fn(), isPending: false }),
  useTelegramUnlink: vi.fn(),
  useTelegramDailyReport: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderProfile() {
  vi.mocked(useTelegramLinkStatus).mockReturnValue({
    data: linkStatus,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useTelegramLinkStatus>);
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(useTelegramUnlink).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useTelegramUnlink>);
});

describe('ProfilePage Telegram section — not linked', () => {
  it('shows link + check buttons, no unlink/toggle', () => {
    linkStatus.linked = false;
    linkStatus.daily_report_enabled = false;
    renderProfile();
    expect(
      screen.getByText('profile.telegram.link_button'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('profile.telegram.check_button'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('profile.telegram.unlink_button'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('profile.telegram.daily_report_label'),
    ).not.toBeInTheDocument();
  });
});

describe('ProfilePage Telegram section — linked, daily-report gate', () => {
  it('shows the toggle for owner', () => {
    auth.role = 'owner';
    linkStatus.linked = true;
    renderProfile();
    expect(
      screen.getByText('profile.telegram.daily_report_label'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('profile.telegram.unlink_button'),
    ).toBeInTheDocument();
  });

  it('shows the toggle for manager', () => {
    auth.role = 'manager';
    linkStatus.linked = true;
    renderProfile();
    expect(
      screen.getByText('profile.telegram.daily_report_label'),
    ).toBeInTheDocument();
  });

  it('hides the toggle for operator (backend would 403)', () => {
    auth.role = 'operator';
    linkStatus.linked = true;
    renderProfile();
    expect(
      screen.queryByText('profile.telegram.daily_report_label'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('profile.telegram.unlink_button'),
    ).toBeInTheDocument();
  });
});

describe('ProfilePage Telegram section — unlink confirm', () => {
  it('opens ConfirmDialog and calls unlink mutation on confirm', () => {
    auth.role = 'owner';
    linkStatus.linked = true;
    const mutate = vi.fn();
    vi.mocked(useTelegramUnlink).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useTelegramUnlink>);
    renderProfile();

    fireEvent.click(screen.getByText('profile.telegram.unlink_button'));
    expect(
      screen.getByText('profile.telegram.unlink_title'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('common.delete'));
    expect(mutate).toHaveBeenCalled();
  });
});
