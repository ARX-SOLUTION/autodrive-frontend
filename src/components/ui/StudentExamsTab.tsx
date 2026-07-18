import { useState } from 'react';
import { useStudentExams } from '@/services/examService';
import { Button } from '@/components/ui/button';
import { RecordExamModal } from './RecordExamModal';
import { Student } from '@/types/student';
import { format } from 'date-fns';
import { Plus } from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';

export const StudentExamsTab = ({ student }: { student: Student }) => {
  const { data: exams, isLoading } = useStudentExams(student.id);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-between items-center">
        <h3 className="font-heading text-lg font-semibold">
          Imtihonlar tarixi
        </h3>
        <Button onClick={() => setModalOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Yangi natija qo'shish
        </Button>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Sana
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Turi
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                Natija
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Ball
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Izoh
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
                  Hali imtihon natijalari yo'q
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
                      ? 'Nazariy'
                      : 'Amaliy'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        exam.passed
                          ? 'text-success font-medium'
                          : 'text-destructive font-medium'
                      }
                    >
                      {exam.passed ? "O'tdi" : 'Yiqildi'}
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
