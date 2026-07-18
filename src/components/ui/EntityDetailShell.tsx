import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface EntityDetailShellProps {
  onBack: () => void;
  backLabel: string;
  isLoading: boolean;
  isError: boolean;
  errorTitle?: string;
  errorIcon?: PhosphorIcon;
  header?: ReactNode;
  children?: ReactNode;
}

// Shared skeleton/error/back-nav/header/tabs skeleton for the 5 entity detail
// pages (Student/Branch/Group/User/Audit). header and children are raw
// ReactNode (not structured slots) so each page keeps its exact JSX --
// view-transition names, role-gated actions, badges -- untouched; the shell
// only owns the state machine around it. children is optional: BranchDetailPage
// has no tabs, just an analytics section.
export const EntityDetailShell = ({
  onBack,
  backLabel,
  isLoading,
  isError,
  errorTitle,
  errorIcon,
  header,
  children,
}: EntityDetailShellProps) => (
  <div className="space-y-6">
    <BackButton onClick={onBack} label={backLabel} />
    {isLoading ? (
      <>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </>
    ) : isError ? (
      <EmptyState icon={errorIcon} title={errorTitle ?? ''} />
    ) : (
      <>
        {header}
        {children}
      </>
    )}
  </div>
);

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
