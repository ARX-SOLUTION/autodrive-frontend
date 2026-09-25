import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StudentLearnerLoginDialog } from '@/pages/students/StudentLearnerLoginDialog';

const mutate = vi.fn();
vi.mock('@/services/studentService', () => ({
  useUpsertLearnerAccount: () => ({
    mutate,
    isPending: false,
    reset: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('StudentLearnerLoginDialog', () => {
  beforeEach(() => {
    mutate.mockReset();
  });

  it('submits a valid password for create', async () => {
    render(
      <StudentLearnerLoginDialog
        studentId="student-a"
        hasLearnerAccount={false}
        open
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('students.detail.login_password'), {
      target: { value: 'password1' },
    });
    fireEvent.click(screen.getByText('students.detail.login_create'));
    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { id: 'student-a', password: 'password1' },
        expect.any(Object),
      ),
    );
  });
});
