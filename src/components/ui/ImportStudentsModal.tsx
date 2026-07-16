import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bulkCreateStudents,
  useCheckStudentPhones,
} from '@/services/studentService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { UploadCloud, AlertTriangle, X } from 'lucide-react';
import { track } from '@/lib/umami';
import { useIsCrossTenant } from '@/hooks/useCan';
import { extractErrorMessage } from '@/lib/errors';
import { studentKeys, dashboardKeys, paymentKeys } from '@/lib/queryKeys';
import type { CourseType } from '@/types/student';

interface ImportStudentsModalProps {
  open: boolean;
  onClose: () => void;
  branchId?: string;
}

interface ParsedRow {
  rowIndex: number;
  firstName: string;
  lastName: string;
  phone: string;
  courseType: string;
  error: 'missing' | 'course_type' | null;
}

interface BulkCreateError {
  row: number;
  data: Record<string, string>;
  error: string;
}

const VALID_COURSE_TYPES: CourseType[] = ['tezkor', 'avto_maktab'];

// ponytail: 4 flat columns, no quoted-CSV edge cases per task -- plain split
// is enough, no csv-parser dependency.
const parseCsvRows = (text: string): ParsedRow[] =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(1) // drop header row
    .map((line, i) => {
      const [firstName = '', lastName = '', phone = '', courseType = ''] = line
        .split(',')
        .map((c) => c.trim());
      const error: ParsedRow['error'] =
        !firstName || !lastName || !phone || !courseType
          ? 'missing'
          : !VALID_COURSE_TYPES.includes(courseType as CourseType)
            ? 'course_type'
            : null;
      return { rowIndex: i + 1, firstName, lastName, phone, courseType, error };
    });

const SAMPLE_CSV = `firstName,lastName,phone,courseType
John,Doe,+998901234567,tezkor
Jane,Smith,+998909876543,avto_maktab
`;

export default function ImportStudentsModal({
  open,
  onClose,
  branchId,
}: ImportStudentsModalProps) {
  const { t } = useTranslation();
  const isCrossTenant = useIsCrossTenant();
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [existingPhones, setExistingPhones] = useState<Set<string>>(new Set());
  const [dupWarningDismissed, setDupWarningDismissed] = useState(false);
  const [importErrors, setImportErrors] = useState<BulkCreateError[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const checkPhones = useCheckStudentPhones();
  // Cross-tenant roles (owner/dev) span multiple branches — bulk-create needs
  // to know which one. Managers/operators/teachers are already scoped server-side.
  const branchRequired = isCrossTenant && !branchId;

  const mutation = useMutation({
    mutationFn: (f: File) => bulkCreateStudents(f, branchId),
    onSuccess: (res) => {
      const {
        successCount = 0,
        errorCount = 0,
        errors = [],
      } = res?.data ?? res ?? {};
      if (errorCount > 0 && successCount === 0) {
        toast.error(t('common.error'));
      } else if (errorCount > 0) {
        toast.warning(
          t('students.import.partial', {
            success: successCount,
            errors: errorCount,
          }),
        );
      } else {
        toast.success(t('students.import.success', { count: successCount }));
      }
      if (successCount > 0) track('import_students', { count: successCount });
      qc.invalidateQueries({ queryKey: studentKeys.all });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      qc.invalidateQueries({ queryKey: paymentKeys.all });
      setImportErrors(errors);
      // Only auto-close on a clean run -- a partial/full failure leaves the
      // per-row errors table (below) visible for review.
      if (errorCount === 0) handleClose();
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, t('common.error')));
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setImportErrors([]);
    setDupWarningDismissed(false);

    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsvRows(String(reader.result ?? ''));
      setPreviewRows(rows);
      const phones = [...new Set(rows.map((r) => r.phone).filter(Boolean))];
      if (phones.length === 0) {
        setExistingPhones(new Set());
        return;
      }
      checkPhones.mutate(phones, {
        onSuccess: (res) => setExistingPhones(new Set(res.existing_phones)),
      });
    };
    reader.readAsText(f);
  };

  const handleUpload = () => {
    if (!file) return;
    mutation.mutate(file);
  };

  const handleClose = () => {
    setFile(null);
    setPreviewRows([]);
    setExistingPhones(new Set());
    setImportErrors([]);
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

  const dupRows = previewRows.filter(
    (r) => r.phone && existingPhones.has(r.phone),
  );

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {previewRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t('students.import.preview.title', {
                  count: previewRows.length,
                })}
              </p>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t('students.import.preview.first_name')}
                      </TableHead>
                      <TableHead>
                        {t('students.import.preview.last_name')}
                      </TableHead>
                      <TableHead>
                        {t('students.import.preview.phone')}
                      </TableHead>
                      <TableHead>
                        {t('students.import.preview.course_type')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((r) => (
                      <TableRow
                        key={r.rowIndex}
                        className={r.error ? 'bg-destructive/10' : undefined}
                      >
                        <TableCell>{r.firstName || '—'}</TableCell>
                        <TableCell>{r.lastName || '—'}</TableCell>
                        <TableCell>{r.phone || '—'}</TableCell>
                        <TableCell>
                          {r.courseType || '—'}
                          {r.error && (
                            <span className="block text-xs text-destructive">
                              {t(`students.import.preview.error_${r.error}`)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {dupRows.length > 0 && !dupWarningDismissed && (
            <div className="flex items-start justify-between gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium text-warning">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {t('students.import.duplicate_warning.title')}
                </div>
                <p className="text-muted-foreground">
                  {t('students.import.duplicate_warning.desc')}
                </p>
                <ul className="space-y-1">
                  {dupRows.map((r) => (
                    <li key={r.rowIndex}>
                      {r.lastName} {r.firstName} · {r.phone}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setDupWarningDismissed(true)}
                aria-label={t('common.close')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <Button
            className="w-full gap-2"
            disabled={!file || mutation.isPending || branchRequired}
            onClick={handleUpload}
          >
            <UploadCloud className="h-4 w-4" />
            {mutation.isPending
              ? t('students.import.uploading')
              : t('students.import.upload_button')}
          </Button>
          {branchRequired && (
            <p className="text-sm text-destructive">
              {t('students.import.branch_required')}
            </p>
          )}

          {importErrors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">
                {t('students.import.errors.title')}
              </p>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('students.import.errors.row')}</TableHead>
                      <TableHead>{t('students.import.errors.data')}</TableHead>
                      <TableHead>
                        {t('students.import.errors.message')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importErrors.map((e) => (
                      <TableRow key={e.row}>
                        <TableCell>{e.row}</TableCell>
                        <TableCell>
                          {e.data?.phone ??
                            `${e.data?.firstName ?? ''} ${e.data?.lastName ?? ''}`.trim()}
                        </TableCell>
                        <TableCell className="text-destructive">
                          {e.error}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
