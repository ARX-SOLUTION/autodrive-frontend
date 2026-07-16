import { useTranslation } from 'react-i18next';
import {
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
}: GroupsTableProps) => {
  const { t } = useTranslation();

  const sortIcon = (field: string) =>
    sortField === field ? (
      sortDir === 'asc' ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )
    ) : (
      <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
    );

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">
              #
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              <button
                onClick={() => onToggleSort('name')}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {t('groups.name')}
                {sortIcon('name')}
              </button>
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              {t('common.branch')}
            </th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">
              <button
                onClick={() => onToggleSort('course_type')}
                className="flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
              >
                {t('groups.course_type')}
                {sortIcon('course_type')}
              </button>
            </th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">
              {t('groups.student_count')}
            </th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">
              {t('common.status')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              {t('groups.created')}
            </th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? [...Array(3)].map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={8} className="p-4">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            : groups.map((g, idx) => (
                <tr
                  key={g.id}
                  className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/10"
                  onClick={(e) => {
                    if (window.getSelection()?.toString()) return;
                    onNavigate(
                      `/groups/${g.id}`,
                      e.currentTarget,
                      `group-${g.id}`,
                    );
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigate(
                        `/groups/${g.id}`,
                        e.currentTarget,
                        `group-${g.id}`,
                      );
                    }
                  }}
                >
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {startIndex + idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {g.branch_name || getBranchName(g.branch_id)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${g.course_type === 'avto_maktab' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'}`}
                    >
                      {g.course_type === 'avto_maktab'
                        ? t('groups.course_school')
                        : t('groups.course_fast')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{g.active_students}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${g.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
                    >
                      {g.is_active ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {formatDate(g.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
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
                    </div>
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
};

export default GroupsTable;
