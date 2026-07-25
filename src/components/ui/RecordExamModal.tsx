import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { extractErrorMessage } from '@/lib/errors';

const schema = z.object({
  exam_type: z.enum(['THEORY', 'PRACTICE']),
  // Blank must mean "no score", not 0 — z.coerce.number() turns '' into 0,
  // so map ''/null to undefined BEFORE coercion.
  score: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(0).max(100).optional(),
  ),
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

  // react-hooks/purity: Date.now() can't be called directly during render.
  // useForm()'s defaultValues are only ever read once, at mount (RHF ignores
  // the object on later renders unless form.reset() is called) -- so this is
  // the "now at first render" case, same as useState(() => Date.now())'s
  // lazy initializer: computed once, at the same logical moment RHF would
  // have used it anyway.
  const [defaultExamDate] = useState(
    () =>
      // ponytail: shift by UZ+5 before reading the UTC date so 00:00-04:59
      // Tashkent time doesn't read as yesterday (mirrors PaymentsPage's today()).
      new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().split('T')[0],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      exam_type: 'THEORY',
      score: undefined,
      passed: false,
      notes: '',
      date: defaultExamDate,
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    const payload: CreateExamPayload = {
      student_id: studentId,
      exam_type: values.exam_type as ExamType,
      passed: values.passed,
      notes: values.notes,
      date: new Date(values.date).toISOString(),
    };
    if (values.score !== undefined) {
      payload.score = values.score;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(t('exams.added'));
        form.reset();
        onClose();
      },
      onError: (err) => {
        toast.error(extractErrorMessage(err, t('common.error')));
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
          <DialogDescription className="sr-only">
            {t('exams.add_desc')}
          </DialogDescription>
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
