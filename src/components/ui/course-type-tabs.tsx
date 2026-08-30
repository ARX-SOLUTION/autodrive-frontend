/**
 * Callers: StudentsFilterBar, PaymentsFilterBar, GroupsFilterBar,
 * CompanyRevenueDashboard FilterBar.
 * API: value 'all'|CourseType; onChange(CourseTypeTab).
 * Schema: URL course_type; 'all' clears param.
 */
import { useTranslation } from 'react-i18next';
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
  const options: Array<{ value: CourseTypeTab; label: string }> = [
    { value: 'all', label: t('common.all') },
    { value: 'tezkor', label: t('students.course_fast') },
    { value: 'avto_maktab', label: t('students.course_school') },
  ];

  return (
    <div className={className}>
      <div
        role="group"
        aria-label={t('students.course_type')}
        className={cn(
          'inline-flex h-10 items-center justify-center rounded-md bg-secondary p-1 text-muted-foreground',
          listClassName,
        )}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              value === option.value &&
                'bg-background text-foreground shadow-sm',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
