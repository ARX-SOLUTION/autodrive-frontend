import { useTranslation } from 'react-i18next';
import {
  PencilSimple,
  Trash,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import type { NavigateOptions } from '@tanstack/react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { DataCard } from '@/components/ui/DataCard';
import { DeletedBadge } from '@/components/ui/DeletedBadge';
import { Group } from '@/types/group';
import { formatDate } from './formatDate';

interface GroupsMobileListProps {
  groups: Group[];
  isLoading: boolean;
  getBranchName: (branchId: string) => string;
  onNavigate: (
    options: NavigateOptions,
    el: HTMLElement | null,
    name: string,
  ) => void;
  onEdit: (g: Group) => void;
  onDelete: (id: string) => void;
  canManageGroups: boolean;
  // autodrive-cg9: owner-only "show deleted" toggle — a deleted card swaps
  // edit/delete for a single restore action.
  canViewDeleted: boolean;
  onRestore: (id: string) => void;
}

interface GroupMobileCardProps extends Omit<
  GroupsMobileListProps,
  'groups' | 'isLoading'
> {
  group: Group;
}

export const GroupMobileCard = ({
  group: g,
  getBranchName,
  onNavigate,
  onEdit,
  onDelete,
  canManageGroups,
  canViewDeleted,
  onRestore,
}: GroupMobileCardProps) => {
  const { t } = useTranslation();

  return (
    <DataCard
      title={
        <span className="inline-flex items-center gap-1.5">
          {g.name}
          {g.deleted_at && <DeletedBadge />}
        </span>
      }
      subtitle={g.branch_name || getBranchName(g.branch_id)}
      onClick={(e) =>
        onNavigate(
          { to: '/groups/$id', params: { id: g.id } },
          e.currentTarget,
          `group-${g.id}`,
        )
      }
      className={g.deleted_at ? 'opacity-60' : undefined}
      fields={[
        {
          label: t('groups.course_type'),
          value:
            g.course_type === 'avto_maktab'
              ? t('groups.course_school')
              : t('groups.course_fast'),
        },
        { label: t('groups.student_count'), value: g.active_students },
        { label: t('groups.created'), value: formatDate(g.created_at) },
        {
          label: t('common.status'),
          value: g.is_active ? t('common.active') : t('common.inactive'),
        },
      ]}
      actions={
        g.deleted_at ? (
          canViewDeleted && (
            <button
              aria-label={t('common.restore')}
              title={t('common.restore')}
              onClick={(e) => {
                e.stopPropagation();
                onRestore(g.id);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <ArrowCounterClockwise className="h-3.5 w-3.5" />
            </button>
          )
        ) : (
          <>
            <button
              aria-label={t('common.edit')}
              title={t('common.edit')}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(g);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <PencilSimple className="h-3.5 w-3.5" />
            </button>
            {canManageGroups && (
              <button
                aria-label={t('common.delete')}
                title={t('common.delete')}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(g.id);
                }}
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
};

const GroupsMobileList = ({
  groups,
  isLoading,
  getBranchName,
  onNavigate,
  onEdit,
  onDelete,
  canManageGroups,
  canViewDeleted,
  onRestore,
}: GroupsMobileListProps) => {
  return (
    <div className="md:hidden grid gap-3 p-3">
      {isLoading
        ? [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))
        : groups.map((group) => (
            <GroupMobileCard
              key={group.id}
              group={group}
              getBranchName={getBranchName}
              onNavigate={onNavigate}
              onEdit={onEdit}
              onDelete={onDelete}
              canManageGroups={canManageGroups}
              canViewDeleted={canViewDeleted}
              onRestore={onRestore}
            />
          ))}
    </div>
  );
};

export default GroupsMobileList;
