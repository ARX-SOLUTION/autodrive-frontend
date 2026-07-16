import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import type { Payment } from '@/types/payment';
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  CreditCard,
} from 'lucide-react';
import { courseTypeLabelKey, formatDate } from './paymentFormatters';

interface PaymentsTableProps {
  payments: Payment[];
  isLoading: boolean;
  startIndex: number;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onToggleSort: (field: string) => void;
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

/** SECTION 4 (desktop): sortable payments table; rows navigate to the student. */
export const PaymentsTable = ({
  payments,
  isLoading,
  startIndex,
  sortField,
  sortDir,
  onToggleSort,
}: PaymentsTableProps) => {
  const { t } = useTranslation();
  const goToStudent = useViewTransitionNavigate();

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
                  onClick={() => onToggleSort('student_name')}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {t('payments.student_name')}
                  <SortIcon
                    active={sortField === 'student_name'}
                    dir={sortDir}
                  />
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t('common.branch')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t('common.course_type')}
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                {t('payments.total_price')}
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                <button
                  onClick={() => onToggleSort('amount_paid')}
                  className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                >
                  {t('payments.amount_paid')}
                  <SortIcon
                    active={sortField === 'amount_paid'}
                    dir={sortDir}
                  />
                </button>
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                <button
                  onClick={() => onToggleSort('remaining_debt')}
                  className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                >
                  {t('payments.remaining_debt')}
                  <SortIcon
                    active={sortField === 'remaining_debt'}
                    dir={sortDir}
                  />
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <button
                  onClick={() => onToggleSort('date')}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {t('common.date')}
                  <SortIcon active={sortField === 'date'} dir={sortDir} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={8} className="p-4">
                    <Skeleton className="h-5" />
                  </td>
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-0">
                  <EmptyState
                    icon={CreditCard}
                    title={t('payments.not_found')}
                    description={t('payments.not_found_desc')}
                  />
                </td>
              </tr>
            ) : (
              payments.map((p, idx) => (
                <tr
                  key={p.id}
                  className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={(e) => {
                    if (window.getSelection()?.toString()) return;
                    goToStudent(
                      `/students/${p.student_id}?tab=payments`,
                      e.currentTarget,
                      `student-${p.student_id}`,
                    );
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToStudent(
                        `/students/${p.student_id}?tab=payments`,
                        e.currentTarget,
                        `student-${p.student_id}`,
                      );
                    }
                  }}
                >
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {startIndex + idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.student_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.branch_name}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t(courseTypeLabelKey(p.course_type))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {new Intl.NumberFormat('uz-UZ').format(p.total_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-success font-medium">
                    +{new Intl.NumberFormat('uz-UZ').format(p.amount_paid)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        p.remaining_debt > 0
                          ? 'text-destructive'
                          : 'text-success'
                      }
                    >
                      {p.remaining_debt > 0
                        ? new Intl.NumberFormat('uz-UZ').format(
                            p.remaining_debt,
                          )
                        : p.remaining_debt < 0
                          ? `${t('students.credit_label')}: ${new Intl.NumberFormat('uz-UZ').format(Math.abs(p.remaining_debt))}`
                          : t('payments.fully_paid')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {formatDate(p.date)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
