import { useTranslation } from 'react-i18next';
import {
  PencilSimple,
  Trash,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { DeletedBadge } from '@/components/ui/DeletedBadge';
import { Group } from '@/types/group';
import { formatDate } from './formatDate';

interface GroupsTableProps {
  groups: Group[];
  isLoading: boolean;
  startIndex: number;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onToggleSort: (field: string) => void;
  getBranchName: (branchId: string) => string;
  onNavigate: (path: string, el: HTMLElement | null, name: string) => void;
  onEdit: (g: Group) => void;
  onDelete: (id: string) => void;
  canManageGroups: boolean;
  // autodrive-cg9: owner-only "show deleted" toggle — a deleted row swaps
  // edit/delete for a single restore action.
  canViewDeleted: boolean;
  onRestore: (id: string) => void;
}

const GroupsTable = ({
  groups,
  isLoading,
  startIndex,
  sortField,
  sortDir,
  onToggleSort,
  getBranchName,
  onNavigate,
  onEdit,
  onDelete,
  canManageGroups,
  canViewDeleted,
  onRestore,
}: GroupsTableProps) => {
  const { t } = useTranslation();

  const columns: DataTableColumn<Group>[] = [
    {
      key: 'index',
      header: '#',
      align: 'center',
      cellClassName: 'text-muted-foreground',
      render: (_g, idx) => startIndex + idx + 1,
    },
    {
      key: 'name',
      header: t('groups.name'),
      sortable: true,
      cellClassName: 'font-medium',
      render: (g) => (
        <span className="inline-flex items-center gap-1.5">
          {g.name}
          {g.deleted_at && <DeletedBadge />}
        </span>
      ),
    },
    {
      key: 'branch',
      header: t('common.branch'),
      cellClassName: 'text-muted-foreground',
      render: (g) => g.branch_name || getBranchName(g.branch_id),
    },
    {
      key: 'course_type',
      header: t('groups.course_type'),
      align: 'center',
      sortable: true,
      render: (g) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${g.course_type === 'avto_maktab' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'}`}
        >
          {g.course_type === 'avto_maktab'
            ? t('groups.course_school')
            : t('groups.course_fast')}
        </span>
      ),
    },
    {
      key: 'student_count',
      header: t('groups.student_count'),
      align: 'center',
      render: (g) => g.active_students,
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      render: (g) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${g.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
        >
          {g.is_active ? t('common.active') : t('common.inactive')}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: t('groups.created'),
      cellClassName: 'text-muted-foreground tabular-nums',
      render: (g) => formatDate(g.created_at),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'center',
      render: (g) =>
        g.deleted_at ? (
          <div className="flex items-center justify-center gap-1">
            {canViewDeleted && (
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
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1">
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
          </div>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={groups}
      keyExtractor={(g) => g.id}
      onRowClick={(g, el) => onNavigate(`/groups/${g.id}`, el, `group-${g.id}`)}
      isLoading={isLoading}
      skeletonRowCount={3}
      sortField={sortField}
      sortDir={sortDir}
      onToggleSort={onToggleSort}
      rowClassName={(g) => (g.deleted_at ? 'opacity-60' : undefined)}
    />
  );
};

export default GroupsTable;
