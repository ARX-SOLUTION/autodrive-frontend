import { useTranslation } from 'react-i18next';
import { useBranches } from '@/services/branchService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Pencil, Trash2, MapPin, Building2 } from 'lucide-react';
import { formatDate } from '@/pages/StudentsPage';

const BranchesPage = () => {
  const { t } = useTranslation();
  const { data: branches, isLoading } = useBranches();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            {t('branches.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('branches.subtitle')}
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> {t('branches.add')}
        </Button>
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))
            ) : (branches || []).length === 0 ? (
              <div className="md:col-span-2">
                <EmptyState
                  icon={Building2}
                  title={t('branches.not_found')}
                  description={t('branches.not_found_desc')}
                />
              </div>
            ) : (
              (branches || []).map((b) => (
                <div key={b.id} className="glass-card p-5 animate-slide-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-balance">
                        {b.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {b.location}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        aria-label={t('common.edit')}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        aria-label={t('common.delete')}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {t('branches.manager')}:{' '}
                      </span>
                      <span className="text-foreground font-medium">
                        {b.manager_name || t('common.na')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t('branches.students')}:{' '}
                      </span>
                      <span className="text-foreground font-medium">
                        {b.active_students}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))
        ) : branches && branches.length > 0 ? (
          branches.map((b) => (
            <DataCard
              key={b.id}
              title={b.name}
              subtitle={b.location}
              fields={[
                { label: t('branches.students'), value: b.active_students },
                {
                  label: t('branches.created'),
                  value: formatDate(b.created_at),
                },
                {
                  label: t('branches.status'),
                  value: t('branches.status_active'),
                },
              ]}
              actions={
                <>
                  <button
                    aria-label={t('common.edit')}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label={t('common.delete')}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              }
            />
          ))
        ) : (
          <EmptyState
            icon={Building2}
            title={t('branches.not_found')}
            description={t('branches.not_found_desc')}
          />
        )}
      </div>
    </div>
  );
};

export default BranchesPage;
