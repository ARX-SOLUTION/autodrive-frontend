// Callers: PaymentsPage. API: Date range + onDateRangeChange. Schema: URL
// date_from/date_to. User: "davom et" (autodrive-qsgc.4).
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  CourseTypeTabs,
  type CourseTypeTab,
} from '@/components/ui/course-type-tabs';
import { formatCalendarDate, parseCalendarDate } from '@/lib/calendarDate';
import { useFilterBarState } from '@/hooks/useFilterBarState';
import { SearchWithHotkey } from '@/components/filter/SearchWithHotkey';
import { ActiveFilterChips } from '@/components/filter/ActiveFilterChips';
import { MobileFilterSheet } from '@/components/filter/MobileFilterSheet';
import type { Branch } from '@/features/branches/types';
import type { DatePreset } from '@/features/payments/lib/dateRangePresets';

export interface PaymentsFilterBarProps {
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
  onPreset?: (preset: DatePreset) => void;
}

/**
 * Filter bar for PaymentsPage: compact 1-row layout on desktop,
 * mobile drawer sheet on small screens, integrated presets in DateRangePicker,
 * and active filter chips.
 */
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
  onClearAll,
}: PaymentsFilterBarProps) => {
  const { t } = useTranslation();

  const selectedBranch = branchId
    ? branches?.find((b) => b.id === branchId)
    : undefined;
  const branchLabel = selectedBranch?.name || branchId;

  const dateLabel =
    dateFrom && dateTo
      ? `${formatCalendarDate(dateFrom)}, ${formatCalendarDate(dateTo)}`
      : dateFrom
        ? `${formatCalendarDate(dateFrom)}`
        : dateTo
          ? `${formatCalendarDate(dateTo)}`
          : undefined;

  const { chips, activeCount, isMobileOpen, setIsMobileOpen, clearAll } =
    useFilterBarState({
      filters: [
        Boolean(isCrossTenant && branchId) && {
          id: 'branch',
          label: t('common.branch'),
          value: branchLabel ?? '',
          onRemove: () => onBranchChange(undefined),
        },
        paymentStatus !== 'all' && {
          id: 'status',
          label: t('common.status'),
          value: t(
            paymentStatus === 'paid' ? 'payments.paid' : 'payments.unpaid',
            { defaultValue: paymentStatus },
          ),
          onRemove: () => onStatusChange('all'),
        },
        paymentMethod !== 'all' && {
          id: 'method',
          label: t('payments.payment_method'),
          value: t(`payments.payment_${paymentMethod}`, {
            defaultValue: paymentMethod,
          }),
          onRemove: () => onMethodChange('all'),
        },
        courseType !== 'all' && {
          id: 'course_type',
          label: t('common.course_type'),
          value: t(`courses.types.${courseType}`, { defaultValue: courseType }),
          onRemove: () => onCourseTypeChange('all'),
        },
        Boolean(dateFrom || dateTo) && {
          id: 'date',
          label: t('common.date'),
          value: dateLabel ?? '',
          onRemove: () => onDateRangeChange(undefined, undefined),
        },
        Boolean(search.trim().length > 0) && {
          id: 'search',
          label: t('common.search'),
          value: search,
          onRemove: () => onSearchChange(''),
        },
      ],
      onClearAll,
    });

  return (
    <section aria-label={t('payments.filter_title')} className="space-y-2">
      {/* Mobile filter bar: Search + Mobile Filter Sheet */}
      <div className="flex md:hidden items-center gap-2 w-full">
        <SearchWithHotkey
          value={search}
          onChange={onSearchChange}
          placeholder={t('payments.search_placeholder')}
          aria-label={t('payments.search_placeholder')}
        />
        <MobileFilterSheet
          open={isMobileOpen}
          onOpenChange={setIsMobileOpen}
          activeCount={activeCount}
          onClearAll={clearAll}
        >
          {isMobileOpen && (
            <div className="flex flex-col gap-4">
              {isCrossTenant && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    {t('common.branch')}
                  </Label>
                  <Select
                    value={branchId || 'all'}
                    onValueChange={(v) =>
                      onBranchChange(v === 'all' ? undefined : v)
                    }
                  >
                    <SelectTrigger
                      aria-label={t('common.branch')}
                      className="w-full bg-secondary border-border"
                    >
                      <SelectValue placeholder={t('common.branch')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t('common.all_branches')}
                      </SelectItem>
                      {(branches || []).map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('common.status')}
                </Label>
                <Select value={paymentStatus} onValueChange={onStatusChange}>
                  <SelectTrigger
                    aria-label={t('common.status')}
                    className="w-full bg-secondary border-border"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('payments.all_statuses')}
                    </SelectItem>
                    <SelectItem value="paid">{t('payments.paid')}</SelectItem>
                    <SelectItem value="unpaid">
                      {t('payments.unpaid')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('payments.payment_method')}
                </Label>
                <Select value={paymentMethod} onValueChange={onMethodChange}>
                  <SelectTrigger
                    aria-label={t('payments.payment_method')}
                    className="w-full bg-secondary border-border"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('payments.all_types')}
                    </SelectItem>
                    <SelectItem value="naqd">
                      {t('payments.payment_cash')}
                    </SelectItem>
                    <SelectItem value="karta">
                      {t('payments.payment_card')}
                    </SelectItem>
                    <SelectItem value="perechisleniya">
                      {t('payments.payment_transfer')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('common.course_type')}
                </Label>
                <CourseTypeTabs
                  value={(courseType as CourseTypeTab) || 'all'}
                  onChange={onCourseTypeChange}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('common.date')}
                </Label>
                <DateRangePicker
                  from={dateFrom ? formatCalendarDate(dateFrom) : undefined}
                  to={dateTo ? formatCalendarDate(dateTo) : undefined}
                  onChange={(from, to) =>
                    onDateRangeChange(
                      from ? parseCalendarDate(from) : undefined,
                      to ? parseCalendarDate(to) : undefined,
                    )
                  }
                  showPresets
                  aria-label={t('common.date')}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </MobileFilterSheet>
      </div>

      {/* Desktop compact 1-row layout */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        {isCrossTenant && (
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => onBranchChange(v === 'all' ? undefined : v)}
          >
            <SelectTrigger
              aria-label={t('common.branch')}
              className="w-40 bg-secondary border-border"
            >
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
          <SelectTrigger
            aria-label={t('common.status')}
            className="w-40 bg-secondary border-border"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('payments.all_statuses')}</SelectItem>
            <SelectItem value="paid">{t('payments.paid')}</SelectItem>
            <SelectItem value="unpaid">{t('payments.unpaid')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentMethod} onValueChange={onMethodChange}>
          <SelectTrigger
            aria-label={t('payments.payment_method')}
            className="w-40 bg-secondary border-border"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('payments.all_types')}</SelectItem>
            <SelectItem value="naqd">{t('payments.payment_cash')}</SelectItem>
            <SelectItem value="karta">{t('payments.payment_card')}</SelectItem>
            <SelectItem value="perechisleniya">
              {t('payments.payment_transfer')}
            </SelectItem>
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
          showPresets
          aria-label={t('common.date')}
        />

        <SearchWithHotkey
          value={search}
          onChange={onSearchChange}
          placeholder={t('payments.search_placeholder')}
          aria-label={t('payments.search_placeholder')}
          className="min-w-[200px]"
        />
      </div>

      {/* Active filter chips with clear all */}
      <ActiveFilterChips chips={chips} onClearAll={clearAll} />
    </section>
  );
};

export default PaymentsFilterBar;
