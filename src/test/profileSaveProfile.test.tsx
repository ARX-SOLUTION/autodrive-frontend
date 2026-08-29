import { screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import ProfilePage from '@/pages/ProfilePage';
import { useUpdateUser } from '@/services/userService';
import { useTelegramLinkStatus } from '@/services/telegramService';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// Regression test for autodrive-f9u.8: the Save button used to have no
// onClick and the inputs were uncontrolled -- editing them and clicking
// Save silently did nothing. PATCH /users/:id is @Roles(owner, manager,
// dev) only, so operator/teacher can't use it -- their fields must stay
// read-only instead of showing a button that would 403.

const auth = vi.hoisted(() => ({ role: 'owner' as string }));
const setUser = vi.hoisted(() => vi.fn());

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: { id: 'u1', role: auth.role, name: 'Test User', phone: '' },
      setUser,
    }),
}));

vi.mock('@/services/authService', () => ({
  useChangePassword: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/services/userService', () => ({
  useUpdateUser: vi.fn(),
}));

vi.mock('@/services/telegramService', () => ({
  useTelegramLinkStatus: vi.fn(),
  useTelegramLinkToken: () => ({ mutate: vi.fn(), isPending: false }),
  useTelegramUnlink: () => ({ mutate: vi.fn(), isPending: false }),
  useTelegramDailyReport: () => ({ mutate: vi.fn(), isPending: false }),
}));

async function renderProfile() {
  vi.mocked(useTelegramLinkStatus).mockReturnValue({
    data: { linked: false, daily_report_enabled: false },
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useTelegramLinkStatus>);
  return renderWithRouter(<ProfilePage />, {
    initialEntry: '/profile',
    routePattern: '/profile',
  });
}

afterEach(cleanup);

describe('ProfilePage Save button — owner/manager/dev', () => {
  it('is wired to useUpdateUser and updates the store on success', async () => {
    auth.role = 'owner';
    const mutate = vi.fn((_vars, opts) =>
      opts?.onSuccess?.({ id: 'u1', name: 'New Name' }),
    );
    vi.mocked(useUpdateUser).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateUser>);
    await renderProfile();

    const nameInput = screen.getByLabelText('profile.name') as HTMLInputElement;
    expect(nameInput).not.toBeDisabled();
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    fireEvent.click(screen.getByText('profile.save'));

    // zodResolver validates async (react-hook-form always awaits the
    // resolver, even with no failing rules) -- mirrors
    // recordExamModalScore.test.tsx's post-submit waitFor convention.
    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', fullName: 'New Name' }),
        expect.anything(),
      ),
    );
    expect(setUser).toHaveBeenCalled();
  });

  it('email field is never editable (backend has no email-update field)', async () => {
    auth.role = 'owner';
    vi.mocked(useUpdateUser).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateUser>);
    await renderProfile();

    expect(screen.getByLabelText('Email')).toBeDisabled();
  });
});

describe('ProfilePage Save button — operator/teacher (no backend permission)', () => {
  it('disables the fields and Save button instead of a silent 403', async () => {
    auth.role = 'operator';
    const mutate = vi.fn();
    vi.mocked(useUpdateUser).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateUser>);
    await renderProfile();

    expect(screen.getByLabelText('profile.name')).toBeDisabled();
    expect(screen.getByLabelText('profile.phone')).toBeDisabled();
    expect(screen.getByText('profile.save')).toBeDisabled();
    expect(screen.getByText('profile.readonly_note')).toBeInTheDocument();

    fireEvent.click(screen.getByText('profile.save'));
    expect(mutate).not.toHaveBeenCalled();
  });
});
