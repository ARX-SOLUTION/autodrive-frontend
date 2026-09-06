import { describe, expect, it } from 'vitest';
import { validateExpenseDetailSearch } from '@/routes/_authenticated.expenses.$id';

describe('expense detail route search', () => {
  it('accepts the exact payments pay-remaining intent', () => {
    expect(
      validateExpenseDetailSearch({
        tab: 'payments',
        action: 'pay_remaining',
      }),
    ).toEqual({ tab: 'payments', action: 'pay_remaining' });
  });

  it('strips unknown tab and action values', () => {
    expect(
      validateExpenseDetailSearch({ tab: 'info', action: 'pay_all' }),
    ).toEqual({
      tab: undefined,
      action: undefined,
    });
  });
});
