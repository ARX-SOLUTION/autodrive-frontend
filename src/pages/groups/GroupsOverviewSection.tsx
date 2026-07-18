import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDown, CaretRight } from '@phosphor-icons/react';
import { GroupOverview } from '@/types/group';

interface GroupsOverviewSectionProps {
  overview: GroupOverview[] | undefined;
}

const GroupsOverviewSection = ({ overview }: GroupsOverviewSectionProps) => {
  const { t } = useTranslation();
  const [expandedBranches, setExpandedBranches] = useState<
    Record<string, boolean>
  >({});

  const toggleBranch = (id: string) =>
    setExpandedBranches((prev) => ({ ...prev, [id]: !prev[id] }));

  if (!overview || overview.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-sm font-semibold text-muted-foreground text-balance">
        {t('groups.by_branch')}
      </h2>
      <div className="space-y-2">
        {overview.map((ov) => (
          <div key={ov.branch_id} className="glass-card overflow-hidden">
            <button
              onClick={() => toggleBranch(ov.branch_id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
            >
              <span className="font-medium">
                {ov.branch_name}{' '}
                <span className="text-muted-foreground text-sm">
                  {t('groups.group_count', { count: ov.groups.length })}
                </span>
              </span>
              {expandedBranches[ov.branch_id] ? (
                <CaretDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <CaretRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {expandedBranches[ov.branch_id] && (
              <div className="border-t border-border px-4 py-2 space-y-1">
                {ov.groups.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between py-1.5 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{g.name}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${g.course_type === 'avto_maktab' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'}`}
                      >
                        {g.course_type === 'avto_maktab'
                          ? t('groups.course_school')
                          : t('groups.course_fast')}
                      </span>
                      <span className="text-muted-foreground">
                        {g.active_students}{' '}
                        {t('groups.student_count').toLowerCase()}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${g.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
                    >
                      {g.is_active ? t('common.active') : t('common.inactive')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupsOverviewSection;
