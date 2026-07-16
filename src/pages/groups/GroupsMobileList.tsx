import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DataCard } from '@/components/ui/DataCard';
import { Group } from '@/types/group';
import { formatDate } from './formatDate';

interface GroupsMobileListProps {
  groups: Group[];
  isLoading: boolean;
  getBranchName: (branchId: string) => string;
  onNavigate: (path: string, el: HTMLElement | null, name: string) => void;
  onEdit: (g: Group) => void;
  onDelete: (id: string) => void;
  canManageGroups: boolean;
}

const GroupsMobileList = ({
  groups,
  isLoading,
  getBranchName,
  onNavigate,
  onEdit,
  onDelete,
  canManageGroups,
}: GroupsMobileListProps) => {
  const { t } = useTranslation();

  return (
    <div className="md:hidden grid gap-3 p-3">
      {isLoading
        ? [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))
        : groups.map((g) => (
            <DataCard
              key={g.id}
              title={g.name}
              subtitle={g.branch_name || getBranchName(g.branch_id)}
              onClick={(e) =>
                onNavigate(`/groups/${g.id}`, e.currentTarget, `group-${g.id}`)
              }
              fields={[
                {
                  label: t('groups.course_type'),
                  value:
                    g.course_type === 'avto_maktab'
                      ? t('groups.course_school')
                      : t('groups.course_fast'),
                },
                {
                  label: t('groups.student_count'),
                  value: g.active_students,
                },
                {
                  label: t('groups.created'),
                  value: formatDate(g.created_at),
                },
                {
                  label: t('common.status'),
                  value: g.is_active
                    ? t('common.active')
                    : t('common.inactive'),
                },
              ]}
              actions={
                <>
                  <button
                    aria-label={t('common.edit')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(g);
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {canManageGroups && (
                    <button
                      aria-label={t('common.delete')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(g.id);
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              }
            />
          ))}
    </div>
  );
};

export default GroupsMobileList;
