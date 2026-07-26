/**
 * Callers: StudentsFilterBar, PaymentsFilterBar, GroupsFilterBar,
 * CompanyRevenueDashboard FilterBar.
 * API: value 'all'|CourseType; onChange(CourseTypeTab).
 * Schema: URL course_type; 'all' clears param.
 */
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { CourseType } from '@/types/student';

export type CourseTypeTab = 'all' | CourseType;

export interface CourseTypeTabsProps {
  value: CourseTypeTab;
  onChange: (value: CourseTypeTab) => void;
  className?: string;
  listClassName?: string;
}

export function CourseTypeTabs({
  value,
  onChange,
  className,
  listClassName,
}: CourseTypeTabsProps) {
  const { t } = useTranslation();

  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as CourseTypeTab)}
      className={className}
    >
      <TabsList
        aria-label={t('students.course_type')}
        className={cn('bg-secondary', listClassName)}
      >
        <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
        <TabsTrigger value="tezkor">{t('students.course_fast')}</TabsTrigger>
        <TabsTrigger value="avto_maktab">
          {t('students.course_school')}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
