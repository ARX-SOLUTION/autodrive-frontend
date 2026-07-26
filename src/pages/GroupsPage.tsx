import { useEffect, useMemo, useRef, useState } from 'react';
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
import PaginationControls from '@/components/ui/PaginationControls';
import { useCan, useIsCrossTenant } from '@/hooks/useCan';
import { EmptyState } from '@/components/ui/EmptyState';
import GroupsOverviewSection from './groups/GroupsOverviewSection';
import GroupsFilterBar from './groups/GroupsFilterBar';
import GroupsTable from './groups/GroupsTable';
import GroupsMobileList from './groups/GroupsMobileList';
import GroupFormDialog from './groups/GroupFormDialog';
import { groupDeleteDescArgs } from './groups/groupDeleteDescArgs';
import { PageHeader } from '@/components/layout/PageHeader';

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
  const setSearch = (v: string) => setParam('q', v || undefined);
  const debouncedSearch = useDebounce(search, 300);

  const courseTypeFilter = searchParams.get('course_type') ?? 'all';
  const setCourseTypeFilter = (v: string) =>
    setParam('course_type', v === 'all' ? undefined : v);

  // Branch filter — owner/dev only (mirrors StudentsPage's cross-tenant
  // branch picker); manager/operator/teacher stay pinned to their own
  // branch, same as before this change (autodrive-b85.5).
  const defaultBranchId = isCrossTenant
    ? undefined
    : user?.branch_id || undefined;
  const branchId = searchParams.get('branch_id') ?? defaultBranchId;
  const setBranchId = (v: string | undefined) => setParam('branch_id', v);

  const sortField = searchParams.get('sort_by') ?? 'name';
  const sortDir = (searchParams.get('sort_dir') as 'asc' | 'desc') ?? 'asc';
  const setSort = (field: string, dir: 'asc' | 'desc') =>
    setParams({
      sort_by: field === 'name' ? undefined : field,
      sort_dir: dir === 'asc' ? undefined : dir,
    });

  const currentPage = Number(searchParams.get('page')) || 1;
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

  const toggleSort = (field: string) => {
    if (sortField === field) setSort(field, sortDir === 'asc' ? 'desc' : 'asc');
    else setSort(field, 'asc');
  };

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const va = a[sortField as keyof typeof a];
    const vb = b[sortField as keyof typeof b];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string' && typeof vb === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortDir === 'asc'
      ? va < vb
        ? -1
        : va > vb
          ? 1
          : 0
      : va > vb
        ? -1
        : va < vb
          ? 1
          : 0;
  });

  const GROUPS_PER_PAGE = 10;
  const totalPages = Math.max(
    1,
    Math.ceil(sortedGroups.length / GROUPS_PER_PAGE),
  );

  // Reset to page 1 when a filter/sort actually changes — skip the first
  // render so a deep link with ?page=N isn't stomped on load.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, courseTypeFilter, branchId, sortField, sortDir, includeDeleted]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const filtered = useMemo(
    () =>
      sortedGroups.slice(
        (currentPage - 1) * GROUPS_PER_PAGE,
        currentPage * GROUPS_PER_PAGE,
      ),
    [sortedGroups, currentPage],
  );

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

  const startIndex = (currentPage - 1) * 10;
  const groupsTitle = t('groups.title');

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

      <GroupsOverviewSection overview={overview} />

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
        setIncludeDeleted={setIncludeDeleted}
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
            groups={filtered}
            isLoading={isLoading}
            startIndex={startIndex}
            sortField={sortField}
            sortDir={sortDir}
            onToggleSort={toggleSort}
            getBranchName={getBranchName}
            onNavigate={goToGroup}
            onEdit={openEdit}
            onDelete={setDeleteId}
            canManageGroups={canManageGroups}
            canViewDeleted={canViewDeleted}
            onRestore={setRestoreId}
          />
          <GroupsMobileList
            groups={filtered}
            isLoading={isLoading}
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

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

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
