import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useExpenseHistory } from '@/services/expenseService';
import type { ExpenseEvent, ExpenseEventAction } from '@/types/expense';

const ACTION_LABEL_KEYS: Record<ExpenseEventAction, string> = {
  created: 'expenses.history.actions.created',
  updated: 'expenses.history.actions.updated',
  cancelled: 'expenses.history.actions.cancelled',
  soft_deleted: 'expenses.history.actions.soft_deleted',
  payment_recorded: 'expenses.history.actions.payment_recorded',
  payment_voided: 'expenses.history.actions.payment_voided',
  reviewed: 'expenses.history.actions.reviewed',
};

const formatActor = (
  event: ExpenseEvent,
  t: (key: string, options?: Record<string, string>) => string,
) => {
  const actor = `${event.actor.name} (${t(`roles.${event.actor.role}`)})`;
  if (!event.impersonator) return actor;
  const impersonator = `${event.impersonator.name} (${t(`roles.${event.impersonator.role}`)})`;
  return t('expenses.history.actor_impersonated', { actor, impersonator });
};

interface ExpenseHistoryPanelProps {
  expenseId: string;
}

export const ExpenseHistoryPanel = ({
  expenseId,
}: ExpenseHistoryPanelProps) => {
  const { t } = useTranslation();
  const timelineQuery = useExpenseHistory(expenseId);
  const eventsMissing =
    timelineQuery.data != null && !Array.isArray(timelineQuery.data.events);
  const events = Array.isArray(timelineQuery.data?.events)
    ? timelineQuery.data.events
    : [];
  const showError = timelineQuery.isError || eventsMissing;

  return (
    <section
      className="glass-card space-y-4 p-5"
      data-testid="expense-history-panel"
    >
      <h2 className="font-heading text-lg font-semibold">
        {t('expenses.history.title')}
      </h2>

      {timelineQuery.isLoading && (
        <div className="space-y-2" data-testid="expense-history-loading">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {showError && !timelineQuery.isLoading && (
        <div
          className="flex items-center gap-3 text-sm"
          data-testid="expense-history-error"
        >
          <span>{t('common.error')}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void timelineQuery.refetch()}
          >
            {t('common.retry')}
          </Button>
        </div>
      )}

      {!timelineQuery.isLoading && !showError && events.length === 0 && (
        <EmptyState title={t('common.no_data')} />
      )}

      {!timelineQuery.isLoading && !showError && events.length > 0 && (
        <ol className="space-y-3" data-testid="expense-history-events">
          {events.map((event) => (
            <li
              key={event.id}
              className="border-b border-border py-2 text-sm last:border-b-0"
            >
              <div className="font-medium">
                {t(ACTION_LABEL_KEYS[event.action])}
              </div>
              <div className="text-muted-foreground">
                {formatActor(event, t)}
              </div>
              <div className="text-xs text-muted-foreground">
                {event.created_at}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
