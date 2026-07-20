import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudentExams } from '@/services/examService';
import { Button } from '@/components/ui/button';
import { RecordExamModal } from './RecordExamModal';
import { Student } from '@/types/student';
import { format } from 'date-fns';
import { Plus } from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';

export const StudentExamsTab = ({ student }: { student: Student }) => {
  const { t } = useTranslation();
  const { data: exams, isLoading } = useStudentExams(student.id);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-between items-center">
        <h3 className="font-heading text-lg font-semibold">
          {t('exams.history_title')}
        </h3>
        <Button onClick={() => setModalOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> {t('exams.add_title')}
        </Button>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t('common.date')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t('exams.exam_type')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                {t('exams.result')}
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                {t('exams.score')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t('exams.notes')}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-4">
                  <Skeleton className="h-5 w-full" />
                </td>
              </tr>
            ) : exams?.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  {t('exams.empty')}
                </td>
              </tr>
            ) : (
              exams?.map((exam) => (
                <tr key={exam.id} className="border-b border-border/50">
                  <td className="px-4 py-3">
                    {exam.date
                      ? format(new Date(exam.date), 'dd.MM.yyyy')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {exam.exam_type === 'THEORY' || exam.examType === 'THEORY'
                      ? t('exams.theory')
                      : t('exams.practice')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        exam.passed
                          ? 'text-success font-medium'
                          : 'text-destructive font-medium'
                      }
                    >
                      {exam.passed
                        ? t('exams.status_passed')
                        : t('exams.status_failed')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{exam.score ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {exam.notes || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RecordExamModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        studentId={student.id}
      />
    </div>
  );
};
