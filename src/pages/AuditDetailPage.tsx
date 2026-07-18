import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Warning } from '@phosphor-icons/react';
import { useAuditLogById } from '@/services/auditService';
import { EntityDetailShell } from '@/components/ui/EntityDetailShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AuditLog } from '@/types/audit';
import {
  formatAuditDate,
  formatAuditAction,
  auditActionBg,
  formatAuditEntity,
  formatAuditRole,
} from '@/lib/auditFormat';

// Entities that have their own detail page — link entity_id there.
const entityRoute: Record<string, string> = {
  student: '/students',
  branch: '/branches',
  group: '/groups',
  user: '/users',
};

// Moved from AuditLogPage's modal as-is (autodrive-6ef.25) — renders the
// before/after diff (update) or a full-dump table (create/delete).
const AuditChangesView = (
  { changes, action }: { changes: Record<string, unknown>; action: string },
  t: (key: string, opts?: Record<string, unknown>) => string,
) => {
  const hasBefore = 'before' in changes;
  const hasAfter = 'after' in changes;

  if (hasBefore || hasAfter) {
    const before = (changes.before || {}) as Record<string, unknown>;
    const after = (changes.after || {}) as Record<string, unknown>;
    const allKeys = [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ];
    const changedKeys = allKeys.filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]),
    );

    return (
      <div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground mb-2">
          {t('audit.changes')}
        </p>
        {changedKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('audit.no_changes')}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">
                    {t('audit.field_name')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t('audit.old_value')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t('audit.new_value')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {changedKeys.map((k) => (
                  <tr
                    key={k}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium">{k}</td>
                    <td className="px-3 py-2 text-destructive">
                      {String(before[k] ?? t('audit.field_no'))}
                    </td>
                    <td className="px-3 py-2 text-success">
                      {String(after[k] ?? t('audit.field_no'))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Flat changes
  const keys = Object.keys(changes).filter((k) => changes[k] != null);

  return (
    <div>
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground mb-2">
        {action === 'CREATE'
          ? t('audit.created_data')
          : action === 'DELETE'
            ? t('audit.deleted_data')
            : t('audit.changes')}
      </p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">
                {t('audit.field_name')}
              </th>
              {action === 'UPDATE' ? (
                <>
                  <th className="px-3 py-2 text-left font-medium">
                    {t('audit.old_short')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t('audit.new_short')}
                  </th>
                </>
              ) : (
                <th className="px-3 py-2 text-left font-medium">
                  {t('audit.value_short')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const val = changes[k];
              const isFromTo =
                val !== null &&
                typeof val === 'object' &&
                'from' in (val as object) &&
                'to' in (val as object);
              const fromTo = isFromTo
                ? (val as { from: unknown; to: unknown })
                : null;
              return (
                <tr key={k} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 font-medium">{k}</td>
                  {action === 'UPDATE' ? (
                    fromTo ? (
                      <>
                        <td className="px-3 py-2 text-destructive">
                          {String(fromTo.from ?? t('audit.field_no'))}
                        </td>
                        <td className="px-3 py-2 text-success">
                          {String(fromTo.to ?? t('audit.field_no'))}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-muted-foreground">
                          {t('audit.field_no')}
                        </td>
                        <td className="px-3 py-2">{String(val)}</td>
                      </>
                    )
                  ) : (
                    <td className="px-3 py-2 text-muted-foreground">
                      {String(val)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AuditDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Router state is an optimistic pre-fill (instant paint when navigated
  // from AuditLogPage's row click) — the real source of truth is the
  // GET /audit-logs/:id fetch below, which also makes this route work on
  // direct load, refresh, or a bookmarked/shared link.
  const stateLog = (location.state as { log?: AuditLog } | null)?.log;
  const { data: fetchedLog, isLoading, isError } = useAuditLogById(id);
  const log = fetchedLog ?? (stateLog?.id === id ? stateLog : undefined);

  // stateLog is an optimistic pre-fill, so "loading" only means something
  // while there's no log yet at all -- same for the error/not-found split
  // below (isError picks Warning+common.error, otherwise it's a plain
  // not-found with ShieldCheck+common.not_found).
  const effectiveLoading = isLoading && !log;

  if (effectiveLoading || !log) {
    return (
      <EntityDetailShell
        onBack={() => navigate('/audit')}
        backLabel={t('audit.title')}
        isLoading={effectiveLoading}
        isError={!effectiveLoading}
        errorTitle={isError ? t('common.error') : t('common.not_found')}
        errorIcon={isError ? Warning : ShieldCheck}
      />
    );
  }

  const entityLink = entityRoute[log.entity];

  return (
    <EntityDetailShell
      onBack={() => navigate('/audit')}
      backLabel={t('audit.title')}
      isLoading={false}
      isError={false}
      header={
        <div className="glass-card flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2 flex-wrap text-balance">
              <span
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  auditActionBg(log.action),
                )}
              >
                {formatAuditAction(log.action, t)}
              </span>
              <span>{formatAuditEntity(log.entity, t)}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{log.user_name || t('common.na')}</span>
              <span>·</span>
              <span>{formatAuditDate(log.created_at)}</span>
            </div>
          </div>
        </div>
      }
    >
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t('audit.detail_info')}</TabsTrigger>
          <TabsTrigger value="changes">{t('audit.changes')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <dl className="glass-card grid grid-cols-1 gap-x-8 gap-y-3 p-5 text-sm sm:grid-cols-2">
            <Field
              label={t('audit.table_user')}
              value={log.user_name || t('common.na')}
            />
            <Field
              label={t('users.detail.role')}
              value={formatAuditRole(log.user_role, t)}
            />
            <Field
              label={t('audit.table_action')}
              value={formatAuditAction(log.action, t)}
            />
            <Field
              label={t('audit.table_entity')}
              value={formatAuditEntity(log.entity, t)}
            />
            <Field
              label={t('audit.entity_id')}
              value={
                entityLink ? (
                  <button
                    onClick={() => navigate(`${entityLink}/${log.entity_id}`)}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {log.entity_id}
                  </button>
                ) : (
                  <span className="font-mono text-xs">{log.entity_id}</span>
                )
              }
            />
            <Field
              label={t('audit.table_time')}
              value={formatAuditDate(log.created_at)}
            />
          </dl>
        </TabsContent>

        <TabsContent value="changes">
          <div className="glass-card p-5">
            {log.changes ? (
              AuditChangesView({ changes: log.changes, action: log.action }, t)
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('audit.no_details')}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
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

export default AuditDetailPage;
