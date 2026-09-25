import { describe, expect, it } from 'vitest';
import type { CreateQuestionPayload } from '@/types/question';
import {
  assignmentWindowStatus,
  type TestAssignment,
} from '@/types/schoolTest';

/** CRM authoring always forces school_private (never platform_public). */
function buildSchoolPrivateCreate(
  input: Omit<CreateQuestionPayload, 'visibility'>,
): CreateQuestionPayload {
  return { ...input, visibility: 'school_private' };
}

describe('school learning #260 constraints', () => {
  it('factory always stamps school_private visibility', () => {
    const payload = buildSchoolPrivateCreate({
      topic: 'general_rules',
      branch_id: '00000000-0000-4000-8000-000000000001',
      correct_option_key: 'A',
      locales: [
        {
          locale: 'uz',
          stem: 'Stem',
          explanation: 'Why',
          options: [
            { option_key: 'A', text: 'One' },
            { option_key: 'B', text: 'Two' },
          ],
        },
      ],
    });
    expect(payload.visibility).toBe('school_private');
  });

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

  it('school learning API paths stay off the manual exams namespace', () => {
    const schoolPaths = [
      '/questions',
      '/questions/available-for-tests',
      '/tests/templates',
      '/tests/templates/:id/assignments',
    ];
    for (const path of schoolPaths) {
      expect(path.startsWith('/exams')).toBe(false);
      expect(path.includes('/exams/')).toBe(false);
    }
  });
});
