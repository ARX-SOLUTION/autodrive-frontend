import { useTranslation } from 'react-i18next';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Branch } from '@/types/branch';

interface GroupsFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  courseTypeFilter: string;
  onCourseTypeChange: (v: string) => void;
  isCrossTenant: boolean;
  branchId: string | undefined;
  onBranchChange: (v: string | undefined) => void;
  branches: Branch[];
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
}: GroupsFilterBarProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative max-w-sm">
        <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('groups.search_placeholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-secondary border-border"
        />
      </div>
      <Select value={courseTypeFilter} onValueChange={onCourseTypeChange}>
        <SelectTrigger className="w-[180px] bg-secondary border-border">
          <SelectValue placeholder={t('groups.course_type')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('groups.all')}</SelectItem>
          <SelectItem value="tezkor">{t('groups.course_fast')}</SelectItem>
          <SelectItem value="avto_maktab">
            {t('groups.course_school')}
          </SelectItem>
        </SelectContent>
      </Select>
      {isCrossTenant && (
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
      )}
    </div>
  );
};

export default GroupsFilterBar;
