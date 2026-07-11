import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Phone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useBranch } from '@/services/branchService';

const money = (n?: number) =>
  `${Number(n ?? 0)
    .toLocaleString('ru-RU')
    .replace(/,/g, ' ')} so'm`;

const BranchDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: branch, isLoading, isError } = useBranch(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !branch) {
    return (
      <div className="space-y-6">
        <BackButton
          onClick={() => navigate('/branches')}
          label={t('branches.title')}
        />
        <EmptyState title={t('common.not_found')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton
        onClick={() => navigate('/branches')}
        label={t('branches.title')}
      />

      {/* Header */}
      <div className="glass-card space-y-2 p-5">
        <h1
          className="font-heading text-2xl font-bold text-balance"
          style={{ viewTransitionName: `branch-${branch.id}` }}
        >
          {branch.name}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {branch.location}
          </span>
          {branch.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {branch.phone}
            </span>
          )}
          <span>
            {t('branches.manager')}: {branch.manager_name || t('common.na')}
          </span>
        </div>
      </div>

      {/* Analytics */}
      <dl className="glass-card grid grid-cols-1 gap-x-8 gap-y-3 p-5 text-sm sm:grid-cols-2">
        <Field
          label={t('branches.students')}
          value={String(branch.active_students)}
        />
        <Field
          label={t('branches.detail.revenue')}
          value={money(branch.revenue)}
        />
        <Field label={t('branches.detail.debt')} value={money(branch.debt)} />
        <Field
          label={t('branches.detail.today_payment')}
          value={money(branch.today_payment)}
        />
      </dl>
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

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd>{value}</dd>
  </div>
);

export default BranchDetailPage;
