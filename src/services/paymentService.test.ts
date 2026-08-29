import { describe, expect, it } from 'vitest';
import {
  paymentsPageQueryOptions,
  toPaymentQueryParams,
} from './paymentService';

describe('payment page request contract', () => {
  it('maps pagination, sort and every payment filter to backend query params', () => {
    expect(
      toPaymentQueryParams({
        branchId: 'branch-1',
        courseType: 'tezkor',
        startDate: new Date(2026, 6, 1),
        endDate: new Date(2026, 6, 9),
        page: 3,
        limit: 50,
        search: '  Aziz  ',
        paymentStatus: 'paid',
        paymentMethod: 'perechisleniya',
        sortBy: 'amount_paid',
        sortOrder: 'asc',
        studentId: 'student-1',
      }),
    ).toEqual({
      branch_id: 'branch-1',
      course_type: 'tezkor',
      start_date: '2026-07-01',
      end_date: '2026-07-09',
      page: 3,
      limit: 50,
      search: 'Aziz',
      payment_status: 'paid',
      payment_method: 'perechisleniya',
      sort_by: 'amount_paid',
      sort_order: 'asc',
      student_id: 'student-1',
    });
  });

  it('keeps the full filter object in the shared page query contract', () => {
    const filters = {
      branchId: 'branch-1',
      page: 2,
      limit: 50,
      search: 'Aziz',
      sortBy: 'date',
      sortOrder: 'desc' as const,
    };

    const options = paymentsPageQueryOptions(filters, false);

    expect(options.queryKey).toEqual([
      'payments',
      'page',
      toPaymentQueryParams(filters),
    ]);
    expect(options.enabled).toBe(false);
    expect(options.queryFn).toBeTypeOf('function');
  });

  it('uses one cache entry for filters that normalize to the same request', () => {
    const raw = paymentsPageQueryOptions({
      search: '  Aziz  ',
      startDate: new Date(2026, 6, 1, 8),
      courseType: 'unsupported',
      paymentMethod: 'unsupported',
      sortBy: 'unsupported',
    });
    const normalized = paymentsPageQueryOptions({
      search: 'Aziz',
      startDate: new Date(2026, 6, 1, 20),
    });

    expect(raw.queryKey).toEqual(normalized.queryKey);
  });
});
