import { describe, expect, it } from 'vitest';
import { canSubmitInspection, canReviewInspection } from './policy';
describe('inspection actions', () => {
  it('requires all five evidence slots unless management supplies a reason', () => {
    expect(canSubmitInspection(['front'], 'teacher', '')).toBe(false);
    expect(canSubmitInspection(['front'], 'manager', 'Emergency')).toBe(true);
    expect(canSubmitInspection(['front'], 'teacher', 'Emergency')).toBe(false);
    expect(
      canSubmitInspection(
        ['front', 'back', 'left', 'right', 'odometer'],
        'teacher',
        '',
      ),
    ).toBe(true);
  });
  it('allows only management or the other intended receiver to approve', () => {
    const row = { status: 'submitted', author_id: 'a', receiver_id: 'b' };
    expect(canReviewInspection(row, 'teacher', 'a')).toBe(false);
    expect(canReviewInspection(row, 'teacher', 'b')).toBe(true);
    expect(canReviewInspection(row, 'teacher', 'c')).toBe(false);
    expect(
      canReviewInspection({ ...row, status: 'draft' }, 'manager', 'b'),
    ).toBe(false);
    expect(canReviewInspection(row, 'accountant', 'b')).toBe(false);
  });
});
