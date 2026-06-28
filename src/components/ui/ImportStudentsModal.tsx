import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkCreateStudents } from '@/services/studentService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { UploadCloud } from 'lucide-react';

interface ImportStudentsModalProps {
  open: boolean;
  onClose: () => void;
}

const SAMPLE_CSV = `first_name,last_name,phone,course_type,payment_method,amount_paid,group_name,notes
John,Doe,+998901234567,tezkor,naqd,1000000,Group A,Sample note
Jane,Smith,+998909876543,avto_maktab,karta,500000,Group B,
`;

export default function ImportStudentsModal({
  open,
  onClose,
}: ImportStudentsModalProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: bulkCreateStudents,
    onSuccess: () => {
      toast.success(t('common.success') || 'Imported successfully');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['payment-snapshot'] });
      handleClose();
    },
    onError: () => {
      toast.error(t('common.error') || 'Error importing file');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    mutation.mutate(file);
  };

  const handleClose = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    onClose();
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_students.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('students.import.modal_title')}</DialogTitle>
          <DialogDescription>
            {t('students.import.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>
          <div className="text-sm text-muted-foreground flex justify-between items-center">
            <span>{t('students.import.format_help')}</span>
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={downloadSample}
            >
              {t('students.import.download_sample')}
            </Button>
          </div>
          <Button
            className="w-full gap-2"
            disabled={!file || mutation.isPending}
            onClick={handleUpload}
          >
            <UploadCloud className="h-4 w-4" />
            {mutation.isPending
              ? t('students.import.uploading')
              : t('students.import.upload_button')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
