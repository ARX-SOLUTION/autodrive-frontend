import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  GraduationCap,
  AlertTriangle,
} from 'lucide-react';
import { formatPhone } from '@/lib/phoneFormater';
import { formatMoney } from '@/lib/money';
import type { CourseType, Student } from '@/types/student';
import {
  capitalize,
  formatDate,
  formatDateTime,
  resultLabels,
} from './studentsFormat';

interface StudentsTableProps {
  students: Student[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  totalStudents: number;
  startIndex: number;
  courseType: CourseType;
  sortField: string;
  sortDir: 'asc' | 'desc';
  toggleSort: (field: string) => void;
  canManageStudents: boolean;
  isCrossTenant: boolean;
  onOpenStudent: (student: Student, el: HTMLElement) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
}

const SortIcon = ({
  active,
  dir,
}: {
  active: boolean;
  dir: 'asc' | 'desc';
}) => {
  if (!active)
    return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />;
  return dir === 'asc' ? (
    <ChevronUp className="h-3 w-3" />
  ) : (
    <ChevronDown className="h-3 w-3" />
  );
};

export const StudentsTable = ({
  students,
  isLoading,
  isError,
  onRetry,
  totalStudents,
  startIndex,
  courseType,
  sortField,
  sortDir,
  toggleSort,
  canManageStudents,
  isCrossTenant,
  onOpenStudent,
  onEdit,
  onDelete,
}: StudentsTableProps) => {
  const { t } = useTranslation();
  const localizedResultLabels = resultLabels(t);

  const debtCell = (debt: number) => (
    <span
      className={debt > 0 ? 'text-destructive' : 'text-success'}
      aria-label={
        debt > 0
          ? t('students.debt_status_owed')
          : debt < 0
            ? t('students.debt_status_credit')
            : t('students.debt_status_paid')
      }
    >
      {debt > 0
        ? formatMoney(debt)
        : debt < 0
          ? `${t('students.credit_label')}: ${formatMoney(Math.abs(debt))}`
          : t('common.na')}
    </span>
  );

  return (
    <div className="hidden md:block">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                #
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <button
                  onClick={() => toggleSort('last_name')}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {t('students.last_name')}
                  <SortIcon active={sortField === 'last_name'} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <button
                  onClick={() => toggleSort('first_name')}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {t('students.first_name')}
                  <SortIcon active={sortField === 'first_name'} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t('students.phone')}
              </th>
              {courseType === 'tezkor' ? (
                <>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('debt')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    >
                      {t('students.debt')}
                      <SortIcon active={sortField === 'debt'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('students.group')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t('students.result')}
                  </th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    {t('students.initial_payment')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    2-{t('students.payment').toLowerCase()}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    3-{t('students.payment').toLowerCase()}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('debt')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    >
                      {t('students.debt')}
                      <SortIcon active={sortField === 'debt'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('students.group')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('students.completion_date')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t('students.o83')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('students.contract_number')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t('students.result')}
                  </th>
                </>
              )}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <button
                  onClick={() => toggleSort('created_at')}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {t('common.date')}
                  <SortIcon active={sortField === 'created_at'} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={16} className="p-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              : students?.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={(e) => {
                      if (window.getSelection()?.toString()) return;
                      onOpenStudent(s, e.currentTarget);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenStudent(s, e.currentTarget);
                      }
                    }}
                  >
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {startIndex + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {capitalize(s.last_name)}
                    </td>
                    <td className="px-4 py-3">{capitalize(s.first_name)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatPhone(s.phone)}
                    </td>
                    {courseType === 'tezkor' ? (
                      <>
                        <td className="px-4 py-3 text-right">
                          {debtCell(s.debt)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.group_name || t('common.na')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {localizedResultLabels[s.result]}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(s.initial_payment || 0)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(s.second_payment || 0)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(s.third_payment || 0)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {debtCell(s.debt)}
                        </td>
                        <td className="px-4 py-3">{s.group_name}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {formatDate(s.completion_date)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={
                              s.o83 ? 'text-success' : 'text-destructive'
                            }
                          >
                            {s.o83
                              ? t('students.o83_yes')
                              : t('students.o83_no')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.contract_number}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {localizedResultLabels[s.result]}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatDateTime(s.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {canManageStudents && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(s);
                            }}
                            aria-label={t('common.edit')}
                            title={t('common.edit')}
                            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isCrossTenant && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(s.id);
                            }}
                            aria-label={t('common.delete')}
                            title={t('common.delete')}
                            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            {!isLoading && isError && (
              <tr>
                <td colSpan={16} className="p-0">
                  <EmptyState
                    icon={AlertTriangle}
                    title={t('common.error')}
                    action={{
                      label: t('common.retry'),
                      onClick: onRetry,
                    }}
                  />
                </td>
              </tr>
            )}
            {!isLoading && !isError && totalStudents === 0 && (
              <tr>
                <td colSpan={16} className="p-0">
                  <EmptyState
                    icon={GraduationCap}
                    title={t('students.not_found')}
                    description={t('students.not_found_desc')}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
