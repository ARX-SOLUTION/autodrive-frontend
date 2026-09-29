// Callers: StudentsPage. API: Date dateFrom/dateTo + setDateRange(Date?, Date?).
// Schema: URL date_from/date_to YYYY-MM-DD unchanged. User: "davom et" (qsgc.4).
import { useTranslation } from 'react-i18next';
import {
  CourseTypeTabs,
  type CourseTypeTab,
} from '@/components/ui/course-type-tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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

  const { chips, activeCount, isMobileOpen, setIsMobileOpen, clearAll } =
    useFilterBarState({
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
      ],
      onClearAll,
    });

  return (
    <div className="space-y-2">
      {/* Mobile filter bar: Search + Mobile Drawer button */}
      <div className="flex md:hidden items-center gap-2 w-full">
        <SearchWithHotkey
          value={search}
          onChange={setSearch}
          placeholder={t('students.search_placeholder')}
          aria-label={t('students.search_placeholder')}
        />
        <MobileFilterSheet
          open={isMobileOpen}
          onOpenChange={setIsMobileOpen}
          activeCount={activeCount}
          onClearAll={clearAll}
        >
          {isMobileOpen && (
            <div className="flex flex-col gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('common.course_type')}
                </Label>
                <CourseTypeTabs value={courseType} onChange={setCourseType} />
              </div>

              {isCrossTenant && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    {t('common.branch')}
                  </Label>
                  <Select
                    value={branchId || 'all'}
                    onValueChange={(v) =>
                      setBranchId(v === 'all' ? undefined : v)
                    }
                  >
                    <SelectTrigger className="w-full bg-secondary border-border">
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
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    {t('students.operator')}
                  </Label>
                  <Select
                    value={operatorId || 'all'}
                    disabled={operatorsLoading}
                    onValueChange={(v) =>
                      setOperatorId(v === 'all' ? undefined : v)
                    }
                  >
                    <SelectTrigger className="w-full bg-secondary border-border">
                      <SelectValue placeholder={t('students.operator')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t('common.all_operators')}
                      </SelectItem>
                      {operators
                        .filter(
                          (op) =>
                            isCrossTenant || op.branch_id === userBranchId,
                        )
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
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('common.group')}
                </Label>
                <Select
                  value={hasGroup === false ? 'no_group' : 'all'}
                  onValueChange={(v) =>
                    setHasGroup(v === 'no_group' ? false : undefined)
                  }
                >
                  <SelectTrigger className="w-full bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="no_group">
                      {t('students.no_group')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
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
                  className="w-full"
                />
              </div>

              {canViewDeleted && (
                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="students-mobile-show-deleted">
                    {t('common.show_deleted')}
                  </Label>
                  <Switch
                    id="students-mobile-show-deleted"
                    checked={includeDeleted}
                    onCheckedChange={setIncludeDeleted}
                  />
                </div>
              )}
            </div>
          )}
        </MobileFilterSheet>
      </div>

      {/* Desktop inline filter bar */}
      <div className="hidden md:flex flex-wrap items-center gap-3">
        <CourseTypeTabs value={courseType} onChange={setCourseType} />
        {isCrossTenant && (
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => setBranchId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-40 bg-secondary border-border">
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
        )}

        {/* Operator filter — owner va manager uchun */}
        {canManageStaff && (operatorsLoading || operators.length > 0) && (
          <Select
            value={operatorId || 'all'}
            disabled={operatorsLoading}
            onValueChange={(v) => setOperatorId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-44 bg-secondary border-border">
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
        )}

        {/* Group filter — ungrouped students */}
        <Select
          value={hasGroup === false ? 'no_group' : 'all'}
          onValueChange={(v) =>
            setHasGroup(v === 'no_group' ? false : undefined)
          }
        >
          <SelectTrigger className="w-40 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="no_group">{t('students.no_group')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Date filter — inclusive calendar-date range */}
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
        />

        <SearchWithHotkey
          value={search}
          onChange={setSearch}
          placeholder={t('students.search_placeholder')}
          aria-label={t('students.search_placeholder')}
          className="min-w-[200px]"
        />

        {canViewDeleted && (
          <div className="flex items-center gap-2">
            <Label htmlFor="students-show-deleted">
              {t('common.show_deleted')}
            </Label>
            <Switch
              id="students-show-deleted"
              checked={includeDeleted}
              onCheckedChange={setIncludeDeleted}
            />
          </div>
        )}
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips chips={chips} onClearAll={clearAll} />
    </div>
  );
};
