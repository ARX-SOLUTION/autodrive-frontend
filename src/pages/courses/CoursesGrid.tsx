import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilSimple, Trash, BookOpen } from '@phosphor-icons/react';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { DataGrid, createDataGridColumnHelper } from '@/shared/ui/data-grid';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/money';
import type { Course } from '@/types/course';

interface CoursesGridProps {
  courses: Course[];
  isLoading: boolean;
  isFetching: boolean;
  onNavigate: (course: Course) => void;
  onCreate: () => void;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
}

const columnHelper = createDataGridColumnHelper<Course>();
const noColumnFilters: ColumnFiltersState = [];
const ignoreColumnFilters = () => undefined;
const ignorePagination = () => undefined;

export function CoursesGrid({
  courses,
  isLoading,
  isFetching,
  onNavigate,
  onCreate,
  onEdit,
  onDelete,
}: CoursesGridProps) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);

  const courseTypeLabel = (type: Course['course_type']) =>
    type === 'tezkor'
      ? t('courses.type_tezkor')
      : t('courses.type_avto_maktab');

  const columns = columnHelper.columns([
    columnHelper.accessor('name', {
      header: t('courses.name'),
      enableSorting: true,
      meta: { cellClassName: 'font-medium' },
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.display({
      id: 'branch',
      header: t('common.branch'),
      meta: { cellClassName: 'text-muted-foreground' },
      cell: ({ row }) => row.original.branch_name || t('common.na'),
    }),
    columnHelper.accessor('course_type', {
      header: t('courses.type'),
      enableSorting: true,
      meta: { align: 'center' },
      cell: ({ getValue }) => courseTypeLabel(getValue()),
    }),
    columnHelper.accessor('price', {
      header: t('courses.price'),
      enableSorting: true,
      meta: { align: 'right', cellClassName: 'tabular-nums' },
      cell: ({ getValue }) => formatMoney(getValue()),
    }),
    columnHelper.accessor('duration_days', {
      header: t('courses.duration'),
      enableSorting: true,
      meta: { align: 'center' },
      cell: ({ getValue }) =>
        t('courses.duration_days_value', { count: getValue() }),
    }),
    columnHelper.accessor('is_active', {
      header: t('common.status'),
      meta: { align: 'center' },
      cell: ({ getValue }) => (
        <span className={getValue() ? 'text-success' : 'text-muted-foreground'}>
          {getValue() ? t('common.active') : t('common.inactive')}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: t('common.actions'),
      meta: { align: 'center' },
      cell: ({ row }) => (
        <CourseActions
          course={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
    }),
  ]);

  const emptyState = (
    <EmptyState
      icon={BookOpen}
      title={t('courses.not_found')}
      description={t('courses.not_found_desc')}
      action={{ label: t('courses.add'), onClick: onCreate }}
    />
  );

  return (
    <DataGrid
      data={courses}
      columns={columns}
      getRowId={(course) => course.id}
      pagination={{
        pageIndex: 0,
        pageSize: Math.max(courses.length, 1),
        rowCount: courses.length,
        pageCount: 1,
      }}
      onPaginationChange={ignorePagination}
      sorting={sorting}
      onSortingChange={setSorting}
      columnFilters={noColumnFilters}
      onColumnFiltersChange={ignoreColumnFilters}
      manualPagination={false}
      manualSorting={false}
      manualFiltering={false}
      isInitialLoading={isLoading}
      isFetching={isFetching}
      labels={{
        table: t('courses.title'),
        loading: t('common.loading'),
        fetching: t('common.loading'),
        previousPage: t('common.previous'),
        nextPage: t('common.next'),
      }}
      loadingState={<Skeleton className="h-5 w-full" />}
      emptyState={emptyState}
      renderMobileRow={({ row }) => (
        <DataCard
          title={row.name}
          subtitle={row.branch_name}
          onClick={() => onNavigate(row)}
          fields={[
            {
              label: t('courses.type'),
              value: courseTypeLabel(row.course_type),
            },
            { label: t('courses.price'), value: formatMoney(row.price) },
            {
              label: t('courses.duration'),
              value: t('courses.duration_days_value', {
                count: row.duration_days,
              }),
            },
            {
              label: t('common.status'),
              value: row.is_active ? t('common.active') : t('common.inactive'),
            },
          ]}
          actions={
            <CourseActions course={row} onEdit={onEdit} onDelete={onDelete} />
          }
        />
      )}
      onRowActivate={(course) => onNavigate(course)}
      getRowAriaLabel={(course) => course.name}
      showPagination={false}
    />
  );
}

interface CourseActionsProps {
  course: Course;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
}

function CourseActions({ course, onEdit, onDelete }: CourseActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit(course);
        }}
        aria-label={t('common.edit')}
        title={t('common.edit')}
        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <PencilSimple className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(course.id);
        }}
        aria-label={t('common.delete')}
        title={t('common.delete')}
        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
      >
        <Trash className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
