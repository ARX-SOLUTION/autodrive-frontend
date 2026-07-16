import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { EntityDetailShell } from '@/components/ui/EntityDetailShell';
import { DataCard } from '@/components/ui/DataCard';
import StudentModal, {
  type CreateStudentPayload,
} from '@/components/ui/StudentModal';
import { useGroup } from '@/services/groupService';
import { useUpdateStudent } from '@/services/studentService';
import { useOperators } from '@/services/operatorService';
import { extractErrorMessage } from '@/lib/errors';
import { DAY_LABELS } from '@/types/schedule';
import { formatMoney } from '@/lib/money';
import type { Student } from '@/types/student';

const EDIT_DISABLED_FIELDS = [
  'total_price',
  'payment_method',
  'initial_payment',
  'debt',
];

const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: group, isLoading, isError } = useGroup(id);
  const { data: operators } = useOperators();
  const updateStudent = useUpdateStudent();
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  const handleUpdate = (data: CreateStudentPayload) => {
    if (!editStudent) return;
    updateStudent.mutate(
      { id: editStudent.id, ...data },
      {
        onSuccess: () => {
          toast.success(t('students.updated'));
          setEditStudent(null);
          // useUpdateStudent invalidates students/payments/dashboard but not
          // this group's own query — group membership can change on edit.
          qc.invalidateQueries({ queryKey: ['groups'] });
        },
        onError: (err) =>
          toast.error(extractErrorMessage(err, t('common.error'))),
      },
    );
  };

  if (isLoading || isError || !group) {
    return (
      <EntityDetailShell
        onBack={() => navigate('/groups')}
        backLabel={t('groups.title')}
        isLoading={isLoading}
        isError={isError || !group}
        errorTitle={t('common.not_found')}
      />
    );
  }

  const courseLabel = t(
    group.course_type === 'avto_maktab'
      ? 'groups.course_school'
      : 'groups.course_fast',
  );

  return (
    <EntityDetailShell
      onBack={() => navigate('/groups')}
      backLabel={t('groups.title')}
      isLoading={false}
      isError={false}
      header={
        <div className="glass-card flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="space-y-2">
            <h1
              className="font-heading text-2xl font-bold text-balance"
              style={{ viewTransitionName: `group-${group.id}` }}
            >
              {group.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{group.branch_name ?? t('common.na')}</span>
              <span>·</span>
              <span>{courseLabel}</span>
              <span>·</span>
              <span>
                {t('groups.teacher')}: {group.teacher_name ?? t('common.na')}
              </span>
            </div>
            <Badge variant={group.is_active ? 'secondary' : 'destructive'}>
              {group.is_active ? t('common.active') : t('common.inactive')}
            </Badge>
          </div>
        </div>
      }
    >
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t('common.tab_info')}</TabsTrigger>
          <TabsTrigger value="students">{t('students.title')}</TabsTrigger>
          <TabsTrigger value="schedule">
            {t('groups.detail.tab_schedule')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <dl className="glass-card grid grid-cols-1 gap-x-8 gap-y-3 p-5 text-sm sm:grid-cols-2">
            <Field
              label={t('groups.teacher')}
              value={group.teacher_name ?? t('common.na')}
            />
            <Field label={t('groups.course_type')} value={courseLabel} />
            <Field
              label={t('common.branch')}
              value={group.branch_name ?? t('common.na')}
            />
            <Field
              label={t('groups.student_count')}
              value={String(group.active_students)}
            />
          </dl>
        </TabsContent>

        <TabsContent value="students">
          {group.students.length === 0 ? (
            <EmptyState title={t('students.not_found')} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {group.students.map((s) => (
                <DataCard
                  key={s.id}
                  title={`${s.last_name} ${s.first_name}`.trim()}
                  subtitle={s.phone}
                  onClick={() => navigate(`/students/${s.id}`)}
                  actions={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t('common.edit')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditStudent(s);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  }
                  fields={[
                    {
                      label: t('students.detail.debt'),
                      value:
                        s.debt > 0 ? (
                          <span className="text-destructive">
                            {formatMoney(s.debt)}
                          </span>
                        ) : s.debt < 0 ? (
                          <span className="text-success">
                            {t('students.credit_label')}:{' '}
                            {formatMoney(Math.abs(s.debt))}
                          </span>
                        ) : (
                          <span className="text-success">{t('common.na')}</span>
                        ),
                    },
                  ]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          {group.schedule.length === 0 ? (
            <EmptyState title={t('groups.detail.no_schedule')} />
          ) : (
            <div className="glass-card divide-y divide-border">
              {group.schedule.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-medium">
                    {DAY_LABELS[entry.day_of_week]}
                  </span>
                  <span>
                    {entry.start_time}—{entry.end_time}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {t(
                      entry.lesson_type === 'theory'
                        ? 'schedule.type_theory'
                        : 'schedule.type_practice',
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <StudentModal
        open={!!editStudent}
        onClose={() => setEditStudent(null)}
        onSubmit={handleUpdate}
        loading={updateStudent.isPending}
        student={editStudent}
        courseType={group.course_type}
        operators={operators || []}
        disabledFields={EDIT_DISABLED_FIELDS}
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

export default GroupDetailPage;
