import { useEffect, useRef, useState, type FormEvent } from 'react';
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
import {
  fetchExpenseMonthCloseCsv,
  getExpenseMonthCloseFilename,
} from '@/services/expenseService';
import type { ExpenseBranchOption } from '@/types/expense';

interface ExpenseMonthCloseDialogProps {
  open: boolean;
  branches: ExpenseBranchOption[];
  isBranchesLoading: boolean;
  isBranchesError: boolean;
  onRetryBranches: () => void;
  onClose: () => void;
}

export const ExpenseMonthCloseDialog = ({
  open,
  branches,
  isBranchesLoading,
  isBranchesError,
  onRetryBranches,
  onClose,
}: ExpenseMonthCloseDialogProps) => {
  const { t } = useTranslation();
  const [month, setMonth] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const areBranchesResolved = !isBranchesLoading && !isBranchesError;
  const requestControllerRef = useRef<AbortController | null>(null);
  const isDownloadingRef = useRef(false);
  const isSelectedBranchAllowed =
    !branchId || branches.some((branch) => branch.id === branchId);

  useEffect(() => {
    if (!open) requestControllerRef.current?.abort();
    return () => requestControllerRef.current?.abort();
  }, [open]);

  useEffect(() => {
    if (areBranchesResolved && !isSelectedBranchAllowed) {
      setBranchId('');
    }
  }, [areBranchesResolved, isSelectedBranchAllowed]);

  const handleClose = () => {
    requestControllerRef.current?.abort();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !month ||
      !areBranchesResolved ||
      !isSelectedBranchAllowed ||
      isDownloadingRef.current
    )
      return;

    const controller = new AbortController();
    requestControllerRef.current = controller;
    isDownloadingRef.current = true;
    setIsDownloading(true);
    try {
      const { blob, contentDisposition } = await fetchExpenseMonthCloseCsv(
        {
          month,
          ...(branchId ? { branchId } : {}),
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;

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
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      }
      toast.success(t('expenses.month_close.success'));
      onClose();
    } catch {
      if (!controller.signal.aborted) {
        toast.error(t('expenses.month_close.error'));
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
      isDownloadingRef.current = false;
      setIsDownloading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
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
              disabled={
                isDownloading ||
                !areBranchesResolved ||
                !isSelectedBranchAllowed
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{t('expenses.month_close.all_branches')}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {isBranchesLoading && (
              <p className="text-sm text-muted-foreground" role="status">
                {t('common.loading')}
              </p>
            )}
            {isBranchesError && (
              <div
                className="flex items-center justify-between gap-3"
                role="alert"
              >
                <span className="text-sm text-destructive">
                  {t('common.error')}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetryBranches}
                >
                  {t('common.retry')}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isDownloading || !month || !areBranchesResolved}
            >
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
