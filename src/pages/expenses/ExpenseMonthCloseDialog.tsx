import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchExpenseMonthCloseCsv } from '@/services/expenseService';
import type { ExpenseBranchOption } from '@/types/expense';

const DEFAULT_FILENAME = 'expenses-month-close.csv';

const decodeFilename = (value: string) => {
  const encodedValue = value.replace(/^UTF-8'[^']*'/i, '');
  try {
    return decodeURIComponent(encodedValue);
  } catch {
    return undefined;
  }
};

const sanitizeFilename = (value: string | undefined) => {
  const filename = value
    ?.trim()
    .replace(/[\\/:*?"<>|\u0000-\u001F\u007F]/g, '_');
  if (!filename || filename === '.' || filename === '..') {
    return DEFAULT_FILENAME;
  }
  return filename.toLowerCase().endsWith('.csv') ? filename : DEFAULT_FILENAME;
};

export const getExpenseMonthCloseFilename = (contentDisposition?: string) => {
  if (!contentDisposition) return DEFAULT_FILENAME;

  const encodedMatch = contentDisposition.match(
    /(?:^|;)\s*filename\*\s*=\s*([^;]+)/i,
  );
  if (encodedMatch) {
    const encodedFilename = encodedMatch[1].trim().replace(/^"|"$/g, '');
    const decodedFilename = decodeFilename(encodedFilename);
    if (decodedFilename) return sanitizeFilename(decodedFilename);
  }

  const filenameMatch = contentDisposition.match(
    /(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;]*))/i,
  );
  return sanitizeFilename(filenameMatch?.[1] ?? filenameMatch?.[2]);
};

interface ExpenseMonthCloseDialogProps {
  open: boolean;
  branches: ExpenseBranchOption[];
  onClose: () => void;
}

export const ExpenseMonthCloseDialog = ({
  open,
  branches,
  onClose,
}: ExpenseMonthCloseDialogProps) => {
  const { t } = useTranslation();
  const [month, setMonth] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!month || isDownloading) return;

    setIsDownloading(true);
    try {
      const { blob, contentDisposition } = await fetchExpenseMonthCloseCsv({
        month,
        ...(branchId ? { branchId } : {}),
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      try {
        anchor.href = url;
        anchor.download = getExpenseMonthCloseFilename(contentDisposition);
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
      } finally {
        anchor.remove();
        URL.revokeObjectURL(url);
      }
      toast.success(t('expenses.month_close.success'));
      onClose();
    } catch {
      toast.error(t('expenses.month_close.error'));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isDownloading) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('expenses.month_close.title')}</DialogTitle>
          <DialogDescription>
            {t('expenses.month_close.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="expense-month-close-month"
              className="text-sm font-medium"
            >
              {t('expenses.month_close.month')}
            </label>
            <Input
              id="expense-month-close-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              required
              disabled={isDownloading}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="expense-month-close-branch"
              className="text-sm font-medium"
            >
              {t('expenses.month_close.branch')}
            </label>
            <select
              id="expense-month-close-branch"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              disabled={isDownloading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{t('expenses.month_close.all_branches')}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isDownloading || !month}>
              {isDownloading
                ? t('expenses.month_close.downloading')
                : t('expenses.month_close.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
