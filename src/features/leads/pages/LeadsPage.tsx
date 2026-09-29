import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import {
  FunnelSimple,
  Plus,
  SquaresFour,
  Table as TableIcon,
  ChartBar,
  Gear,
} from '@phosphor-icons/react';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useAuthStore } from '@/store/authStore';
import {
  useLeadBoardQuery,
  useLeadStagesQuery,
  useLeadsQuery,
} from '../queries/leadsQueries';
import { LeadBoard } from '../components/LeadBoard';
import { LeadsTable } from '../components/LeadsTable';
import { LeadsFilterBar } from '../components/LeadsFilterBar';
import { LeadMetricsView } from '../components/LeadMetricsView';
import { CreateLeadDialog } from '../components/CreateLeadDialog';
import { LeadStagesSettingsDialog } from '../components/LeadStagesSettingsDialog';
import type {
  ListLeadsQuery,
  LeadSource,
  CourseType,
  Category,
} from '../types/leads.types';

export type LeadsViewMode = 'board' | 'list' | 'metrics';

export const LeadsPage = () => {
  const { t } = useTranslation();
  const { searchParams, setParams, setSearchParams } = useUrlParams();

  // Current view mode from URL (default: 'board')
  const viewMode = (searchParams.get('view') as LeadsViewMode) || 'board';
  const setViewMode = (mode: LeadsViewMode) => {
    setParams({ view: mode === 'board' ? undefined : mode });
  };

  // Create lead dialog state synced with ?action=create
  const [isCreateOpen, setIsCreateOpen] = useState(
    searchParams.get('action') === 'create',
  );
  const [createDefaultStageId, setCreateDefaultStageId] = useState<
    string | undefined
  >(undefined);

  // Stage settings dialog state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const canManageStages =
    user?.role === 'owner' || user?.role === 'manager' || user?.role === 'dev';

  const handleOpenCreate = (stageId?: string) => {
    setCreateDefaultStageId(stageId);
    setIsCreateOpen(true);
  };

  const handleCloseCreate = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open && searchParams.get('action') === 'create') {
      setParams({ action: undefined });
    }
  };

  // Parse filters from URL search params
  const currentFilters: ListLeadsQuery = useMemo(
    () => ({
      q: searchParams.get('q') || undefined,
      branch_id: searchParams.get('branch_id') || undefined,
      stage_id: searchParams.get('stage_id') || undefined,
      source: (searchParams.get('source') as LeadSource) || undefined,
      course_type: (searchParams.get('course_type') as CourseType) || undefined,
      category: (searchParams.get('category') as Category) || undefined,
      assigned_to_me:
        searchParams.get('assigned_to_me') === 'true' ? true : undefined,
      assignee_user_id: searchParams.get('assignee_user_id') || undefined,
      overdue_only:
        searchParams.get('overdue_only') === 'true' ? true : undefined,
      has_task: searchParams.get('has_task') === 'true' ? true : undefined,
      period:
        (searchParams.get('period') as '7d' | '30d' | '60d' | 'all') ||
        undefined,
      tab:
        (searchParams.get('tab') as
          'new' | 'in_progress' | 'won' | 'lost' | 'all') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
    }),
    [searchParams],
  );

  const handleFilterChange = (next: Partial<ListLeadsQuery>) => {
    const updates: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === null || value === '') {
        updates[key] = undefined;
      } else if (typeof value === 'boolean') {
        updates[key] = value ? 'true' : undefined;
      } else {
        updates[key] = String(value);
      }
    }
    // Reset to page 1 on filter changes
    updates.page = '1';
    setParams(updates);
  };

  const handleClearAll = () => {
    const currentView = searchParams.get('view');
    setSearchParams(currentView ? { view: currentView } : {});
  };

  // Queries for Board and List
  const { isLoading: stagesLoading } = useLeadStagesQuery();
  const { data: board = [], isLoading: boardLoading } = useLeadBoardQuery(
    currentFilters,
    { enabled: viewMode === 'board' },
  );
  const {
    data: listData,
    isLoading: listLoading,
    isFetching: listFetching,
    isError: listError,
    refetch: refetchList,
  } = useLeadsQuery(currentFilters, { enabled: viewMode === 'list' });

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <PageHeader
        title={t('leads.title', 'Leads & CRM Funnel')}
        description={t(
          'leads.subtitle',
          'Manage potential students, track funnel stages, and schedule follow-ups',
        )}
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border bg-muted p-1">
              <Button
                variant={viewMode === 'board' ? 'default' : 'ghost'}
                size="sm"
                aria-label={t('leads.board_view', 'Board')}
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setViewMode('board')}
              >
                <SquaresFour className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t('leads.board_view', 'Board')}
                </span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                aria-label={t('leads.list_view', 'Table')}
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setViewMode('list')}
              >
                <TableIcon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t('leads.list_view', 'Table')}
                </span>
              </Button>
              <Button
                variant={viewMode === 'metrics' ? 'default' : 'ghost'}
                size="sm"
                aria-label={t('leads.metrics_view', 'Analytics')}
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setViewMode('metrics')}
              >
                <ChartBar className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t('leads.metrics_view', 'Analytics')}
                </span>
              </Button>
            </div>

            {canManageStages && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                aria-label={t('leads.manage_stages', 'Configure Stages')}
                onClick={() => setIsSettingsOpen(true)}
              >
                <Gear className="h-4 w-4" />
                <span className="hidden md:inline">
                  {t('leads.manage_stages', 'Configure Stages')}
                </span>
              </Button>
            )}

            <Button
              className="h-9 gap-1.5"
              aria-label={t('leads.create_lead', 'New Lead')}
              onClick={() => handleOpenCreate()}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t('leads.create_lead', 'New Lead')}
              </span>
            </Button>
          </div>
        }
      />

      {/* Filter Bar (Board & Table views) */}
      {viewMode !== 'metrics' && (
        <LeadsFilterBar
          filters={currentFilters}
          onChange={handleFilterChange}
          onClearAll={handleClearAll}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' && (
          <div className="h-full">
            {stagesLoading || boardLoading ? (
              <div className="flex h-64 w-full items-center justify-center text-muted-foreground">
                <FunnelSimple className="mr-2 h-5 w-5 animate-pulse" />
                <span>{t('common.loading', 'Yuklanmoqda...')}</span>
              </div>
            ) : board.length === 0 ? (
              <div className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
                <FunnelSimple className="h-8 w-8 text-muted-foreground/60" />
                <p>{t('leads.no_leads', 'Hozircha lidlar mavjud emas')}</p>
              </div>
            ) : (
              <LeadBoard
                columns={board}
                onAddLeadClick={handleOpenCreate}
                className="h-full"
              />
            )}
          </div>
        )}

        {viewMode === 'list' && (
          <LeadsTable
            leads={listData?.items || []}
            isLoading={listLoading}
            isFetching={listFetching}
            isError={listError}
            onRetry={() => void refetchList()}
            currentPage={currentFilters.page || 1}
            pageSize={Number(currentFilters.limit) || 20}
            totalLeads={listData?.total || 0}
            totalPages={Math.ceil(
              (listData?.total || 0) / (Number(currentFilters.limit) || 20),
            )}
            onPageChange={(p) => setParams({ page: String(p) })}
            onPageSizeChange={(s) => setParams({ limit: String(s), page: '1' })}
          />
        )}

        {viewMode === 'metrics' && (
          <div className="overflow-y-auto pb-6">
            <LeadMetricsView
              branchId={currentFilters.branch_id}
              period={currentFilters.period}
            />
          </div>
        )}
      </div>

      {/* Create Lead Modal */}
      <CreateLeadDialog
        open={isCreateOpen}
        onOpenChange={handleCloseCreate}
        defaultStageId={createDefaultStageId}
      />

      {/* Configure Stages Dialog */}
      <LeadStagesSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
};

export default LeadsPage;
