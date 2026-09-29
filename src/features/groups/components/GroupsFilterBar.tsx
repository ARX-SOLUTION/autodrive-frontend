import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Branch } from '@/features/branches/types';
import {
  CourseTypeTabs,
  type CourseTypeTab,
} from '@/components/ui/course-type-tabs';
import { useFilterBarState } from '@/hooks/useFilterBarState';
import { SearchWithHotkey } from '@/components/filter/SearchWithHotkey';
import { ActiveFilterChips } from '@/components/filter/ActiveFilterChips';
import { MobileFilterSheet } from '@/components/filter/MobileFilterSheet';

export interface GroupsFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  courseTypeFilter: string;
  onCourseTypeChange: (v: CourseTypeTab) => void;
  isCrossTenant: boolean;
  branchId: string | undefined;
  onBranchChange: (v: string | undefined) => void;
  branches: Branch[];
  // autodrive-cg9: owner-only "show deleted" toggle.
  canViewDeleted: boolean;
  includeDeleted: boolean;
  setIncludeDeleted: (v: boolean) => void;
  /** Desktop uses GroupsBranchNav; keep Select for mobile only. */
  hideBranchSelectOnDesktop?: boolean;
  onClearAll?: () => void;
}

export const GroupsFilterBar = ({
  search,
  onSearchChange,
  courseTypeFilter,
  onCourseTypeChange,
  isCrossTenant,
  branchId,
  onBranchChange,
  branches,
  canViewDeleted,
  includeDeleted,
  setIncludeDeleted,
  hideBranchSelectOnDesktop = false,
  onClearAll,
}: GroupsFilterBarProps) => {
  const { t } = useTranslation();

  const selectedBranch = branchId
    ? branches.find((b) => b.id === branchId)
    : undefined;
  const branchLabel = selectedBranch?.name || branchId;

  const { chips, activeCount, isMobileOpen, setIsMobileOpen, clearAll } =
    useFilterBarState({
      filters: [
        Boolean(isCrossTenant && branchId) && {
          id: 'branch',
          label: t('common.branch'),
          value: branchLabel ?? '',
          onRemove: () => onBranchChange(undefined),
        },
        courseTypeFilter !== 'all' && {
          id: 'course_type',
          label: t('common.course_type'),
          value: t(`courses.types.${courseTypeFilter}`, {
            defaultValue: courseTypeFilter,
          }),
          onRemove: () => onCourseTypeChange('all'),
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] md:max-w-xs">
          <SearchWithHotkey
            value={search}
            onChange={onSearchChange}
            placeholder={t('groups.search_placeholder')}
            aria-label={t('groups.search_placeholder')}
            className="w-full"
          />
          <div className="md:hidden shrink-0">
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
                    <CourseTypeTabs
                      value={(courseTypeFilter as CourseTypeTab) || 'all'}
                      onChange={onCourseTypeChange}
                    />
                  </div>

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

                  {canViewDeleted && (
                    <div className="flex items-center justify-between pt-2">
                      <Label htmlFor="groups-mobile-show-deleted">
                        {t('common.show_deleted')}
                      </Label>
                      <Switch
                        id="groups-mobile-show-deleted"
                        checked={includeDeleted}
                        onCheckedChange={setIncludeDeleted}
                      />
                    </div>
                  )}
                </div>
              )}
            </MobileFilterSheet>
          </div>
        </div>

        {/* Desktop filter controls */}
        <div className="hidden md:flex flex-wrap items-center gap-3">
          <CourseTypeTabs
            value={(courseTypeFilter as CourseTypeTab) || 'all'}
            onChange={onCourseTypeChange}
          />

          {isCrossTenant && (
            <div
              className={hideBranchSelectOnDesktop ? 'lg:hidden' : undefined}
            >
              <Select
                value={branchId || 'all'}
                onValueChange={(v) =>
                  onBranchChange(v === 'all' ? undefined : v)
                }
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
            </div>
          )}

          {canViewDeleted && (
            <div className="flex items-center gap-2">
              <Label htmlFor="groups-show-deleted">
                {t('common.show_deleted')}
              </Label>
              <Switch
                id="groups-show-deleted"
                checked={includeDeleted}
                onCheckedChange={setIncludeDeleted}
              />
            </div>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips chips={chips} onClearAll={clearAll} />
    </div>
  );
};

export default GroupsFilterBar;
