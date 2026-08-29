import { useTranslation } from 'react-i18next';
import {
  PencilSimple,
  Trash,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import { DataGrid, createDataGridColumnHelper } from '@/shared/ui/data-grid';
import { DeletedBadge } from '@/components/ui/DeletedBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Group } from '@/types/group';
import { cn } from '@/lib/utils';
import { formatDate } from './formatDate';
import { GroupMobileCard } from './GroupsMobileList';

type GroupSortField = 'name' | 'course_type';

interface GroupsTableProps {
  groups: Group[];
  isLoading: boolean;
  isFetching: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortField: GroupSortField;
  sortDir: 'asc' | 'desc';
  onSortChange: (field: GroupSortField, dir: 'asc' | 'desc') => void;
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

const GROUPS_PER_PAGE = 10;
const columnHelper = createDataGridColumnHelper<Group>();
const noColumnFilters: ColumnFiltersState = [];
const ignoreColumnFilters = () => undefined;

const GroupsTable = ({
  groups,
  isLoading,
  isFetching,
  currentPage,
  totalPages,
  onPageChange,
  sortField,
  sortDir,
  onSortChange,
  getBranchName,
  onNavigate,
  onEdit,
  onDelete,
  canManageGroups,
  canViewDeleted,
  onRestore,
}: GroupsTableProps) => {
  const { t } = useTranslation();

  const columns = columnHelper.columns([
    columnHelper.display({
      id: 'index',
      header: '#',
      meta: { align: 'center', cellClassName: 'text-muted-foreground' },
      cell: ({ row, table }) => {
        const pageRowIndex = table
          .getRowModel()
          .rows.findIndex((candidate) => candidate.id === row.id);
        return (currentPage - 1) * GROUPS_PER_PAGE + pageRowIndex + 1;
      },
    }),
    columnHelper.accessor('name', {
      header: t('groups.name'),
      enableSorting: true,
      meta: { cellClassName: 'font-medium' },
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5">
          {row.original.name}
          {row.original.deleted_at && <DeletedBadge />}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'branch',
      header: t('common.branch'),
      meta: { cellClassName: 'text-muted-foreground' },
      cell: ({ row }) =>
        row.original.branch_name || getBranchName(row.original.branch_id),
    }),
    columnHelper.accessor('course_type', {
      header: t('groups.course_type'),
      enableSorting: true,
      meta: { align: 'center' },
      cell: ({ getValue }) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getValue() === 'avto_maktab' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'}`}
        >
          {getValue() === 'avto_maktab'
            ? t('groups.course_school')
            : t('groups.course_fast')}
        </span>
      ),
    }),
    columnHelper.accessor('active_students', {
      id: 'student_count',
      header: t('groups.student_count'),
      meta: { align: 'center' },
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.accessor('is_active', {
      id: 'status',
      header: t('common.status'),
      meta: { align: 'center' },
      cell: ({ getValue }) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getValue() ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
        >
          {getValue() ? t('common.active') : t('common.inactive')}
        </span>
      ),
    }),
    columnHelper.accessor('created_at', {
      header: t('groups.created'),
      meta: { cellClassName: 'text-muted-foreground tabular-nums' },
      cell: ({ getValue }) => formatDate(getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: t('common.actions'),
      meta: { align: 'center' },
      cell: ({ row }) => {
        const g = row.original;
        return g.deleted_at ? (
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
        );
      },
    }),
  ]);

  const sorting: SortingState = [{ id: sortField, desc: sortDir === 'desc' }];

  const handleSortingChange = (next: SortingState) => {
    const sort = next[0];
    if (sort?.id !== 'name' && sort?.id !== 'course_type') return;
    onSortChange(sort.id, sort.desc ? 'desc' : 'asc');
  };

  const handlePaginationChange = (next: PaginationState) => {
    if (next.pageIndex !== currentPage - 1) {
      onPageChange(next.pageIndex + 1);
    }
  };

  return (
    <DataGrid
      data={groups}
      columns={columns}
      getRowId={(group) => group.id}
      pagination={{
        pageIndex: currentPage - 1,
        pageSize: GROUPS_PER_PAGE,
        rowCount: groups.length,
        pageCount: totalPages,
      }}
      onPaginationChange={handlePaginationChange}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      columnFilters={noColumnFilters}
      onColumnFiltersChange={ignoreColumnFilters}
      manualPagination={false}
      manualSorting={false}
      manualFiltering
      isInitialLoading={isLoading}
      isFetching={isFetching}
      labels={{
        table: t('groups.title'),
        loading: t('common.loading'),
        fetching: t('common.loading'),
        previousPage: t('common.previous'),
        nextPage: t('common.next'),
      }}
      loadingState={<Skeleton className="h-5 w-full" />}
      emptyState={null}
      renderMobileRow={({ row }) => (
        <GroupMobileCard
          group={row}
          getBranchName={getBranchName}
          onNavigate={onNavigate}
          onEdit={onEdit}
          onDelete={onDelete}
          canManageGroups={canManageGroups}
          canViewDeleted={canViewDeleted}
          onRestore={onRestore}
        />
      )}
      onRowActivate={(group, element) =>
        onNavigate(`/groups/${group.id}`, element, `group-${group.id}`)
      }
      getRowAriaLabel={(group) => group.name}
      rowClassName={(group) =>
        cn('table-row-interactive', group.deleted_at && 'opacity-60')
      }
    />
  );
};

export default GroupsTable;
