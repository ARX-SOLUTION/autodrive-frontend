import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useAuditLogs } from '@/services/auditService';
import {
  formatAuditDate,
  formatAuditAction,
  auditActionColor,
  formatAuditEntity,
  formatAuditRole,
} from '@/lib/auditFormat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  CalendarIcon,
  X,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const weekAgo = () => {
  const d = today();
  d.setDate(d.getDate() - 6);
  return d;
};
const monthStart = () => {
  const d = today();
  d.setDate(1);
  return d;
};
const lastMonthStart = () => {
  const d = today();
  d.setMonth(d.getMonth() - 1, 1);
  return d;
};
const lastMonthEnd = () => {
  const d = today();
  d.setDate(0);
  return d;
};

const AuditLogPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
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

  const { data, isLoading, isError, refetch } = useAuditLogs({
    entity: entityFilter !== 'all' ? entityFilter : undefined,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    startDate: dateFrom,
    endDate: dateTo,
    page,
    limit: LIMIT,
  });

  const logs = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const filtered = logs.filter((l) => {
    const name = l.user_name?.toLowerCase() || '';
    return !search || name.includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    let va: unknown, vb: unknown;
    if (sortField === 'userName') {
      va = a.user_name || '';
      vb = b.user_name || '';
    } else if (sortField === 'createdAt') {
      va = a.created_at;
      vb = b.created_at;
    } else {
      va = (a as unknown as Record<string, unknown>)[sortField];
      vb = (b as unknown as Record<string, unknown>)[sortField];
    }
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

  const hasAnyFilter =
    !!dateFrom ||
    !!dateTo ||
    entityFilter !== 'all' ||
    actionFilter !== 'all' ||
    !!search;

  const setPreset = (
    preset: 'today' | 'week' | 'month' | 'lastMonth' | 'all',
  ) => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    switch (preset) {
      case 'today':
        setDateFrom(today());
        setDateTo(now);
        break;
      case 'week':
        setDateFrom(weekAgo());
        setDateTo(now);
        break;
      case 'month':
        setDateFrom(monthStart());
        setDateTo(now);
        break;
      case 'lastMonth':
        setDateFrom(lastMonthStart());
        setDateTo(lastMonthEnd());
        break;
      case 'all':
        setDateFrom(undefined);
        setDateTo(undefined);
        break;
    }
    setPage(1);
  };

  const clearAll = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setEntityFilter('all');
    setActionFilter('all');
    setSearch('');
    setPage(1);
  };

  const SortTh = ({
    field,
    label,
    align = 'left',
  }: {
    field: string;
    label: string;
    align?: string;
  }) => (
    <th className={`px-4 py-3 text-${align} font-medium text-muted-foreground`}>
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {sortField === field ? (
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
  );

  const presetLabels: Record<string, string> = {
    today: t('common.today'),
    week: t('common.week'),
    month: t('common.this_month'),
    lastMonth: t('common.last_month'),
    all: t('common.all_time'),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2 text-balance">
          <ShieldCheck className="h-6 w-6" /> {t('audit.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('audit.subtitle')}</p>
      </div>

      {/* Filters */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-balance">
            {t('payments.filter_title')}
          </h2>
          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-7 gap-1 text-xs"
            >
              <X className="h-3 w-3" /> {t('payments.clear_all')}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {(['today', 'week', 'month', 'lastMonth', 'all'] as const).map(
            (p) => (
              <Button
                key={p}
                variant="outline"
                size="sm"
                onClick={() => setPreset(p)}
              >
                {presetLabels[p]}
              </Button>
            ),
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={entityFilter}
            onValueChange={(v) => {
              setEntityFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="student">
                {t('audit.entity_student')}
              </SelectItem>
              <SelectItem value="payment">
                {t('audit.entity_payment')}
              </SelectItem>
              <SelectItem value="user">{t('audit.entity_user')}</SelectItem>
              <SelectItem value="branch">{t('audit.entity_branch')}</SelectItem>
              <SelectItem value="group">{t('audit.entity_group')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="CREATE">{t('audit.action_create')}</SelectItem>
              <SelectItem value="UPDATE">{t('audit.action_update')}</SelectItem>
              <SelectItem value="DELETE">{t('audit.action_delete')}</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'min-w-[200px] justify-start text-left font-normal bg-secondary border-border',
                  !dateFrom && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {!dateFrom
                  ? t('audit.select_date')
                  : dateTo && dateTo.getTime() !== dateFrom.getTime()
                    ? `${format(dateFrom, 'dd.MM.yyyy')} \u2192 ${format(dateTo, 'dd.MM.yyyy')}`
                    : format(dateFrom, 'dd.MM.yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 max-w-[calc(100vw-2rem)] overflow-x-auto"
              align="start"
            >
              <Calendar
                mode="range"
                selected={{ from: dateFrom, to: dateTo }}
                onSelect={(range) => {
                  if (!range) {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  } else {
                    setDateFrom(range.from);
                    setDateTo(range.to ?? range.from);
                  }
                  setPage(1);
                }}
                numberOfMonths={2}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('audit.filter_user')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-secondary border-border"
            />
          </div>
        </div>
      </section>

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
        <div className="hidden md:block glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    #
                  </th>
                  <SortTh field="userName" label={t('audit.table_user')} />
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('users.detail.role')}
                  </th>
                  <SortTh field="action" label={t('audit.table_action')} />
                  <SortTh field="entity" label={t('audit.table_entity')} />
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('audit.detail_details')}
                  </th>
                  <SortTh field="createdAt" label={t('audit.table_time')} />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={7} className="p-4">
                        <Skeleton className="h-5" />
                      </td>
                    </tr>
                  ))
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <EmptyState
                        title={t('common.error')}
                        action={{
                          label: t('common.retry'),
                          onClick: () => refetch(),
                        }}
                      />
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <EmptyState
                        icon={ShieldCheck}
                        title={t('audit.not_found')}
                      />
                    </td>
                  </tr>
                ) : (
                  sorted.map((log, idx) => (
                    <tr
                      key={log.id}
                      className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => {
                        if (window.getSelection()?.toString()) return;
                        navigate(`/audit/${log.id}`, { state: { log } });
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')
                          navigate(`/audit/${log.id}`, { state: { log } });
                        if (e.key === ' ') {
                          e.preventDefault();
                          navigate(`/audit/${log.id}`, { state: { log } });
                        }
                      }}
                    >
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {(page - 1) * LIMIT + idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {log.user_name || t('common.na')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatAuditRole(log.user_role, t)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'font-medium text-xs',
                            auditActionColor(log.action),
                          )}
                        >
                          {formatAuditAction(log.action, t)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {formatAuditEntity(log.entity, t)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[240px] truncate">
                        {log.changes ? t('audit.changes') : log.entity_id}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatAuditDate(log.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden grid gap-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : isError ? (
            <EmptyState
              title={t('common.error')}
              action={{ label: t('common.retry'), onClick: () => refetch() }}
            />
          ) : sorted.length === 0 ? (
            <EmptyState icon={ShieldCheck} title={t('audit.not_found')} />
          ) : (
            sorted.map((log) => (
              <DataCard
                key={log.id}
                onClick={() => navigate(`/audit/${log.id}`, { state: { log } })}
                title={`${formatAuditAction(log.action, t)} \u00b7 ${formatAuditEntity(log.entity, t)}`}
                subtitle={log.user_name || t('common.na')}
                fields={[
                  {
                    label: t('audit.detail_date'),
                    value: formatAuditDate(log.created_at),
                  },
                  {
                    label: t('audit.detail_details'),
                    value: t('audit.changes'),
                  },
                ]}
              />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
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
              onClick={() => setPage((p) => p + 1)}
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
