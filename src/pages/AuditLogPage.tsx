import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuditLogs } from '@/services/auditService';
import { useUsers } from '@/services/userService';
import { toLocalDateStr } from '@/services/studentService';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlParams } from '@/hooks/useUrlParams';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from '@phosphor-icons/react';
import { AuditFilterBar } from '@/pages/audit/AuditFilterBar';
import { AuditTable } from '@/pages/audit/AuditTable';
import { AuditMobileList } from '@/pages/audit/AuditMobileList';
import { sortAuditLogs } from '@/pages/audit/sortAuditLogs';

const AuditLogPage = () => {
  const { t } = useTranslation();

  // Filter + page state lives in the URL so reload / back / share preserves
  // it (autodrive-6cq.5.8) — same setParam/setParams pattern as StudentsPage
  // (src/hooks/useUrlParams.ts). Sort stays local (no other list page's
  // sort is URL-synced either).
  const { searchParams, setParam, setParams } = useUrlParams();

  const search = searchParams.get('q') ?? '';
  const setSearch = (v: string) => setParam('q', v || undefined);

  const entityFilter = searchParams.get('entity') ?? 'all';
  const setEntityFilter = (v: string) =>
    setParam('entity', v === 'all' ? undefined : v);

  const actionFilter = searchParams.get('action') ?? 'all';
  const setActionFilter = (v: string) =>
    setParam('action', v === 'all' ? undefined : v);

  const rawDateFrom = searchParams.get('date_from');
  const dateFrom = useMemo(
    () => (rawDateFrom ? new Date(rawDateFrom) : undefined),
    [rawDateFrom],
  );
  const rawDateTo = searchParams.get('date_to');
  const dateTo = useMemo(
    () => (rawDateTo ? new Date(rawDateTo) : undefined),
    [rawDateTo],
  );
  // Both keys must land in the same setSearchParams call — two sequential
  // setParam calls would each snapshot `prev` independently and the second
  // overwrites the first's write (autodrive-6cq.5.70).
  const setDateRange = (from: Date | undefined, to: Date | undefined) =>
    setParams({
      date_from: from ? toLocalDateStr(from) : undefined,
      date_to: to ? toLocalDateStr(to) : undefined,
    });

  const page = Number(searchParams.get('page')) || 1;
  const setPage = (p: number) =>
    setParam('page', p > 1 ? String(p) : undefined);
  const LIMIT = 50;

  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Resolve the typed name to a real user id so filtering happens server-side
  // across ALL pages, not just the ~50 rows already loaded (autodrive-6cq.5.51).
  const debouncedSearch = useDebounce(search, 300);
  const { data: users } = useUsers();
  const searchUserId = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return undefined;
    const matches = (users || []).filter((u) =>
      u.name?.toLowerCase().includes(q),
    );
    // ponytail: exactly one match -> filter by that user's real id; 0 or 2+
    // matches -> sentinel id forces an empty result instead of silently
    // showing unrelated entries (backend only supports exact userId match).
    return matches.length === 1 ? matches[0].id : '__no_match__';
  }, [debouncedSearch, users]);

  const { data, isLoading, isError, refetch } = useAuditLogs({
    entity: entityFilter !== 'all' ? entityFilter : undefined,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    userId: searchUserId,
    startDate: dateFrom,
    endDate: dateTo,
    page,
    limit: LIMIT,
  });

  const logs = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const sorted = sortAuditLogs(logs, sortField, sortDir);

  const clearAll = () => {
    setParams({
      date_from: undefined,
      date_to: undefined,
      entity: undefined,
      action: undefined,
      q: undefined,
    });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2 text-balance">
          <ShieldCheck className="h-6 w-6" /> {t('audit.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('audit.subtitle')}</p>
      </div>

      <AuditFilterBar
        search={search}
        entityFilter={entityFilter}
        actionFilter={actionFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onEntityChange={(v) => {
          setEntityFilter(v);
          setPage(1);
        }}
        onActionChange={(v) => {
          setActionFilter(v);
          setPage(1);
        }}
        onDateRangeChange={(from, to) => {
          setDateRange(from, to);
          setPage(1);
        }}
        onClearAll={clearAll}
      />

      {/* Table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-balance">
            {t('audit.entries_list')}
          </h2>
          <span className="text-xs text-muted-foreground">
            {total} {t('audit.entry_count')}
          </span>
        </div>

        <AuditTable
          logs={sorted}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          startIndex={(page - 1) * LIMIT}
          sortField={sortField}
          sortDir={sortDir}
          onToggleSort={toggleSort}
        />

        <AuditMobileList
          logs={sorted}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
        />

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {t('common.previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default AuditLogPage;
