import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StudentExamsTab } from '@/components/ui/StudentExamsTab';
import type { Student } from '@/types/student';
import type { ExamResult } from '@/types/exam';

// autodrive-52v.5: this whole tab was never wired to i18n at all (no
// useTranslation import) -- every string, including the pass/fail status
// word, was a hardcoded Uzbek literal shown regardless of the active locale.

const EXAMS: ExamResult[] = [
  {
    id: 'e1',
    exam_type: 'THEORY',
    passed: true,
    score: 90,
    notes: 'Good',
    date: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'e2',
    exam_type: 'PRACTICE',
    passed: false,
    score: 40,
    notes: null,
    date: '2026-07-05T00:00:00.000Z',
  },
];

vi.mock('@/services/examService', () => ({
  useStudentExams: () => ({ data: EXAMS, isLoading: false }),
}));

// Heavy modal, not under test here (same seam as groupDetailPage.test.tsx's
// StudentModal mock).
vi.mock('@/components/ui/RecordExamModal', () => ({
  RecordExamModal: () => null,
}));

describe('StudentExamsTab i18n', () => {
  it('renders headings and pass/fail status via t(), not hardcoded Uzbek', () => {
    render(<StudentExamsTab student={{ id: 's1' } as unknown as Student} />);

    expect(screen.getByText('exams.history_title')).toBeTruthy();
    expect(screen.getByText('exams.add_title')).toBeTruthy();
    expect(screen.getByText('exams.status_passed')).toBeTruthy();
    expect(screen.getByText('exams.status_failed')).toBeTruthy();
    // Old hardcoded literals must be gone.
    expect(screen.queryByText('Imtihonlar tarixi')).toBeNull();
    expect(screen.queryByText("O'tdi")).toBeNull();
    expect(screen.queryByText('Yiqildi')).toBeNull();
  });
});
