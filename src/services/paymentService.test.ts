import { describe, expect, it } from 'vitest';
import { toPaymentQueryParams } from './paymentService';

describe('toPaymentQueryParams', () => {
  it('maps branch, course and date filters to backend query params', () => {
    expect(
      toPaymentQueryParams({
        branchId: 'branch-1',
        courseType: 'tezkor',
        startDate: new Date(2026, 6, 1),
        endDate: new Date(2026, 6, 9),
      }),
    ).toEqual({
      branch_id: 'branch-1',
      course_type: 'tezkor',
      startDate: '2026-07-01',
      endDate: '2026-07-09',
    });
  });
});
