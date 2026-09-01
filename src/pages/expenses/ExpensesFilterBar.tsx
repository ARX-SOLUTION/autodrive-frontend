import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { formatCalendarDate, parseCalendarDate } from '@/lib/calendarDate';
import type { ExpenseBranchOption } from '@/types/expense';
import { X } from '@phosphor-icons/react';

interface ExpensesFilterBarProps {
  branches: ExpenseBranchOption[];
  showBranchFilter?: boolean;
  fixedBranchLabel?: string;
  branchFilter: string;
  onBranchFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onDateRangeChange: (from: Date | undefined, to: Date | undefined) => void;
  hasAnyFilter: boolean;
  onClearAll: () => void;
}

export const ExpensesFilterBar = ({
  branches,
  showBranchFilter = true,
  fixedBranchLabel,
  branchFilter,
  onBranchFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  hasAnyFilter,
  onClearAll,
}: ExpensesFilterBarProps) => {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground text-balance">
          {t('expenses.list_title')}
        </h2>
        {hasAnyFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 gap-1 text-xs"
          >
            <X className="h-3 w-3" /> {t('common.clear_all')}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showBranchFilter ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t('common.branch')}
            </span>
            <Select value={branchFilter} onValueChange={onBranchFilterChange}>
              <SelectTrigger
                aria-label={t('common.branch')}
                className="w-56 bg-secondary border-border"
              >
                <SelectValue placeholder={t('common.branch')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="company">
                  {t('expenses.form.company_wide')}
                </SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
            {t('expenses.table.branch')}: {fixedBranchLabel ?? t('common.na')}
          </span>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t('expenses.table.category')}
          </span>
          <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
            <SelectTrigger
              aria-label={t('expenses.table.category')}
              className="w-48 bg-secondary border-border"
            >
              <SelectValue placeholder={t('expenses.table.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="rent">
                {t('expenses.category.rent')}
              </SelectItem>
              <SelectItem value="utilities">
                {t('expenses.category.utilities')}
              </SelectItem>
              <SelectItem value="vehicle">
                {t('expenses.category.vehicle')}
              </SelectItem>
              <SelectItem value="marketing">
                {t('expenses.category.marketing')}
              </SelectItem>
              <SelectItem value="supplies">
                {t('expenses.category.supplies')}
              </SelectItem>
              <SelectItem value="administrative">
                {t('expenses.category.administrative')}
              </SelectItem>
              <SelectItem value="other">
                {t('expenses.category.other')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t('expenses.table.status')}
          </span>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger
              aria-label={t('expenses.table.status')}
              className="w-44 bg-secondary border-border"
            >
              <SelectValue placeholder={t('expenses.table.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="planned">
                {t('expenses.status.planned')}
              </SelectItem>
              <SelectItem value="partially_paid">
                {t('expenses.status.partially_paid')}
              </SelectItem>
              <SelectItem value="paid">{t('expenses.status.paid')}</SelectItem>
              <SelectItem value="cancelled">
                {t('expenses.status.cancelled')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DateRangePicker
          from={dateFrom ? formatCalendarDate(dateFrom) : undefined}
          to={dateTo ? formatCalendarDate(dateTo) : undefined}
          onChange={(from, to) =>
            onDateRangeChange(
              from ? parseCalendarDate(from) : undefined,
              to ? parseCalendarDate(to) : undefined,
            )
          }
          aria-label={t('common.date')}
          className="rounded-md border border-border bg-secondary px-2 py-1"
        />
      </div>
    </section>
  );
};
