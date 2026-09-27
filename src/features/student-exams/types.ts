export type ExamType = 'THEORY' | 'PRACTICE';

export interface ExamResult {
  id: string;
  studentId?: string;
  student_id?: string;
  examType?: ExamType;
  exam_type?: ExamType;
  score?: number | null;
  passed: boolean;
  notes?: string | null;
  date: string;
  createdAt?: string;
  created_at?: string;
}

export interface CreateExamPayload {
  student_id: string;
  exam_type: ExamType;
  score?: number | null;
  passed: boolean;
  notes?: string | null;
  date?: string;
}
