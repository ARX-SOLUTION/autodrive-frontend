import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { useCreateStudentWithPayment } from '@/services/studentService';
import axiosInstance from '@/api/axiosInstance';
import type { AddStudentPayload } from '@/components/ui/AddStudentDialog';

// Regression test: AddStudentDialog's step-1 wizard fields (passport,
// birth_date, gender, address) were collected and validated correctly by
// the form, but useCreateStudentWithPayment's POST body used a fixed field
// allowlist that silently dropped them before hitting the backend.

vi.mock('@/api/axiosInstance', () => ({
  default: { post: vi.fn() },
}));

vi.mock('@/lib/umami', () => ({ track: vi.fn() }));

const buildPayload = (): AddStudentPayload => ({
  first_name: 'Aziz',
  last_name: 'Karimov',
  phone: '+998901234567',
  passport_series: 'AA',
  passport_number: '1234567',
  birth_date: '2000-01-15',
  gender: 'female',
  address: 'Tashkent, Chilonzor',
  branch_id: 'b1',
  course_id: 'c1',
  course_type: 'tezkor',
  course_price: 1000000,
  start_date: '2026-07-16',
  amount: 500000,
  payment_method: 'naqd',
  first_payment_date: '2026-07-16',
  contract_signed: true,
});

describe('useCreateStudentWithPayment payload', () => {
  it('forwards step-1 personal-info fields to the create POST body', async () => {
    (axiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 's1' },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateStudentWithPayment(), {
      wrapper,
    });

    result.current.mutate(buildPayload());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const body = (axiosInstance.post as ReturnType<typeof vi.fn>).mock
      .calls[0][1];
    expect(body).toMatchObject({
      passport_series: 'AA',
      passport_number: '1234567',
      birth_date: '2000-01-15',
      address: 'Tashkent, Chilonzor',
      gender: 'female',
      payment_method: 'naqd',
    });
    expect(body).not.toHaveProperty('payment_type');
  });
});
