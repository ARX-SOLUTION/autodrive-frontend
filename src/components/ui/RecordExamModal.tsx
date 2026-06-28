import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateExam } from '@/services/examService';
import { CreateExamPayload, ExamType } from '@/types/exam';
import { toast } from 'sonner';

const schema = z.object({
  exam_type: z.enum(['THEORY', 'PRACTICE']),
  score: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  passed: z.boolean(),
  notes: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

type FormValues = z.infer<typeof schema>;

interface RecordExamModalProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
}

export const RecordExamModal = ({
  open,
  onClose,
  studentId,
}: RecordExamModalProps) => {
  const { t } = useTranslation();
  const createMutation = useCreateExam();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      exam_type: 'THEORY',
      score: '',
      passed: false,
      notes: '',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    const payload: CreateExamPayload = {
      student_id: studentId,
      exam_type: values.exam_type as ExamType,
      score: values.score === '' ? null : Number(values.score),
      passed: values.passed,
      notes: values.notes,
      date: new Date(values.date).toISOString(),
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(t('exams.added'));
        form.reset();
        onClose();
      },
      onError: () => {
        toast.error(t('common.error'));
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {t('exams.add_title')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="exam_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('exams.exam_type')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="THEORY">
                        {t('exams.theory')}
                      </SelectItem>
                      <SelectItem value="PRACTICE">
                        {t('exams.practice')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.date')}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="bg-secondary border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('exams.score_optional')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ''}
                      className="bg-secondary border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t('exams.passed')}</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('students.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="bg-secondary border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? t('common.saving')
                  : t('common.save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
