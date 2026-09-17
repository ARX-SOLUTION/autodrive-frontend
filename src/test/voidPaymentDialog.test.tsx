import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VoidPaymentDialog } from '@/pages/expenses/VoidPaymentDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('VoidPaymentDialog', () => {
  it('renders dialog elements when open', () => {
    render(
      <VoidPaymentDialog
        open={true}
        loading={false}
        conflict={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByText('expenses.payments.void_title'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('expenses.payments.void_description'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('expenses.payments.void_reason'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'expenses.payments.void_confirm' }),
    ).toBeInTheDocument();
  });

  it('validates that reason is required and prevents submission if empty or whitespace', () => {
    const onConfirm = vi.fn();
    render(
      <VoidPaymentDialog
        open={true}
        loading={false}
        conflict={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByLabelText('expenses.payments.void_reason'), {
      target: { value: '   ' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.payments.void_confirm' }),
    );

    expect(
      screen.getByText('expenses.payments.void_reason_required'),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with trimmed reason when valid', () => {
    const onConfirm = vi.fn();
    render(
      <VoidPaymentDialog
        open={true}
        loading={false}
        conflict={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByLabelText('expenses.payments.void_reason'), {
      target: { value: '  Duplicate entry from card pos  ' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.payments.void_confirm' }),
    );

    expect(onConfirm).toHaveBeenCalledWith('Duplicate entry from card pos');
  });

  it('renders conflict message when conflict prop is true', () => {
    render(
      <VoidPaymentDialog
        open={true}
        loading={false}
        conflict={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByText('expenses.payments.void_conflict'),
    ).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <VoidPaymentDialog
        open={true}
        loading={false}
        conflict={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('disables input and buttons while loading', () => {
    render(
      <VoidPaymentDialog
        open={true}
        loading={true}
        conflict={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText('expenses.payments.void_reason'),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'common.cancel' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'expenses.payments.void_submitting' }),
    ).toBeDisabled();
  });
});
