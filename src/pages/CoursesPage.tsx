import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCourses, useDeleteCourse } from '@/services/courseService';
import { useBranches } from '@/services/branchService';
import { Course } from '@/types/course';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import {
  Plus,
  PencilSimple,
  Trash,
  BookOpen,
  CircleNotch,
} from '@phosphor-icons/react';
import { extractErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import CourseFormDialog from './courses/CourseFormDialog';
import { PageHeader } from '@/components/layout/PageHeader';

const CoursesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: courses, isLoading, isFetching } = useCourses();
  const { data: branches } = useBranches();
  const deleteMut = useDeleteCourse();

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Course | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditItem(c);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMut.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t('courses.deleted'));
        setDeleteId(null);
      },
      onError: (err) => toast.error(extractErrorMessage(err)),
    });
  };

  const courseTypeLabel = (type: Course['course_type']) =>
    type === 'tezkor'
      ? t('courses.type_tezkor')
      : t('courses.type_avto_maktab');
  const coursesTitle = t('courses.title');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={coursesTitle}
        title={coursesTitle}
        description={t('courses.subtitle')}
        icon={<BookOpen className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t('courses.add')}
          </Button>
        }
      />

      <div className="relative">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
            <CircleNotch className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <div
          className={cn(
            'glass-card overflow-hidden transition-opacity duration-200',
            isFetching && !isLoading && 'opacity-50',
          )}
        >
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('courses.name')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('common.branch')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t('courses.type')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    {t('courses.price')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t('courses.duration')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t('common.status')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={7} className="p-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : (courses || []).length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={BookOpen}
                        title={t('courses.not_found')}
                        description={t('courses.not_found_desc')}
                        action={{
                          label: t('courses.add'),
                          onClick: openCreate,
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  (courses || []).map((c) => (
                    <tr
                      key={c.id}
                      className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => {
                        if (window.getSelection()?.toString()) return;
                        navigate(`/courses/${c.id}`);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/courses/${c.id}`);
                        if (e.key === ' ') {
                          e.preventDefault();
                          navigate(`/courses/${c.id}`);
                        }
                      }}
                    >
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.branch_name || t('common.na')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {courseTypeLabel(c.course_type)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(c.price)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {t('courses.duration_days_value', {
                          count: c.duration_days,
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.is_active ? (
                          <span className="text-success">
                            {t('common.active')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {t('common.inactive')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(c);
                            }}
                            aria-label={t('common.edit')}
                            title={t('common.edit')}
                            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <PencilSimple className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(c.id);
                            }}
                            aria-label={t('common.delete')}
                            title={t('common.delete')}
                            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-3 md:hidden">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))
          ) : courses && courses.length > 0 ? (
            courses.map((c) => (
              <DataCard
                key={c.id}
                title={c.name}
                subtitle={c.branch_name}
                onClick={() => navigate(`/courses/${c.id}`)}
                fields={[
                  {
                    label: t('courses.type'),
                    value: courseTypeLabel(c.course_type),
                  },
                  { label: t('courses.price'), value: formatMoney(c.price) },
                  {
                    label: t('courses.duration'),
                    value: t('courses.duration_days_value', {
                      count: c.duration_days,
                    }),
                  },
                  {
                    label: t('common.status'),
                    value: c.is_active
                      ? t('common.active')
                      : t('common.inactive'),
                  },
                ]}
                actions={
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(c);
                      }}
                      aria-label={t('common.edit')}
                      title={t('common.edit')}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <PencilSimple className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(c.id);
                      }}
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </>
                }
              />
            ))
          ) : (
            <EmptyState
              icon={BookOpen}
              title={t('courses.not_found')}
              description={t('courses.not_found_desc')}
              action={{ label: t('courses.add'), onClick: openCreate }}
            />
          )}
        </div>
      </div>

      <CourseFormDialog
        open={modalOpen}
        editCourse={editItem}
        branches={branches || []}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        description={
          deleteId
            ? t('courses.confirm_delete_desc', {
                name: courses?.find((c) => c.id === deleteId)?.name,
              })
            : undefined
        }
      />
    </div>
  );
};

export default CoursesPage;
