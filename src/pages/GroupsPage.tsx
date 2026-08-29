import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/authStore';
import {
  useGroups,
  useGroupsOverview,
  useDeleteGroup,
  useRestoreGroup,
} from '@/services/groupService';
import { useBranches } from '@/services/branchService';
import { Group } from '@/types/group';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Plus, Stack, CircleNotch } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { mutationErrorToast } from '@/lib/mutationErrorToast';
import { cn } from '@/lib/utils';
import { useCan, useIsCrossTenant } from '@/hooks/useCan';
import { EmptyState } from '@/components/ui/EmptyState';
import GroupsBranchNav from './groups/GroupsBranchNav';
import GroupsFilterBar from './groups/GroupsFilterBar';
import GroupsTable from './groups/GroupsTable';
import GroupFormDialog from './groups/GroupFormDialog';
import { groupDeleteDescArgs } from './groups/groupDeleteDescArgs';
import { PageHeader } from '@/components/layout/PageHeader';
import { parseDataGridSearch } from '@/shared/lib/dataGridSearch';

const GROUPS_GRID_SEARCH = {
  sortKeys: ['name', 'course_type'] as const,
  defaultSort: { key: 'name' as const, direction: 'asc' as const },
};

const GroupsPage = () => {
  const { t } = useTranslation();
  const goToGroup = useViewTransitionNavigate();
  const isCrossTenant = useIsCrossTenant();
  const user = useAuthStore((s) => s.user);

  // Filters/sort/page live in the URL so reload / back / share preserves
  // them (autodrive-6cq.5.8) — same setParam/setParams pattern as
  // StudentsPage (src/hooks/useUrlParams.ts).
  const { searchParams, setParam, setParams } = useUrlParams();

  const search = searchParams.get('q') ?? '';
  const setSearch = (v: string) =>
    setParams({ q: v || undefined, page: undefined });
  const debouncedSearch = useDebounce(search, 300);

  const courseTypeFilter = searchParams.get('course_type') ?? 'all';
  const setCourseTypeFilter = (v: string) =>
    setParams({
      course_type: v === 'all' ? undefined : v,
      page: undefined,
    });

  // Branch filter — owner/dev only (mirrors StudentsPage's cross-tenant
  // branch picker); manager/operator/teacher stay pinned to their own
  // branch, same as before this change (autodrive-b85.5).
  const defaultBranchId = isCrossTenant
    ? undefined
    : user?.branch_id || undefined;
  const branchId = searchParams.get('branch_id') ?? defaultBranchId;
  const setBranchId = (v: string | undefined) =>
    setParams({ branch_id: v, page: undefined });

  const gridSearch = parseDataGridSearch(searchParams, GROUPS_GRID_SEARCH);
  const sortField = gridSearch.sort.key;
  const sortDir = gridSearch.sort.direction;
  const setSort = (
    field: (typeof GROUPS_GRID_SEARCH.sortKeys)[number],
    dir: 'asc' | 'desc',
  ) =>
    setParams({
      sort_by: field === 'name' ? undefined : field,
      sort_dir: dir === 'asc' ? undefined : dir,
      page: undefined,
    });

  const currentPage = gridSearch.page;
  const setCurrentPage = (p: number) =>
    setParam('page', p > 1 ? String(p) : undefined);

  const canViewDeleted = useCan('viewDeleted');
  // autodrive-cg9: owner-only "show deleted" toggle -- local state (not
  // URL), defaults off.
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // search/course_type/branch now filtered server-side (autodrive-b85.5) --
  // GET /groups gained these params, so we stop refetching-then-filtering.
  const {
    data: groups,
    isLoading,
    isFetching,
    isError: isGroupsError,
    refetch: refetchGroups,
  } = useGroups({
    search: debouncedSearch,
    branchId,
    courseType: courseTypeFilter === 'all' ? undefined : courseTypeFilter,
    // Defensive even though the toggle only renders for an owner: never let
    // a stray true reach the request for anyone else (403 on the wire).
    includeDeleted: canViewDeleted && includeDeleted,
  });
  const { data: overview } = useGroupsOverview();
  const { data: branches } = useBranches();
  const deleteMutation = useDeleteGroup();
  const restoreMutation = useRestoreGroup();
  const canManageGroups = useCan('manageGroups');

  const [modalOpen, setModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const branchList = branches || [];

  // Server already applied search/course_type/branch filters above.
  const filteredGroups = groups || [];

  const GROUPS_PER_PAGE = 10;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / GROUPS_PER_PAGE),
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const openCreate = () => {
    setEditGroup(null);
    setModalOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditGroup(g);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t('groups.deleted'));
        setDeleteId(null);
      },
      onError: (err) =>
        mutationErrorToast(err, t, () => deleteMutation.mutate(deleteId)),
    });
  };

  const handleRestore = () => {
    if (!restoreId) return;
    restoreMutation.mutate(restoreId, {
      onSuccess: () => {
        toast.success(t('groups.restored'));
        setRestoreId(null);
      },
      onError: (err) =>
        mutationErrorToast(err, t, () => restoreMutation.mutate(restoreId)),
    });
  };

  const getBranchName = (branchId: string) =>
    branchList.find((b) => b.id === branchId)?.name || branchId;

  // autodrive-cg9: enrolled-student count already lives on the group object
  // that populated the row the user clicked delete on -- no extra fetch.
  const deleteDescArgs = groupDeleteDescArgs(
    groups?.find((g) => g.id === deleteId),
  );

  const groupsTitle = t('groups.title');
  // Sidebar only when multi-branch; otherwise keep the filter Select.
  const showBranchNav = isCrossTenant && (overview?.length ?? 0) > 1;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={groupsTitle}
        title={groupsTitle}
        description={t('groups.count', { count: (groups || []).length })}
        icon={<Stack className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t('groups.add')}
          </Button>
        }
      />

      <div
        className={cn(
          'gap-4',
          showBranchNav &&
            'lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]',
        )}
      >
        {showBranchNav && (
          <GroupsBranchNav
            overview={overview}
            selectedBranchId={branchId}
            onSelectBranch={setBranchId}
            className="sticky top-4 hidden self-start lg:flex"
          />
        )}

        <div className="min-w-0 space-y-4">
          <GroupsFilterBar
            search={search}
            onSearchChange={setSearch}
            courseTypeFilter={courseTypeFilter}
            onCourseTypeChange={setCourseTypeFilter}
            isCrossTenant={isCrossTenant}
            branchId={branchId}
            onBranchChange={setBranchId}
            branches={branchList}
            canViewDeleted={canViewDeleted}
            includeDeleted={includeDeleted}
            setIncludeDeleted={(value) => {
              setIncludeDeleted(value);
              setCurrentPage(1);
            }}
            hideBranchSelectOnDesktop={showBranchNav}
          />

          <div className="relative">
            {isFetching && !isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
                <CircleNotch className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <div
              className={cn(
                'glass-card overflow-hidden transition-opacity duration-200',
                isFetching && !isLoading && 'opacity-50',
              )}
            >
              <GroupsTable
                groups={filteredGroups}
                isLoading={isLoading}
                isFetching={isFetching}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                sortField={sortField}
                sortDir={sortDir}
                onSortChange={setSort}
                getBranchName={getBranchName}
                onNavigate={goToGroup}
                onEdit={openEdit}
                onDelete={setDeleteId}
                canManageGroups={canManageGroups}
                canViewDeleted={canViewDeleted}
                onRestore={setRestoreId}
              />
              {isGroupsError ? (
                <EmptyState
                  title={t('common.error')}
                  action={{
                    label: t('common.retry'),
                    onClick: () => refetchGroups(),
                  }}
                />
              ) : (
                filteredGroups.length === 0 &&
                !isLoading && (
                  <EmptyState icon={Stack} title={t('groups.not_found')} />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <GroupFormDialog
        open={modalOpen}
        editGroup={editGroup}
        branches={branchList}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        description={
          deleteDescArgs
            ? t(deleteDescArgs.key, deleteDescArgs.options)
            : undefined
        }
      />

      {/* autodrive-cg9: restore only un-deletes this row -- honesty
          requirement, see common.confirm_restore_desc. */}
      <ConfirmDialog
        open={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={handleRestore}
        loading={restoreMutation.isPending}
        title={t('common.confirm_restore_title')}
        description={t('common.confirm_restore_desc')}
        confirmLabel={
          restoreMutation.isPending
            ? t('common.restoring')
            : t('common.restore')
        }
      />
    </div>
  );
};

export default GroupsPage;
