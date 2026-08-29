import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useTranslation } from 'react-i18next';
import { Warning, PencilSimple, ShieldCheck } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { EntityDetailShell } from '@/components/ui/EntityDetailShell';
import { DataCard } from '@/components/ui/DataCard';
import CourseFormDialog from './courses/CourseFormDialog';
import { useCourse } from '@/services/courseService';
import { useStudents } from '@/services/studentService';
import { useBranches } from '@/services/branchService';
import { useIsCrossTenant } from '@/hooks/useCan';
import { useAuthStore } from '@/store/authStore';
import { formatMoney } from '@/lib/money';
import type { StudentStatus } from '@/types/student';

// ponytail: this is a read-only roster tab, not the paginated StudentsPage --
// one generous page instead of adding pagination controls here. Same ceiling
// TeacherDashboard already uses (STUDENTS_FETCH_LIMIT); add real pagination
// if a single course ever enrolls more than this.
const STUDENTS_FETCH_LIMIT = 200;
const CourseDetailPage = () => {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { searchParams } = useUrlParams();
  const isCrossTenant = useIsCrossTenant();
  const authUser = useAuthStore((s) => s.user);

  const { data: course, isLoading, isError } = useCourse(id);
  const { data: branches } = useBranches();
  const [editOpen, setEditOpen] = useState(false);

  // Same defaultBranchId idiom as StudentsPage/GroupsPage/TeacherDashboard --
  // branchId always comes from the JWT via authStore, never an independent
  // FE value. Cross-tenant roles (owner/dev) leave it unset and see every
  // branch; a branch-scoped role (manager/operator/teacher) is pinned to
  // their own branch, which is also this course's branch.
  const branchId = isCrossTenant ? undefined : authUser?.branch_id || undefined;
  const {
    data: students,
    isLoading: studentsLoading,
    isError: studentsError,
  } = useStudents(undefined, branchId, 1, STUDENTS_FETCH_LIMIT, undefined, {
    courseId: id,
    enabled: !!id,
  });

  const statusLabels: Record<StudentStatus, string> = {
    active: t('students.status_active'),
    completed: t('students.status_completed'),
    dropped: t('students.status_dropped'),
    suspended: t('students.status_suspended'),
  };

  if (isLoading || isError || !course) {
    return (
      <EntityDetailShell
        onBack={() => navigate({ to: '/courses' })}
        backLabel={t('courses.title')}
        isLoading={isLoading}
        isError={isError || !course}
        errorTitle={isError ? t('common.error') : t('common.not_found')}
        errorIcon={isError ? Warning : ShieldCheck}
      />
    );
  }

  const courseTypeLabel =
    course.course_type === 'tezkor'
      ? t('courses.type_tezkor')
      : t('courses.type_avto_maktab');

  const initialTab =
    searchParams.get('tab') === 'students' ? 'students' : 'info';

  return (
    <EntityDetailShell
      onBack={() => navigate({ to: '/courses' })}
      backLabel={t('courses.title')}
      isLoading={false}
      isError={false}
      header={
        <div className="glass-card flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-bold text-balance">
              {course.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{course.branch_name ?? t('common.na')}</span>
              <span>·</span>
              <span>{courseTypeLabel}</span>
              <span>·</span>
              <span>{formatMoney(course.price)}</span>
            </div>
            <Badge variant={course.is_active ? 'secondary' : 'destructive'}>
              {course.is_active ? t('common.active') : t('common.inactive')}
            </Badge>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setEditOpen(true)}
          >
            <PencilSimple className="h-4 w-4" /> {t('common.edit')}
          </Button>
        </div>
      }
    >
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="info">{t('common.tab_info')}</TabsTrigger>
          <TabsTrigger value="students">{t('students.title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <dl className="glass-card grid grid-cols-1 gap-x-8 gap-y-3 p-5 text-sm sm:grid-cols-2">
            <Field label={t('courses.name')} value={course.name} />
            <Field label={t('courses.type')} value={courseTypeLabel} />
            <Field
              label={t('courses.price')}
              value={formatMoney(course.price)}
            />
            <Field
              label={t('courses.duration')}
              value={t('courses.duration_days_value', {
                count: course.duration_days,
              })}
            />
            <Field
              label={t('common.branch')}
              value={course.branch_name ?? t('common.na')}
            />
            <Field
              label={t('common.status')}
              value={
                course.is_active ? t('common.active') : t('common.inactive')
              }
            />
          </dl>
        </TabsContent>

        <TabsContent value="students">
          {studentsError ? (
            <EmptyState title={t('common.error')} />
          ) : studentsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (students || []).length === 0 ? (
            <EmptyState title={t('students.not_found')} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(students || []).map((s) => (
                <DataCard
                  key={s.id}
                  title={`${s.last_name} ${s.first_name}`.trim()}
                  subtitle={s.group_name ?? t('common.na')}
                  onClick={() =>
                    navigate({ to: '/students/$id', params: { id: s.id } })
                  }
                  fields={[
                    {
                      label: t('students.status'),
                      value: s.status ? statusLabels[s.status] : t('common.na'),
                    },
                  ]}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CourseFormDialog
        open={editOpen}
        editCourse={course}
        branches={branches || []}
        onClose={() => setEditOpen(false)}
      />
    </EntityDetailShell>
  );
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd>{value}</dd>
  </div>
);

export default CourseDetailPage;
