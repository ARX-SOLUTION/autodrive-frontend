import type { ReactNode } from 'react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { Tray } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface EmptyStateActionConfig {
  label: string;
  onClick: () => void;
}

// Legacy call sites pass { label, onClick } and get a default <Button>;
// pass any other ReactNode (icon button, link, multiple actions) instead.
const isActionConfig = (
  action: EmptyStateActionConfig | ReactNode,
): action is EmptyStateActionConfig =>
  typeof action === 'object' &&
  action !== null &&
  'label' in action &&
  'onClick' in action;

interface EmptyStateProps {
  icon?: PhosphorIcon;
  title: string;
  description?: string;
  action?: EmptyStateActionConfig | ReactNode;
}

export const EmptyState = ({
  icon: Icon = Tray,
  title,
  description,
  action,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 p-3 text-primary">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="font-heading text-sm font-semibold text-foreground text-balance">
      {title}
    </h3>
    {description && (
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    )}
    {action &&
      (isActionConfig(action) ? (
        <Button onClick={action.onClick} className="mt-4" size="sm">
          {action.label}
        </Button>
      ) : (
        <div className="mt-4">{action}</div>
      ))}
  </div>
);
