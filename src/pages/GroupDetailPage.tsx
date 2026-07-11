import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataCard } from '@/components/ui/DataCard';
import { useGroup } from '@/services/groupService';
import { DAY_LABELS } from '@/types/schedule';

const money = (n?: number) =>
  `${Number(n ?? 0)
    .toLocaleString('ru-RU')
    .replace(/,/g, ' ')} so'm`;

const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: group, isLoading, isError } = useGroup(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="space-y-6">
        <BackButton
          onClick={() => navigate('/groups')}
          label={t('groups.title')}
        />
        <EmptyState title={t('common.not_found')} />
      </div>
    );
  }

  const courseLabel = t(
    group.course_type === 'avto_maktab'
      ? 'groups.course_school'
      : 'groups.course_fast',
  );

  return (
    <div className="space-y-6">
      <BackButton
        onClick={() => navigate('/groups')}
        label={t('groups.title')}
      />

      {/* Header */}
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

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">
            {t('students.detail.tab_info')}
          </TabsTrigger>
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
                  fields={[
                    {
                      label: t('students.detail.debt'),
                      value: (
                        <span
                          className={
                            s.debt > 0 ? 'text-destructive' : 'text-success'
                          }
                        >
                          {s.debt > 0 ? money(s.debt) : t('common.na')}
                        </span>
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
    </div>
  );
};

const BackButton = ({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
  >
    <ArrowLeft className="h-4 w-4" /> {label}
  </button>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd>{value}</dd>
  </div>
);

export default GroupDetailPage;
