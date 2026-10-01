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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
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
  isBoardView?: boolean;
}

const SOURCES: LeadSource[] = [
  'telegram',
  'instagram',
  'referral',
  'directory_map',
  'olx',
  'walk_in',
  'other',
];

const CATEGORIES: Category[] = ['A', 'B', 'BC', 'C', 'D', 'E'];

export const LeadsFilterBar = ({
  filters,
  onChange,
  onClearAll,
  isBoardView = false,
}: LeadsFilterBarProps) => {
  const { t } = useTranslation();
  const canViewAllBranches = useCan('viewAllBranches');
  const { data: branches = [] } = useBranches();
  const { data: stages = [] } = useLeadStagesQuery();

  // ponytail: has_task is unsupported by the API; expose it after backend filtering exists.
  const countableFilters = [
    Boolean(filters.stage_id),
    Boolean(filters.source),
    Boolean(filters.category),
    Boolean(filters.assigned_to_me),
    Boolean(filters.overdue_only),
    Boolean(canViewAllBranches && filters.branch_id),
    Boolean(filters.course_type),
    Boolean(filters.assignee_user_id),
    Boolean(filters.period && filters.period !== 'all'),
    Boolean(!isBoardView && filters.tab && filters.tab !== 'all'),
  ];
  const localActiveCount = countableFilters.filter(Boolean).length;

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

    if (canViewAllBranches && filters.branch_id) {
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
        value: t('leads.assigned_to_me', 'Menga biriktirilgan'),
        onRemove: () => onChange({ assigned_to_me: undefined }),
      });
    }

    if (filters.overdue_only) {
      list.push({
        id: 'overdue_only',
        label: t('common.status', 'Holat'),
        value: t('leads.overdue', 'Kechikkan vazifalar'),
        onRemove: () => onChange({ overdue_only: undefined }),
      });
    }

    if (filters.course_type) {
      list.push({
        id: 'course_type',
        label: t('common.course_type', 'Kurs turi'),
        value: t(`courses.types.${filters.course_type}`, filters.course_type),
        onRemove: () => onChange({ course_type: undefined }),
      });
    }

    if (filters.assignee_user_id) {
      list.push({
        id: 'assignee_user_id',
        label: t('leads.assignee', 'Biriktirilgan xodim'),
        value: filters.assignee_user_id,
        onRemove: () => onChange({ assignee_user_id: undefined }),
      });
    }

    if (filters.period && filters.period !== 'all') {
      list.push({
        id: 'period',
        label: t('dashboard.v2.period', 'Davr'),
        value: t(`leads.period_${filters.period}`, filters.period),
        onRemove: () => onChange({ period: undefined }),
      });
    }

    // ponytail: board ignores tab; expose its chip there once the backend honors it.
    if (!isBoardView && filters.tab && filters.tab !== 'all') {
      list.push({
        id: 'tab',
        label: t('common.status', 'Holat'),
        value: t(`leads.tab_${filters.tab}`, filters.tab),
        onRemove: () => onChange({ tab: undefined }),
      });
    }

    return list;
  }, [filters, branches, stages, t, onChange, canViewAllBranches, isBoardView]);

  const { chips, isMobileOpen, setIsMobileOpen, clearAll } = useFilterBarState({
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

  const renderExport = () => (
    <Button
      type="button"
      variant="outline"
      onClick={handleExport}
      className="h-11 gap-1.5"
      aria-label={t('leads.export_csv', 'Eksport (CSV)')}
    >
      <DownloadSimple className="h-4 w-4" aria-hidden="true" />
      {t('leads.export_csv', 'CSV')}
    </Button>
  );

  const renderSearch = (className?: string) => (
    <SearchWithHotkey
      value={filters.q || ''}
      onChange={(val) => onChange({ q: val || undefined })}
      placeholder={t('leads.search_placeholder', 'Ism yoki telefon...')}
      aria-label={t('leads.search_placeholder', 'Ism yoki telefon...')}
      className={className}
      inputClassName="h-11"
    />
  );

  const renderStageFilter = (triggerClassName: string) => (
    <Select
      value={filters.stage_id || 'ALL'}
      onValueChange={(val) =>
        onChange({ stage_id: val === 'ALL' ? undefined : val })
      }
    >
      <SelectTrigger
        className={triggerClassName}
        aria-label={t('leads.stage', 'Bosqich')}
      >
        <SelectValue placeholder={t('leads.all_stages', 'Barcha bosqichlar')} />
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
  );

  const renderQuickToggle = (
    key: 'assigned_to_me' | 'overdue_only',
    label: string,
    activeVariant: 'secondary' | 'destructive',
  ) => {
    const active = Boolean(filters[key]);
    return (
      <Button
        type="button"
        variant={active ? activeVariant : 'outline'}
        aria-pressed={active}
        onClick={() => onChange({ [key]: active ? undefined : true })}
        className="min-h-11 text-xs"
      >
        {label}
      </Button>
    );
  };

  const renderAdvancedFilters = () => (
    <>
      {canViewAllBranches && branches.length > 0 && (
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            {t('common.branch', 'Filial')}
          </Label>
          <Select
            value={filters.branch_id || 'ALL'}
            onValueChange={(val) =>
              onChange({ branch_id: val === 'ALL' ? undefined : val })
            }
          >
            <SelectTrigger
              className="h-11 w-full border-border bg-secondary"
              aria-label={t('common.branch', 'Filial')}
            >
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

      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">
          {t('leads.source', 'Manba')}
        </Label>
        <Select
          value={filters.source || 'ALL'}
          onValueChange={(val) =>
            onChange({
              source: val === 'ALL' ? undefined : (val as LeadSource),
            })
          }
        >
          <SelectTrigger
            className="h-11 w-full border-border bg-secondary"
            aria-label={t('leads.source', 'Manba')}
          >
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

      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">
          {t('vehicles.category', 'Toifa')}
        </Label>
        <Select
          value={filters.category || 'ALL'}
          onValueChange={(val) =>
            onChange({
              category: val === 'ALL' ? undefined : (val as Category),
            })
          }
        >
          <SelectTrigger
            className="h-11 w-full border-border bg-secondary"
            aria-label={t('vehicles.category', 'Toifa')}
          >
            <SelectValue placeholder={t('common.all_categories', 'Barchasi')} />
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
    </>
  );

  return (
    <div className="space-y-2">
      <div className="flex w-full flex-col gap-2 md:hidden">
        <div className="flex w-full items-center gap-2">
          {renderSearch()}
          <MobileFilterSheet
            open={isMobileOpen}
            onOpenChange={setIsMobileOpen}
            activeCount={localActiveCount}
            onClearAll={clearAll}
            applyLabel={t('common.close')}
            title={t('filters.title', { defaultValue: 'Filters' })}
          >
            <div className="flex flex-col gap-4">{renderAdvancedFilters()}</div>
          </MobileFilterSheet>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {renderStageFilter('h-11 w-full border-border bg-secondary')}
          {renderExport()}
          {renderQuickToggle(
            'assigned_to_me',
            t('leads.assigned_to_me', 'Menga biriktirilgan'),
            'secondary',
          )}
          {renderQuickToggle(
            'overdue_only',
            t('leads.overdue_tasks', 'Kechikkanlar'),
            'destructive',
          )}
        </div>
      </div>

      <div className="hidden flex-wrap items-center justify-between gap-2 md:flex">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {renderSearch('max-w-sm')}
          <div className="w-44">
            {renderStageFilter('h-11 w-full border-border bg-secondary')}
          </div>
          {renderQuickToggle(
            'assigned_to_me',
            t('leads.assigned_to_me', 'Menga biriktirilgan'),
            'secondary',
          )}
          {renderQuickToggle(
            'overdue_only',
            t('leads.overdue_tasks', 'Kechikkanlar'),
            'destructive',
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="relative h-11 border-border bg-secondary"
              >
                <Funnel className="h-4 w-4" aria-hidden="true" />
                {t('filters.title', { defaultValue: 'Filters' })}
                {localActiveCount > 0 ? (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                    {localActiveCount}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              collisionPadding={16}
              className="max-h-[min(75vh,var(--radix-popover-content-available-height))] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto p-4"
            >
              <div className="space-y-4">{renderAdvancedFilters()}</div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2">{renderExport()}</div>
      </div>

      <ActiveFilterChips chips={chips} onClearAll={clearAll} />
    </div>
  );
};
