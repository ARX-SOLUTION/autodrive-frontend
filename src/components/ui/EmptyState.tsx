import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
    {description && (
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    )}
    {action && (
      <Button onClick={action.onClick} className="mt-4" size="sm">
        {action.label}
      </Button>
    )}
  </div>
);
