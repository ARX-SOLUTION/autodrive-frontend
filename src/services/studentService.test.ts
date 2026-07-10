import { vi, describe, it, expect, beforeEach } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { bulkCreateStudents } from './studentService';

vi.mock('@/api/axiosInstance', () => ({
  default: { post: vi.fn() },
}));

describe('bulkCreateStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes branch_id in the request FormData when provided (owner import)', async () => {
    (axiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { successCount: 1, errorCount: 0 },
    });
    const file = new File(['a,b'], 'students.csv', { type: 'text/csv' });

    await bulkCreateStudents(file, 'branch-1');

    const formData = (axiosInstance.post as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as FormData;
    expect(formData.get('branch_id')).toBe('branch-1');
    expect(formData.get('file')).toBe(file);
  });

  it('omits branch_id when none is given (branch-scoped roles)', async () => {
    (axiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { successCount: 1, errorCount: 0 },
    });
    const file = new File(['a,b'], 'students.csv', { type: 'text/csv' });

    await bulkCreateStudents(file);

    const formData = (axiosInstance.post as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as FormData;
    expect(formData.get('branch_id')).toBeNull();
  });
});
