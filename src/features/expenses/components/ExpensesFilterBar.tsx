import { useId, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';
import { formatCalendarDate, parseCalendarDate } from '@/lib/calendarDate';
import type { ExpenseBranchOption } from '@/features/expenses/types';
import { CaretUpDown, Check, X } from '@phosphor-icons/react';

interface ExpensesFilterBarProps {
  branches: ExpenseBranchOption[];
  showBranchFilter?: boolean;
  fixedBranchLabel?: string;
  branchFilter: string;
  onBranchFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  statusFilter: string;
  attentionFilter?: 'overdue';
  onStatusFilterChange: (value: string) => void;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onDateRangeChange: (from: Date | undefined, to: Date | undefined) => void;
  hasAnyFilter: boolean;
  onClearAll: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
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
  attentionFilter,
  onStatusFilterChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  hasAnyFilter,
  onClearAll,
  headingRef,
}: ExpensesFilterBarProps) => {
  const { t } = useTranslation();
  const [branchOpen, setBranchOpen] = useState(false);
  const branchListId = useId();
  const selectedBranchLabel =
    branchFilter === 'all'
      ? t('common.all')
      : branchFilter === 'company'
        ? t('expenses.form.company_wide')
        : (branches.find((branch) => branch.id === branchFilter)?.name ??
          t('common.branch'));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-sm font-semibold text-foreground"
          >
            {t('expenses.list_title')}
          </h2>
          {attentionFilter === 'overdue' && (
            <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              {t('expenses.daily_brief.overdue_filter')}
            </span>
          )}
        </div>
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
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {t('common.branch')}
            </span>
            <Popover open={branchOpen} onOpenChange={setBranchOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-label={t('common.branch')}
                  aria-expanded={branchOpen}
                  aria-controls={branchListId}
                  className="h-10 w-56 max-w-full justify-between gap-2 border-border bg-secondary font-normal"
                >
                  <span className="truncate">{selectedBranchLabel}</span>
                  <CaretUpDown
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] p-0"
              >
                <Command>
                  <CommandInput
                    aria-label={t('common.branch')}
                    placeholder={t('common.search')}
                  />
                  <CommandList id={branchListId}>
                    <CommandEmpty>{t('common.no_data')}</CommandEmpty>
                    <CommandGroup>
                      {[
                        { id: 'all', name: t('common.all') },
                        {
                          id: 'company',
                          name: t('expenses.form.company_wide'),
                        },
                        ...branches,
                      ].map((branch) => (
                        <CommandItem
                          key={branch.id}
                          value={branch.name + ' ' + branch.id}
                          onSelect={() => {
                            onBranchFilterChange(branch.id);
                            setBranchOpen(false);
                          }}
                        >
                          <Check
                            aria-hidden
                            className={cn(
                              'mr-2 h-4 w-4',
                              branchFilter === branch.id
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <span className="truncate">{branch.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
        />
      </div>
    </section>
  );
};
