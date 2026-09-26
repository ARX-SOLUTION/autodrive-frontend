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

  it('accepts overdue return context and lets a branch suppress company scope', () => {
    expect(
      validateExpenseDetailSearch({
        return_attention: 'overdue',
        return_branch_id: 'branch-1',
        return_scope: 'company',
      }),
    ).toMatchObject({
      return_attention: 'overdue',
      return_branch_id: 'branch-1',
      return_scope: undefined,
    });
    expect(
      validateExpenseDetailSearch({
        return_attention: 'overdue',
        return_scope: 'company',
      }),
    ).toMatchObject({
      return_attention: 'overdue',
      return_branch_id: undefined,
      return_scope: 'company',
    });
  });

  it('strips malformed return context', () => {
    expect(
      validateExpenseDetailSearch({
        return_attention: 'late',
        return_branch_id: '   ',
        return_scope: 'branch',
      }),
    ).toMatchObject({
      return_attention: undefined,
      return_branch_id: undefined,
      return_scope: undefined,
    });
  });

  it('keeps info and payments tabs', () => {
    expect(validateExpenseDetailSearch({ tab: 'info' }).tab).toBe('info');
    expect(validateExpenseDetailSearch({ tab: 'payments' }).tab).toBe(
      'payments',
    );
  });

  it('strips unknown tab and action values', () => {
    expect(
      validateExpenseDetailSearch({ tab: 'notes', action: 'pay_all' }),
    ).toEqual({
      tab: undefined,
      action: undefined,
    });
  });
});
