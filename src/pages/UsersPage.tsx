import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useUsersPage, useCreateManager } from '@/services/userService';
import { useBranches } from '@/services/branchService';
import { RoleGate } from '@/components/RoleGate';
import { useIsCrossTenant } from '@/hooks/useCan';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlParams } from '@/hooks/useUrlParams';
import { extractErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import PersonModal, {
  type PersonFormPayload,
} from '@/components/ui/PersonModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  UserCog,
  Plus,
  Search,
  Loader2,
} from 'lucide-react';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

const formatDate = (d?: string) => {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd.MM.yyyy');
  } catch {
    return d;
  }
};

// Backend GetUsersQueryDto caps limit at 100 -- large enough that a single
// branch/company's manager list never needs a second server page in
// practice, while still being real pagination (not a silent truncation)
// if it ever does.
const SERVER_PAGE_SIZE = 100;

const UsersPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isCrossTenant = useIsCrossTenant();

  // Filter state lives in the URL (autodrive-b85.2), same pattern as
  // StudentsPage's searchParams/setParam.
  const { searchParams, setParam } = useUrlParams();
  const search = searchParams.get('q') ?? '';
  const setSearch = (v: string) => setParam('q', v || undefined);
  const branchId = searchParams.get('branch_id') ?? undefined;
  const setBranchId = (v: string | undefined) => setParam('branch_id', v);
  const isActiveParam = searchParams.get('is_active') ?? undefined;
  const isActive =
    isActiveParam === 'true'
      ? true
      : isActiveParam === 'false'
        ? false
        : undefined;
  const setIsActive = (v: string) =>
    setParam('is_active', v === 'all' ? undefined : v);

  const debouncedSearch = useDebounce(search, 300);

  // Page in the URL too (like every other filter here) so refresh/share
  // preserves it instead of silently resetting to page 1.
  const currentPage = Number(searchParams.get('page')) || 1;
  const setCurrentPage = (p: number) =>
    setParam('page', p > 1 ? String(p) : undefined);
  // setCurrentPage is a fresh closure each render (derived from setParam,
  // which useUrlParams doesn't memoize) -- adding it here would fire this
  // effect on every render instead of only on an actual filter change.
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, branchId, isActive]);

  const {
    data: usersPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useUsersPage('manager', currentPage, SERVER_PAGE_SIZE, {
    search: debouncedSearch,
    branchId,
    isActive,
  });
  const users = useMemo(() => usersPage?.data ?? [], [usersPage]);
  const totalPages = Math.max(1, usersPage?.meta.totalPages ?? 1);
  const { data: branches } = useBranches();
  const createMut = useCreateManager();
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);

  const openCreate = () => setModalOpen(true);

  const handleCreate = (data: PersonFormPayload) => {
    createMut.mutate(
      {
        fullName: data.fullName,
        email: data.email!,
        password: data.password!,
        phone: data.phone,
        branchId: data.branchId!,
      },
      {
        onSuccess: () => {
          toast.success(t('users.added'));
          setModalOpen(false);
        },
        onError: (err) => toast.error(extractErrorMessage(err)),
      },
    );
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Sorts only the current server page -- GET /users has no sortBy param,
  // so a global sort across pages isn't available without a backend change.
  // Fine in practice: SERVER_PAGE_SIZE (100) covers virtually every
  // company's manager list in one page.
  const paginatedItems = useMemo(() => {
    return [...users].sort((a, b) => {
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
  }, [users, sortField, sortDir]);

  const startIndex = (currentPage - 1) * SERVER_PAGE_SIZE;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            {t('users.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('users.count', { count: usersPage?.meta.total ?? users.length })}
          </p>
        </div>
        <RoleGate cap="manageStaff">
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t('users.add')}
          </Button>
        </RoleGate>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isCrossTenant && (
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => setBranchId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder={t('common.branch')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {(branches || []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={isActiveParam ?? 'all'} onValueChange={setIsActive}>
          <SelectTrigger className="w-36 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="true">{t('common.active')}</SelectItem>
            <SelectItem value="false">{t('common.inactive')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('users.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
      </div>

      <div className="relative">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <div
          className={cn(
            'hidden md:block glass-card overflow-hidden transition-opacity duration-200',
            isFetching && !isLoading && 'opacity-50',
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('email')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Email
                      {sortField === 'email' ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('phone')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {t('users.detail.phone')}
                      {sortField === 'phone' ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('branch_name')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {t('users.detail.branch')}
                      {sortField === 'branch_name' ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {t('common.status')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort('created_at')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {t('users.detail.created')}
                      {sortField === 'created_at' ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? [...Array(3)].map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td colSpan={6} className="p-4">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      </tr>
                    ))
                  : paginatedItems.map((u, idx) => (
                      <tr
                        key={u.id}
                        className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => {
                          if (window.getSelection()?.toString()) return;
                          navigate(`/users/${u.id}`);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') navigate(`/users/${u.id}`);
                          if (e.key === ' ') {
                            e.preventDefault();
                            navigate(`/users/${u.id}`);
                          }
                        }}
                      >
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {startIndex + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium">{u.email}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {u.phone || t('common.na')}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {u.branch_name || t('common.na')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
                          >
                            {u.is_active
                              ? t('common.active')
                              : t('common.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {formatDate(u.created_at)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {isError ? (
              <EmptyState
                title={t('common.error')}
                action={{ label: t('common.retry'), onClick: () => refetch() }}
              />
            ) : (
              users.length === 0 &&
              !isLoading && (
                <EmptyState icon={UserCog} title={t('users.not_found')} />
              )
            )}
          </div>
        </div>

        <div className="md:hidden grid gap-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))
          ) : isError ? (
            <EmptyState
              title={t('common.error')}
              action={{ label: t('common.retry'), onClick: () => refetch() }}
            />
          ) : paginatedItems.length === 0 ? (
            <EmptyState icon={UserCog} title={t('users.not_found')} />
          ) : (
            paginatedItems.map((u) => (
              <DataCard
                key={u.id}
                title={u.name || u.email}
                subtitle={u.email}
                onClick={() => navigate(`/users/${u.id}`)}
                fields={[
                  {
                    label: t('users.detail.branch'),
                    value: u.branch_name ?? t('common.na'),
                  },
                  {
                    label: t('users.detail.phone'),
                    value: u.phone ?? t('common.na'),
                  },
                  {
                    label: t('users.detail.created'),
                    value: formatDate(u.created_at),
                  },
                ]}
              />
            ))
          )}
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <PersonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        loading={createMut.isPending}
        role="manager"
        title={t('users.add_title')}
        description={t('users.add_desc')}
      />
    </div>
  );
};

export default UsersPage;
