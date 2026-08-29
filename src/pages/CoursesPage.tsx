import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/app/navigation';
import { useCourses, useDeleteCourse } from '@/services/courseService';
import { useBranches } from '@/services/branchService';
import { Course } from '@/types/course';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { Plus, BookOpen, CircleNotch } from '@phosphor-icons/react';
import { extractErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import CourseFormDialog from './courses/CourseFormDialog';
import { CoursesGrid } from './courses/CoursesGrid';
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
          <CoursesGrid
            courses={courses || []}
            isLoading={isLoading}
            isFetching={isFetching}
            onNavigate={(course) => navigate(`/courses/${course.id}`)}
            onCreate={openCreate}
            onEdit={openEdit}
            onDelete={setDeleteId}
          />
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
