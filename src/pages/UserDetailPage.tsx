import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { EntityDetailShell } from '@/components/ui/EntityDetailShell';
import { DataCard } from '@/components/ui/DataCard';
import { useUser } from '@/services/userService';

// Which list page a given role's users are managed from — used for the back
// link and the row-click origin, since one UserDetailPage serves all three.
const backTargetByRole: Record<string, { path: string; labelKey: string }> = {
  teacher: { path: '/teachers', labelKey: 'teachers.title' },
  operator: { path: '/operators', labelKey: 'operators.title' },
};

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: user, isLoading, isError } = useUser(id);

  const backTarget = user
    ? (backTargetByRole[user.role] ?? {
        path: '/users',
        labelKey: 'users.title',
      })
    : { path: '/users', labelKey: 'users.title' };

  if (isLoading || isError || !user) {
    return (
      <EntityDetailShell
        onBack={() => navigate(backTarget.path)}
        backLabel={t(backTarget.labelKey)}
        isLoading={isLoading}
        isError={isError || !user}
        errorTitle={isError ? t('common.error') : t('common.not_found')}
        errorIcon={isError ? AlertTriangle : ShieldCheck}
      />
    );
  }

  return (
    <EntityDetailShell
      onBack={() => navigate(backTarget.path)}
      backLabel={t(backTarget.labelKey)}
      isLoading={false}
      isError={false}
      header={
        <div className="glass-card flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-bold text-balance">
              {user.name || user.email}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{user.phone || t('common.na')}</span>
              <span>·</span>
              <span>{user.branch_name ?? t('common.na')}</span>
            </div>
            <Badge
              variant={user.is_active !== false ? 'secondary' : 'destructive'}
            >
              {user.is_active !== false
                ? t('common.active')
                : t('common.inactive')}
            </Badge>
          </div>
        </div>
      }
    >
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t('common.tab_info')}</TabsTrigger>
          {user.role === 'teacher' && (
            <TabsTrigger value="groups">{t('groups.title')}</TabsTrigger>
          )}
          {user.role === 'operator' && (
            <TabsTrigger value="students">
              {t('users.detail.tab_registered_students')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info">
          <dl className="glass-card grid grid-cols-1 gap-x-8 gap-y-3 p-5 text-sm sm:grid-cols-2">
            <Field
              label={t('users.name_label')}
              value={user.name || t('common.na')}
            />
            <Field label={t('common.email')} value={user.email} />
            <Field
              label={t('users.detail.phone')}
              value={user.phone || t('common.na')}
            />
            <Field
              label={t('users.detail.role')}
              value={t(`roles.${user.role}`, { defaultValue: user.role })}
            />
            <Field
              label={t('users.detail.branch')}
              value={user.branch_name ?? t('common.na')}
            />
            <Field
              label={t('users.detail.referred_students_count')}
              value={String(user.referred_students_count ?? 0)}
              to={`/students?referred_by_user_id=${user.id}`}
            />
          </dl>
        </TabsContent>

        {user.role === 'teacher' && (
          <TabsContent value="groups">
            {(user.groups ?? []).length === 0 ? (
              <EmptyState title={t('groups.not_found')} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(user.groups ?? []).map((g) => (
                  <DataCard
                    key={g.id}
                    title={g.name}
                    onClick={() => navigate(`/groups/${g.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {user.role === 'operator' && (
          <TabsContent value="students">
            {(user.registered_students ?? []).length === 0 ? (
              <EmptyState title={t('students.not_found')} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(user.registered_students ?? []).map((s) => (
                  <DataCard
                    key={s.id}
                    title={s.name}
                    onClick={() => navigate(`/students/${s.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </EntityDetailShell>
  );
};

const Field = ({
  label,
  value,
  to,
}: {
  label: string;
  value: React.ReactNode;
  to?: string;
}) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd>
      {to ? (
        <Link
          to={to}
          className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {value}
        </Link>
      ) : (
        value
      )}
    </dd>
  </div>
);

export default UserDetailPage;
