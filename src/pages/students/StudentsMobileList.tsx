import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataCard } from '@/components/ui/DataCard';
import { Button } from '@/components/ui/button';
import {
  PencilSimple,
  Trash,
  ArrowCounterClockwise,
  GraduationCap,
  Warning,
  Plus,
} from '@phosphor-icons/react';
import { formatPhone } from '@/lib/phoneFormater';
import { formatMoney } from '@/lib/money';
import { DebtStatusBadge } from '@/components/ui/DebtStatusBadge';
import { DeletedBadge } from '@/components/ui/DeletedBadge';
import type { Student } from '@/types/student';
import { capitalize, formatDate, resultLabels } from './studentsFormat';

interface StudentsMobileListProps {
  students: Student[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  canManageStudents: boolean;
  isCrossTenant: boolean;
  // Teacher must never see payment amounts (recordPayment cap).
  canViewPayments: boolean;
  onOpenStudent: (student: Student, el: HTMLElement) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  // autodrive-cg9: owner-only "show deleted" toggle — a deleted card swaps
  // edit/delete for a single restore action.
  canViewDeleted: boolean;
  onRestore: (id: string) => void;
}

export const StudentsMobileList = ({
  students,
  isLoading,
  isError,
  onRetry,
  canManageStudents,
  isCrossTenant,
  canViewPayments,
  onOpenStudent,
  onEdit,
  onDelete,
  onCreate,
  canViewDeleted,
  onRestore,
}: StudentsMobileListProps) => {
  const { t } = useTranslation();
  const localizedResultLabels = resultLabels(t);

  return (
    <div className="grid gap-3 md:hidden p-3">
      {isLoading ? (
        [...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))
      ) : isError ? (
        <EmptyState
          icon={Warning}
          title={t('common.error')}
          action={{ label: t('common.retry'), onClick: onRetry }}
        />
      ) : students.length > 0 ? (
        students.map((s) => {
          const fields = [
            {
              label: t('students.detail.branch'),
              value: s.branch_name || t('common.na'),
            },
            {
              label: t('students.detail.group'),
              value: s.group_name ?? t('common.na'),
            },
            {
              label: t('students.detail.course'),
              value:
                s.course_type === 'tezkor'
                  ? t('students.course_fast')
                  : t('students.course_school'),
            },
            ...(canViewPayments
              ? // Guard s.debt itself too (not just canViewPayments): the
                // backend only guarantees this field for a non-teacher
                // requester, but the type is honestly optional now -- omit
                // rather than let a stray undefined reach formatMoney's
                // silent "0 so'm".
                s.debt !== undefined
                ? [
                    {
                      label: t('students.detail.debt'),
                      value: (
                        <span
                          className={
                            s.debt > 0 ? 'text-destructive' : 'text-success'
                          }
                        >
                          {s.debt > 0
                            ? formatMoney(s.debt)
                            : s.debt < 0
                              ? `${t('students.credit_label')}: ${formatMoney(Math.abs(s.debt))}`
                              : t('students.debt_status_paid')}
                        </span>
                      ),
                    },
                  ]
                : []
              : // Teacher: paid/owing badge instead of an amount
                // (autodrive-vh0.5). Omit the field entirely rather than
                // show a label with no value when has_debt is missing.
                s.has_debt !== undefined
                ? [
                    {
                      label: t('students.detail.debt'),
                      value: <DebtStatusBadge hasDebt={s.has_debt} />,
                    },
                  ]
                : []),
            {
              label: t('students.detail.status'),
              value: s.result
                ? localizedResultLabels[s.result]
                : t('common.na'),
            },
            {
              label: t('students.detail.date'),
              value: formatDate(s.created_at),
            },
          ];
          return (
            <DataCard
              key={s.id}
              title={
                <span className="inline-flex items-center gap-1.5">
                  {capitalize(s.first_name)} {capitalize(s.last_name)}
                  {s.deleted_at && <DeletedBadge />}
                </span>
              }
              subtitle={formatPhone(s.phone)}
              fields={fields}
              onClick={(e) => onOpenStudent(s, e.currentTarget)}
              className={s.deleted_at ? 'opacity-60' : undefined}
              actions={
                s.deleted_at ? (
                  canViewDeleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(s.id);
                      }}
                      aria-label={t('common.restore')}
                      title={t('common.restore')}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <ArrowCounterClockwise className="h-3.5 w-3.5" />
                    </button>
                  )
                ) : (
                  <>
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
                        <PencilSimple className="h-3.5 w-3.5" />
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
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )
              }
            />
          );
        })
      ) : (
        <EmptyState
          icon={GraduationCap}
          title={t('students.not_found')}
          description={t('students.not_found_desc')}
          action={
            canManageStudents ? (
              <Button size="sm" className="gap-2" onClick={onCreate}>
                <Plus className="h-4 w-4" /> {t('students.add')}
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
};
