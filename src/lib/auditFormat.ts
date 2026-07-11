import { format } from 'date-fns';

// Shared by AuditLogPage (table/cards) and AuditDetailPage (Umumiy ma'lumot tab).
type Translate = (key: string, opts?: Record<string, unknown>) => string;

export const formatAuditDate = (d: string) => {
  try {
    if (!d) return '—';
    return format(new Date(d), 'dd.MM.yyyy HH:mm');
  } catch {
    return d;
  }
};

export const formatAuditAction = (action: string, t: Translate) => {
  const labels: Record<string, string> = {
    CREATE: t('audit.action_create'),
    UPDATE: t('audit.action_update'),
    DELETE: t('audit.action_delete'),
    LOGIN: t('audit.action_login'),
  };
  return labels[action] || action;
};

export const auditActionColor = (action: string) => {
  const colors: Record<string, string> = {
    CREATE: 'text-success',
    UPDATE: 'text-primary',
    DELETE: 'text-destructive',
  };
  return colors[action] || '';
};

export const auditActionBg = (action: string) => {
  const bg: Record<string, string> = {
    CREATE: 'bg-success/10 text-success',
    UPDATE: 'bg-primary/10 text-primary',
    DELETE: 'bg-destructive/10 text-destructive',
  };
  return bg[action] || 'bg-muted text-muted-foreground';
};

export const formatAuditEntity = (entity: string, t: Translate) => {
  const labels: Record<string, string> = {
    student: t('audit.entity_student'),
    payment: t('audit.entity_payment'),
    user: t('audit.entity_user'),
    branch: t('audit.entity_branch'),
    group: t('audit.entity_group'),
    operator: t('audit.entity_operator'),
    teacher: t('audit.entity_teacher'),
  };
  return labels[entity] || entity;
};

export const formatAuditRole = (
  role: string | null | undefined,
  t: Translate,
) => {
  if (!role) return t('common.na');
  return role;
};
