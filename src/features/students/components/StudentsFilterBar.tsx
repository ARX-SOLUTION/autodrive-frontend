// Callers: StudentsPage. API: Date dateFrom/dateTo + setDateRange(Date?, Date?).
// Schema: URL date_from/date_to YYYY-MM-DD unchanged. User: "davom et" (qsgc.4).
import { useTranslation } from 'react-i18next';
import {
  CourseTypeTabs,
  type CourseTypeTab,
} from '@/components/ui/course-type-tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Funnel } from '@phosphor-icons/react';
import { formatCalendarDate, parseCalendarDate } from '@/lib/calendarDate';
import { useFilterBarState } from '@/hooks/useFilterBarState';
import { SearchWithHotkey } from '@/components/filter/SearchWithHotkey';
import { ActiveFilterChips } from '@/components/filter/ActiveFilterChips';
import { MobileFilterSheet } from '@/components/filter/MobileFilterSheet';
import type { Branch } from '@/features/branches/types';
import type { User } from '@/features/staff/types';
import type { StudentStatus } from '@/features/students/types';

export interface StudentsFilterBarProps {
  courseType: CourseTypeTab;
  setCourseType: (v: CourseTypeTab) => void;
  isCrossTenant: boolean;
  canManageStaff: boolean;
  branchId: string | undefined;
  setBranchId: (v: string | undefined) => void;
  branches: Branch[];
  operatorId: string | undefined;
  setOperatorId: (v: string | undefined) => void;
  operators: User[];
  operatorsLoading: boolean;
  userBranchId: string | null | undefined;
  hasGroup: boolean | undefined;
  setHasGroup: (v: boolean | undefined) => void;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  setDateRange: (from: Date | undefined, to: Date | undefined) => void;
  search: string;
  setSearch: (v: string) => void;
  status?: StudentStatus;
  setStatus?: (v: StudentStatus | undefined) => void;
  hasDebt?: boolean;
  setHasDebt?: (v: boolean | undefined) => void;
  onClearAll?: () => void;
  // autodrive-cg9: owner-only "show deleted" toggle.
  canViewDeleted: boolean;
  includeDeleted: boolean;
  setIncludeDeleted: (v: boolean) => void;
}

export const StudentsFilterBar = ({
  courseType,
  setCourseType,
  isCrossTenant,
  canManageStaff,
  branchId,
  setBranchId,
  branches,
  operatorId,
  setOperatorId,
  operators,
  operatorsLoading,
  userBranchId,
  hasGroup,
  setHasGroup,
  dateFrom,
  dateTo,
  setDateRange,
  search,
  setSearch,
  status,
  setStatus,
  hasDebt,
  setHasDebt,
  onClearAll,
  canViewDeleted,
  includeDeleted,
  setIncludeDeleted,
}: StudentsFilterBarProps) => {
  const { t } = useTranslation();

  const selectedBranch = branchId
    ? branches.find((b) => b.id === branchId)
    : undefined;
  const branchLabel = selectedBranch?.name || branchId;

  const selectedOperator = operatorId
    ? operators.find((op) => op.id === operatorId)
    : undefined;
  const operatorLabel =
    selectedOperator?.name || selectedOperator?.email || operatorId;

  const dateLabel =
    dateFrom && dateTo
      ? `${formatCalendarDate(dateFrom)}, ${formatCalendarDate(dateTo)}`
      : dateFrom
        ? `${formatCalendarDate(dateFrom)}`
        : dateTo
          ? `${formatCalendarDate(dateTo)}`
          : undefined;

  const localActiveCount = [
    Boolean(isCrossTenant && branchId),
    Boolean(operatorId),
    hasGroup !== undefined,
    Boolean(dateFrom || dateTo),
    Boolean(status),
    hasDebt !== undefined,
    Boolean(canViewDeleted && includeDeleted),
  ].filter(Boolean).length;

  const { chips, isMobileOpen, setIsMobileOpen, clearAll } = useFilterBarState({
    filters: [
      courseType !== 'all' && {
        id: 'course_type',
        label: t('common.course_type'),
        value: t(`courses.types.${courseType}`, { defaultValue: courseType }),
        onRemove: () => setCourseType('all'),
      },
      Boolean(isCrossTenant && branchId) && {
        id: 'branch',
        label: t('common.branch'),
        value: branchLabel ?? '',
        onRemove: () => setBranchId(undefined),
      },
      Boolean(operatorId) && {
        id: 'operator',
        label: t('students.operator'),
        value: operatorLabel ?? '',
        onRemove: () => setOperatorId(undefined),
      },
      hasGroup !== undefined && {
        id: 'has_group',
        label: t('common.group'),
        value: hasGroup ? t('common.yes') : t('students.no_group'),
        onRemove: () => setHasGroup(undefined),
      },
      Boolean(dateFrom || dateTo) && {
        id: 'date',
        label: t('common.date'),
        value: dateLabel ?? '',
        onRemove: () => setDateRange(undefined, undefined),
      },
      Boolean(status) && {
        id: 'status',
        label: t('common.status'),
        value: t(`students.status_${status}`, { defaultValue: status ?? '' }),
        onRemove: () => setStatus?.(undefined),
      },
      hasDebt !== undefined && {
        id: 'has_debt',
        label: t('students.debt_status_owed', { defaultValue: 'Qarzdorlik' }),
        value: hasDebt ? t('common.yes') : t('common.no'),
        onRemove: () => setHasDebt?.(undefined),
      },
      Boolean(search.trim().length > 0) && {
        id: 'search',
        label: t('common.search'),
        value: search,
        onRemove: () => setSearch(''),
      },
      Boolean(canViewDeleted && includeDeleted) && {
        id: 'show_deleted',
        label: t('common.show_deleted'),
        value: t('common.yes'),
        onRemove: () => setIncludeDeleted(false),
      },
    ],
    onClearAll: () => {
      onClearAll?.();
      setIncludeDeleted(false);
    },
  });

  const renderCourseTabs = () => (
    <CourseTypeTabs
      value={courseType}
      onChange={setCourseType}
      listClassName="h-11"
    />
  );

  const renderSearch = (className?: string) => (
    <SearchWithHotkey
      value={search}
      onChange={setSearch}
      placeholder={t('students.search_placeholder')}
      aria-label={t('students.search_placeholder')}
      className={className}
      inputClassName="h-11"
    />
  );

  const renderGroupFilter = (triggerClassName: string) => (
    <Select
      value={
        hasGroup === true
          ? 'has_group'
          : hasGroup === false
            ? 'no_group'
            : 'all'
      }
      onValueChange={(v) =>
        setHasGroup(
          v === 'has_group' ? true : v === 'no_group' ? false : undefined,
        )
      }
    >
      <SelectTrigger
        className={triggerClassName}
        aria-label={t('common.group')}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('common.all')}</SelectItem>
        <SelectItem value="has_group">{t('common.yes')}</SelectItem>
        <SelectItem value="no_group">{t('students.no_group')}</SelectItem>
      </SelectContent>
    </Select>
  );

  const renderAdditionalFilters = (showDeletedId: string) => (
    <>
      {isCrossTenant && (
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            {t('common.branch')}
          </Label>
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => setBranchId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger
              className="h-11 w-full border-border bg-secondary"
              aria-label={t('common.branch')}
            >
              <SelectValue placeholder={t('common.branch')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {canManageStaff && (operatorsLoading || operators.length > 0) && (
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            {t('students.operator')}
          </Label>
          <Select
            value={operatorId || 'all'}
            disabled={operatorsLoading}
            onValueChange={(v) => setOperatorId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger
              className="h-11 w-full border-border bg-secondary"
              aria-label={t('students.operator')}
            >
              <SelectValue placeholder={t('students.operator')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all_operators')}</SelectItem>
              {operators
                .filter((op) => isCrossTenant || op.branch_id === userBranchId)
                .map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.name || op.email}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">
          {t('common.date')}
        </Label>
        <DateRangePicker
          from={dateFrom ? formatCalendarDate(dateFrom) : undefined}
          to={dateTo ? formatCalendarDate(dateTo) : undefined}
          onChange={(from, to) =>
            setDateRange(
              from ? parseCalendarDate(from) : undefined,
              to ? parseCalendarDate(to) : undefined,
            )
          }
          showPresets
          aria-label={t('students.date_range')}
          className="w-full [&>button]:h-11 [&>button]:w-full"
        />
      </div>

      {canViewDeleted && (
        <div className="flex min-h-11 items-center justify-between gap-4 pt-1">
          <Label htmlFor={showDeletedId}>{t('common.show_deleted')}</Label>
          <Switch
            id={showDeletedId}
            checked={includeDeleted}
            onCheckedChange={setIncludeDeleted}
          />
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-2">
      <div className="flex w-full flex-col gap-2 md:hidden">
        <div className="flex w-full items-center gap-2">
          {renderSearch()}
          <MobileFilterSheet
            open={isMobileOpen}
            onOpenChange={setIsMobileOpen}
            activeCount={localActiveCount}
            onClearAll={clearAll}
            applyLabel={t('common.close')}
          >
            {isMobileOpen && (
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    {t('common.group')}
                  </Label>
                  {renderGroupFilter('h-11 w-full border-border bg-secondary')}
                </div>
                {renderAdditionalFilters('students-mobile-show-deleted')}
              </div>
            )}
          </MobileFilterSheet>
        </div>
        {renderCourseTabs()}
      </div>

      <div className="hidden flex-wrap items-center gap-3 md:flex">
        {renderCourseTabs()}
        {renderSearch('max-w-sm')}
        {renderGroupFilter('h-11 w-44 border-border bg-secondary')}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="relative h-11 border-border bg-secondary"
            >
              <Funnel className="h-4 w-4" aria-hidden="true" />
              {t('filters.title', { defaultValue: 'Filters' })}
              {localActiveCount > 0 ? (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                  {localActiveCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            collisionPadding={16}
            className="max-h-[min(75vh,var(--radix-popover-content-available-height))] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto p-4"
          >
            <div className="space-y-4">
              {renderAdditionalFilters('students-desktop-show-deleted')}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips chips={chips} onClearAll={clearAll} />
    </div>
  );
};
