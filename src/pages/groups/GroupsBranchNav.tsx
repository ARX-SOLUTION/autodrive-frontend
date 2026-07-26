/**
 * Callers: GroupsPage (cross-tenant, multi-branch).
 * API: searchable branch sidebar → onSelectBranch (URL branch_id).
 * Schema: GroupOverview[] for counts; never dumps group rows.
 * User: "10+ bo'lib ketsa umuman UX ga ziq" — chips failed; master-detail nav.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { GroupOverview } from '@/types/group';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface BranchNavItem {
  id: string;
  name: string;
  groupCount: number;
  studentCount: number;
}

interface GroupsBranchNavProps {
  overview: GroupOverview[] | undefined;
  selectedBranchId?: string;
  onSelectBranch: (branchId: string | undefined) => void;
  className?: string;
}

function toItems(overview: GroupOverview[] | undefined): BranchNavItem[] {
  if (!overview?.length) return [];
  return overview.map((ov) => ({
    id: ov.branch_id,
    name: ov.branch_name,
    groupCount: ov.groups.length,
    studentCount: ov.groups.reduce(
      (sum, g) => sum + (g.active_students || 0),
      0,
    ),
  }));
}

export function GroupsBranchNav({
  overview,
  selectedBranchId,
  onSelectBranch,
  className,
}: GroupsBranchNavProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const items = useMemo(() => toItems(overview), [overview]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((b) => b.name.toLowerCase().includes(q));
  }, [items, query]);

  const totals = useMemo(
    () => ({
      groups: items.reduce((s, b) => s + b.groupCount, 0),
      students: items.reduce((s, b) => s + b.studentCount, 0),
    }),
    [items],
  );

  if (items.length <= 1) return null;

  const allSelected = !selectedBranchId;

  return (
    <nav
      aria-label={t('groups.by_branch')}
      className={cn(
        'flex max-h-[min(70dvh,36rem)] flex-col overflow-hidden rounded-xl border border-border bg-card',
        className,
      )}
    >
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <h2 className="font-heading text-sm font-semibold text-foreground text-balance">
          {t('groups.by_branch')}
        </h2>
        <div className="relative">
          <MagnifyingGlass
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('groups.branch_search')}
            aria-label={t('groups.branch_search')}
            className="h-9 bg-secondary pl-8 text-sm"
          />
        </div>
      </div>

      <div
        role="listbox"
        aria-label={t('groups.by_branch')}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
      >
        <button
          type="button"
          role="option"
          aria-selected={allSelected}
          onClick={() => onSelectBranch(undefined)}
          className={cn(
            'flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            allSelected
              ? 'bg-primary/10 text-foreground'
              : 'text-foreground hover:bg-muted/60',
          )}
        >
          <span className="font-medium">{t('common.all')}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t('groups.branch_summary', {
              groups: totals.groups,
              students: totals.students,
            })}
          </span>
        </button>

        {filtered.length === 0 ? (
          <p className="px-2.5 py-4 text-center text-xs text-muted-foreground">
            {t('groups.branch_search_empty')}
          </p>
        ) : (
          filtered.map((branch) => {
            const selected = selectedBranchId === branch.id;
            return (
              <button
                key={branch.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelectBranch(branch.id)}
                className={cn(
                  'flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'bg-primary/10 text-foreground'
                    : 'text-foreground hover:bg-muted/60',
                )}
              >
                <span className="truncate font-medium">{branch.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t('groups.branch_summary', {
                    groups: branch.groupCount,
                    students: branch.studentCount,
                  })}
                </span>
              </button>
            );
          })
        )}
      </div>
    </nav>
  );
}

export default GroupsBranchNav;
