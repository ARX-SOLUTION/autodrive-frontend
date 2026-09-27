import { describe, expect, it } from 'vitest';
import {
  assignmentWindowStatus,
  type TestAssignment,
} from '@/features/school-tests/types';

describe('assignment window status', () => {
  it('assignment window status reflects availability bounds', () => {
    const base: TestAssignment = {
      id: 'a1',
      template_id: 't1',
      company_id: 'c1',
      branch_id: 'b1',
      group_id: 'g1',
      student_id: null,
      assigned_by_id: 'u1',
      available_from: null,
      available_until: null,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const now = new Date('2026-06-01T12:00:00.000Z');
    expect(assignmentWindowStatus(base, now)).toBe('open');
    expect(
      assignmentWindowStatus(
        { ...base, available_from: '2026-07-01T00:00:00.000Z' },
        now,
      ),
    ).toBe('scheduled');
    expect(
      assignmentWindowStatus(
        { ...base, available_until: '2026-05-01T00:00:00.000Z' },
        now,
      ),
    ).toBe('closed');
  });
});
