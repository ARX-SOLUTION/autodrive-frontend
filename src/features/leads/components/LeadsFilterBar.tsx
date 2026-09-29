import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DownloadSimple, Funnel } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchWithHotkey } from '@/components/filter/SearchWithHotkey';
import { ActiveFilterChips } from '@/components/filter/ActiveFilterChips';
import { MobileFilterSheet } from '@/components/filter/MobileFilterSheet';
import {
  useFilterBarState,
  type ActiveFilterChipItem,
} from '@/hooks/useFilterBarState';
import { useBranches } from '@/features/branches/api/branchService';
import { useCan } from '@/hooks/useCan';
import { useLeadStagesQuery } from '../queries/leadsQueries';
import { leadsApi } from '../api/leadsApi';
import type {
  ListLeadsQuery,
  LeadSource,
  Category,
} from '../types/leads.types';

export interface LeadsFilterBarProps {
  filters: ListLeadsQuery;
  onChange: (next: Partial<ListLeadsQuery>) => void;
  onClearAll: () => void;
}

const SOURCES: LeadSource[] = [
  'telegram',
  'instagram',
  'website',
  'recommendation',
  'banner',
  'walk_in',
  'other',
];

const CATEGORIES: Category[] = ['A', 'B', 'BC', 'C', 'D', 'E'];

export const LeadsFilterBar = ({
  filters,
  onChange,
  onClearAll,
}: LeadsFilterBarProps) => {
  const { t } = useTranslation();
  const canViewAllBranches = useCan('viewAllBranches');
  const { data: branches = [] } = useBranches();
  const { data: stages = [] } = useLeadStagesQuery();

  // Active filter chip items
  const chipItems = useMemo<(ActiveFilterChipItem | null)[]>(() => {
    const list: (ActiveFilterChipItem | null)[] = [];

    if (filters.q) {
      list.push({
        id: 'q',
        label: t('common.search', 'Qidiruv'),
        value: filters.q,
        onRemove: () => onChange({ q: undefined }),
      });
    }

    if (filters.branch_id) {
      const branchName =
        branches.find((b) => b.id === filters.branch_id)?.name ||
        filters.branch_id;
      list.push({
        id: 'branch_id',
        label: t('common.branch', 'Filial'),
        value: branchName,
        onRemove: () => onChange({ branch_id: undefined }),
      });
    }

    if (filters.stage_id) {
      const stageName =
        stages.find((s) => s.id === filters.stage_id)?.name || filters.stage_id;
      list.push({
        id: 'stage_id',
        label: t('leads.stage', 'Bosqich'),
        value: stageName,
        onRemove: () => onChange({ stage_id: undefined }),
      });
    }

    if (filters.source) {
      list.push({
        id: 'source',
        label: t('leads.source', 'Manba'),
        value: t(`leads.sources.${filters.source}`, filters.source),
        onRemove: () => onChange({ source: undefined }),
      });
    }

    if (filters.category) {
      list.push({
        id: 'category',
        label: t('vehicles.category', 'Toifa'),
        value: filters.category,
        onRemove: () => onChange({ category: undefined }),
      });
    }

    if (filters.assigned_to_me) {
      list.push({
        id: 'assigned_to_me',
        label: t('leads.assignee', 'Biriktirilgan'),
        value: t('leads.assign_to_me', 'Menga biriktirilgan'),
        onRemove: () => onChange({ assigned_to_me: undefined }),
      });
    }

    if (filters.overdue_only) {
      list.push({
        id: 'overdue_only',
        label: t('leads.status', 'Holat'),
        value: t('leads.overdue', 'Kechikkan vazifalar'),
        onRemove: () => onChange({ overdue_only: undefined }),
      });
    }

    return list;
  }, [filters, branches, stages, t, onChange]);

  const {
    chips,
    activeCount,
    isMobileOpen,
    openMobile,
    closeMobile,
    clearAll,
  } = useFilterBarState({
    filters: chipItems,
    onClearAll,
  });

  const handleExport = async () => {
    try {
      await leadsApi.exportLeads(filters);
    } catch {
      // handled
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Desktop Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search input with / hotkey */}
          <div className="w-full sm:w-64">
            <SearchWithHotkey
              value={filters.q || ''}
              onChange={(val) => onChange({ q: val || undefined })}
              placeholder={t('leads.search_placeholder', 'Ism yoki telefon...')}
            />
          </div>

          {/* Branch filter (if multi-branch user) */}
          {canViewAllBranches && branches.length > 0 && (
            <div className="hidden lg:block w-44">
              <Select
                value={filters.branch_id || 'ALL'}
                onValueChange={(val) =>
                  onChange({ branch_id: val === 'ALL' ? undefined : val })
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue
                    placeholder={t('common.all_branches', 'Barcha filiallar')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t('common.all_branches', 'Barcha filiallar')}
                  </SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stage filter */}
          <div className="hidden md:block w-40">
            <Select
              value={filters.stage_id || 'ALL'}
              onValueChange={(val) =>
                onChange({ stage_id: val === 'ALL' ? undefined : val })
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue
                  placeholder={t('leads.all_stages', 'Barcha bosqichlar')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t('leads.all_stages', 'Barcha bosqichlar')}
                </SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span>{s.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source filter */}
          <div className="hidden xl:block w-36">
            <Select
              value={filters.source || 'ALL'}
              onValueChange={(val) =>
                onChange({
                  source: val === 'ALL' ? undefined : (val as LeadSource),
                })
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue
                  placeholder={t('leads.all_sources', 'Barcha manbalar')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t('leads.all_sources', 'Barcha manbalar')}
                </SelectItem>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`leads.sources.${s}`, s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category filter */}
          <div className="hidden xl:block w-28">
            <Select
              value={filters.category || 'ALL'}
              onValueChange={(val) =>
                onChange({
                  category: val === 'ALL' ? undefined : (val as Category),
                })
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder={t('vehicles.category', 'Toifa')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t('common.all_categories', 'Barchasi')}
                </SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick toggle: Assigned to me */}
          <Button
            type="button"
            variant={filters.assigned_to_me ? 'secondary' : 'outline'}
            size="sm"
            onClick={() =>
              onChange({
                assigned_to_me: filters.assigned_to_me ? undefined : true,
              })
            }
            className="hidden sm:inline-flex h-9 text-xs"
          >
            {t('leads.assigned_to_me', 'Menga biriktirilgan')}
          </Button>

          {/* Quick toggle: Overdue tasks */}
          <Button
            type="button"
            variant={filters.overdue_only ? 'destructive' : 'outline'}
            size="sm"
            onClick={() =>
              onChange({
                overdue_only: filters.overdue_only ? undefined : true,
              })
            }
            className="hidden sm:inline-flex h-9 text-xs"
          >
            {t('leads.overdue_tasks', 'Kechikkanlar')}
          </Button>

          {/* Mobile Filter Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openMobile}
            className="sm:hidden h-9 gap-1.5"
            aria-label={t('common.filter', 'Filterlar')}
          >
            <Funnel className="h-4 w-4" />
            <span>{t('common.filter', 'Filter')}</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] text-primary-foreground font-bold">
                {activeCount}
              </span>
            )}
          </Button>
        </div>

        {/* Right side: CSV Export button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 gap-1.5"
            aria-label={t('leads.export_csv', 'Eksport (CSV)')}
          >
            <DownloadSimple className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t('leads.export_csv', 'CSV')}
            </span>
          </Button>
        </div>
      </div>

      {/* Active Filter Chips */}
      <ActiveFilterChips chips={chips} onClearAll={clearAll} />

      {/* Mobile Filter Drawer / Sheet */}
      <MobileFilterSheet
        open={isMobileOpen}
        onOpenChange={(open) => (open ? openMobile() : closeMobile())}
        activeCount={activeCount}
        onClearAll={clearAll}
        title={t('common.filter', 'Filterlar')}
      >
        <div className="space-y-4 py-2">
          {/* Branch filter in mobile */}
          {canViewAllBranches && branches.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {t('common.branch', 'Filial')}
              </label>
              <Select
                value={filters.branch_id || 'ALL'}
                onValueChange={(val) =>
                  onChange({ branch_id: val === 'ALL' ? undefined : val })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t('common.all_branches', 'Barcha filiallar')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t('common.all_branches', 'Barcha filiallar')}
                  </SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stage filter in mobile */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {t('leads.stage', 'Bosqich')}
            </label>
            <Select
              value={filters.stage_id || 'ALL'}
              onValueChange={(val) =>
                onChange({ stage_id: val === 'ALL' ? undefined : val })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t('leads.all_stages', 'Barcha bosqichlar')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t('leads.all_stages', 'Barcha bosqichlar')}
                </SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source filter in mobile */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {t('leads.source', 'Manba')}
            </label>
            <Select
              value={filters.source || 'ALL'}
              onValueChange={(val) =>
                onChange({
                  source: val === 'ALL' ? undefined : (val as LeadSource),
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t('leads.all_sources', 'Barcha manbalar')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t('leads.all_sources', 'Barcha manbalar')}
                </SelectItem>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`leads.sources.${s}`, s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category filter in mobile */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {t('vehicles.category', 'Toifa')}
            </label>
            <Select
              value={filters.category || 'ALL'}
              onValueChange={(val) =>
                onChange({
                  category: val === 'ALL' ? undefined : (val as Category),
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t('common.all_categories', 'Barchasi')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t('common.all_categories', 'Barchasi')}
                </SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick checkboxes */}
          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(filters.assigned_to_me)}
                onChange={(e) =>
                  onChange({
                    assigned_to_me: e.target.checked ? true : undefined,
                  })
                }
                className="rounded border-border"
              />
              <span>{t('leads.assigned_to_me', 'Menga biriktirilgan')}</span>
            </label>

            <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(filters.overdue_only)}
                onChange={(e) =>
                  onChange({
                    overdue_only: e.target.checked ? true : undefined,
                  })
                }
                className="rounded border-border"
              />
              <span>{t('leads.overdue_tasks', 'Kechikkan vazifalar')}</span>
            </label>
          </div>
        </div>
      </MobileFilterSheet>
    </div>
  );
};
