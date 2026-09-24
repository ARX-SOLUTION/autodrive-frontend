import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StudentPortalInvitationDialog } from '@/pages/students/StudentPortalInvitationDialog';

const mutation = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('@/services/studentService', () => ({
  useIssueLearnerInvitation: () => mutation,
}));

afterEach(() => {
  mutation.isPending = false;
  mutation.mutate.mockReset();
  mutation.reset.mockReset();
  vi.unstubAllEnvs();
});

it('keeps the only new invitation link available while the request is pending', async () => {
  vi.stubEnv('VITE_STUDENT_PORTAL_URL', 'https://student.automaktab.uz');
  const onClose = vi.fn();
  const view = () => (
    <StudentPortalInvitationDialog
      studentId="student-1"
      open
      onClose={onClose}
    />
  );
  const { rerender } = render(view());

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'learner@example.com' },
  });
  fireEvent.click(screen.getByText('students.detail.invite_create'));
  expect(mutation.mutate).toHaveBeenCalledOnce();

  mutation.isPending = true;
  rerender(view());
  expect(screen.getByText('common.cancel')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();

  const callbacks = mutation.mutate.mock.calls[0]?.[1] as {
    onSuccess: (result: { token: string }) => void;
  };
  act(() => {
    mutation.isPending = false;
    rerender(view());
    callbacks.onSuccess({ token: 'new-secret-token' });
  });
  expect(
    await screen.findByDisplayValue(
      'https://student.automaktab.uz/accept-invitation#token=new-secret-token',
    ),
  ).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});
