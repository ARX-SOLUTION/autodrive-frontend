import { useTranslation } from 'react-i18next';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Branch } from '@/types/branch';
import {
  CourseTypeTabs,
  type CourseTypeTab,
} from '@/components/ui/course-type-tabs';

interface GroupsFilterBarProps {
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
}

const GroupsFilterBar = ({
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
}: GroupsFilterBarProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative max-w-sm">
        <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('groups.search_placeholder')}
          aria-label={t('groups.search_placeholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-secondary border-border"
        />
      </div>
      <CourseTypeTabs
        value={(courseTypeFilter as CourseTypeTab) || 'all'}
        onChange={onCourseTypeChange}
      />
      {isCrossTenant && (
        <div className={hideBranchSelectOnDesktop ? 'lg:hidden' : undefined}>
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => onBranchChange(v === 'all' ? undefined : v)}
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
  );
};

export default GroupsFilterBar;
