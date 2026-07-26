// Callers: PaymentsPage. API: Date range + onDateRangeChange. Schema: URL
// date_from/date_to. User: "davom et" (autodrive-qsgc.4).
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  CourseTypeTabs,
  type CourseTypeTab,
} from '@/components/ui/course-type-tabs';
import { formatCalendarDate, parseCalendarDate } from '@/lib/calendarDate';
import type { Branch } from '@/types/branch';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import type { DatePreset } from './dateRangePresets';

interface PaymentsFilterBarProps {
  isCrossTenant: boolean;
  branches: Branch[] | undefined;
  branchId: string | undefined;
  onBranchChange: (v: string | undefined) => void;
  paymentStatus: string;
  onStatusChange: (v: string) => void;
  paymentMethod: string;
  onMethodChange: (v: string) => void;
  courseType: string;
  onCourseTypeChange: (v: CourseTypeTab) => void;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onDateRangeChange: (from: Date | undefined, to: Date | undefined) => void;
  search: string;
  onSearchChange: (v: string) => void;
  hasAnyFilter: boolean;
  onClearAll: () => void;
  onPreset: (preset: DatePreset) => void;
}

/** SECTION 2: quick date presets + the filter/search row. */
export const PaymentsFilterBar = ({
  isCrossTenant,
  branches,
  branchId,
  onBranchChange,
  paymentStatus,
  onStatusChange,
  paymentMethod,
  onMethodChange,
  courseType,
  onCourseTypeChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  search,
  onSearchChange,
  hasAnyFilter,
  onClearAll,
  onPreset,
}: PaymentsFilterBarProps) => {
  const { t } = useTranslation();

  const presetLabels: Record<string, string> = {
    today: t('common.today'),
    week: t('common.week'),
    month: t('common.this_month'),
    lastMonth: t('common.last_month'),
    all: t('common.all_time'),
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground text-balance">
          {t('payments.filter_title')}
        </h2>
        {hasAnyFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 gap-1 text-xs"
          >
            <X className="h-3 w-3" /> {t('payments.clear_all')}
          </Button>
        )}
      </div>

      {/* Quick date presets */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(Object.entries(presetLabels) as [string, string][]).map(
          ([key, label]) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => onPreset(key as DatePreset)}
            >
              {label}
            </Button>
          ),
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {isCrossTenant && (
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => onBranchChange(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder={t('common.branch')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all_branches')}</SelectItem>
              {(branches || []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={paymentStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-44 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('payments.all_statuses')}</SelectItem>
            <SelectItem value="paid">{t('payments.paid')}</SelectItem>
            <SelectItem value="unpaid">{t('payments.unpaid')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentMethod} onValueChange={onMethodChange}>
          <SelectTrigger className="w-40 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('payments.all_types')}</SelectItem>
            <SelectItem value="naqd">{t('payments.payment_cash')}</SelectItem>
            <SelectItem value="karta">{t('payments.payment_card')}</SelectItem>
          </SelectContent>
        </Select>

        <CourseTypeTabs
          value={(courseType as CourseTypeTab) || 'all'}
          onChange={onCourseTypeChange}
        />

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

        <div className="relative flex-1 min-w-[220px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('payments.search_placeholder')}
            aria-label={t('payments.search_placeholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
      </div>
    </section>
  );
};
