import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseType } from '@/types/student';
import type { Branch } from '@/types/branch';
import type { User } from '@/types/user';

interface StudentsFilterBarProps {
  courseType: CourseType;
  setCourseType: (v: CourseType) => void;
  isCrossTenant: boolean;
  canManageStaff: boolean;
  branchId: string | undefined;
  setBranchId: (v: string | undefined) => void;
  branches: Branch[];
  operatorId: string | undefined;
  setOperatorId: (v: string | undefined) => void;
  operators: User[];
  userBranchId: string | null | undefined;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  setDateRange: (from: Date | undefined, to: Date | undefined) => void;
  search: string;
  setSearch: (v: string) => void;
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
  userBranchId,
  dateFrom,
  dateTo,
  setDateRange,
  search,
  setSearch,
}: StudentsFilterBarProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Tabs
        value={courseType}
        onValueChange={(v) => setCourseType(v as CourseType)}
      >
        <TabsList className="bg-secondary">
          <TabsTrigger value="tezkor">{t('students.course_fast')}</TabsTrigger>
          <TabsTrigger value="avto_maktab">
            {t('students.course_school')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
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
      {canManageStaff && operators.length > 0 && (
        <Select
          value={operatorId || 'all'}
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

      {/* Date filter — single or range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'min-w-[220px] justify-start text-left font-normal bg-secondary border-border',
              !dateFrom && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {!dateFrom
              ? t('students.date_range')
              : dateTo && dateTo.getTime() !== dateFrom.getTime()
                ? `${format(dateFrom, 'dd.MM.yyyy')} → ${format(dateTo, 'dd.MM.yyyy')}`
                : format(dateFrom, 'dd.MM.yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 max-w-[calc(100vw-2rem)] overflow-x-auto"
          align="start"
        >
          <Calendar
            mode="range"
            selected={{ from: dateFrom, to: dateTo }}
            onSelect={(range) =>
              setDateRange(
                range?.from,
                range ? (range.to ?? range.from) : undefined,
              )
            }
            numberOfMonths={2}
            initialFocus
            disabled={{ after: new Date() }}
            className={cn('p-3 pointer-events-auto')}
          />
        </PopoverContent>
      </Popover>
      {(dateFrom || dateTo) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDateRange(undefined, undefined)}
        >
          {t('students.clear_filters')}
        </Button>
      )}

      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('students.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary border-border"
        />
      </div>
    </div>
  );
};
