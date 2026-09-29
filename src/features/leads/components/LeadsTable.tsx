import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import type { PaginationState } from '@tanstack/react-table';
import { Clock, WarningCircle, FunnelSimple } from '@phosphor-icons/react';
import { createDataGridColumnHelper, DataGrid } from '@/shared/ui/data-grid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPhone } from '@/lib/phoneFormater';
import { formatDate, formatDateTime } from '@/shared/lib/studentsFormat';
import { cn } from '@/lib/utils';
import type { Lead } from '../types/leads.types';

export interface LeadsTableProps {
  leads: Lead[];
  isLoading: boolean;
  isFetching?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  currentPage: number;
  pageSize: number;
  totalLeads: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onOpenLead?: (lead: Lead) => void;
  className?: string;
}

const columnHelper = createDataGridColumnHelper<Lead>();

export const LeadsTable = ({
  leads,
  isLoading,
  isFetching = false,
  isError = false,
  onRetry,
  currentPage,
  pageSize,
  totalLeads,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onOpenLead,
  className,
}: LeadsTableProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleOpenLead = (lead: Lead) => {
    if (onOpenLead) {
      onOpenLead(lead);
    } else {
      void navigate({ to: '/leads/$id', params: { id: lead.id } });
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => `${row.firstName} ${row.lastName || ''}`.trim(),
        {
          id: 'name',
          header: t('common.name', 'F.I.SH'),
          cell: ({ row }) => {
            const lead = row.original;
            return (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <span>
                    {lead.firstName} {lead.lastName || ''}
                  </span>
                  {lead.category && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {lead.category}
                    </span>
                  )}
                </div>
                {lead.courseType && (
                  <span className="text-[11px] text-muted-foreground/80 capitalize">
                    {lead.courseType === 'avto_maktab'
                      ? t('courses.avto_maktab', 'Avto maktab')
                      : t('courses.tezkor', 'Tezkor')}
                  </span>
                )}
              </div>
            );
          },
        },
      ),
      columnHelper.accessor('phone', {
        id: 'phone',
        header: t('common.phone', 'Telefon'),
        cell: ({ getValue }) => (
          <span className="font-mono text-xs tabular-nums text-foreground/90">
            {formatPhone(getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('branchName', {
        id: 'branch',
        header: t('common.branch', 'Filial'),
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {getValue() || '-'}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.stage?.name || '', {
        id: 'stage',
        header: t('leads.stage', 'Bosqich'),
        cell: ({ row }) => {
          const lead = row.original;
          const stage = lead.stage;
          const color = stage?.color || '#3b82f6';
          return (
            <div className="flex flex-col items-start gap-1">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${color}18`,
                  color: color,
                  borderColor: `${color}40`,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {stage?.name || '-'}
              </span>
              {lead.lostReason && (
                <span className="text-[10px] font-medium text-destructive">
                  {t(`leads.lost_reasons.${lead.lostReason}`, lead.lostReason)}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('source', {
        id: 'source',
        header: t('leads.source', 'Manba'),
        cell: ({ getValue }) => (
          <span className="text-xs capitalize text-muted-foreground">
            {t(`leads.sources.${getValue()}`, getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('nextStepAt', {
        id: 'nextStepAt',
        header: t('leads.next_step', 'Navbatdagi qadam'),
        cell: ({ getValue }) => {
          const nextStep = getValue();
          if (!nextStep) {
            return <span className="text-xs text-muted-foreground/60">-</span>;
          }
          const nextDate = new Date(nextStep);
          const now = new Date();
          const todayEnd = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
          );
          const todayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
          );

          if (nextDate < now) {
            return (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                <WarningCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{formatDateTime(nextStep)}</span>
              </span>
            );
          }
          if (nextDate >= todayStart && nextDate <= todayEnd) {
            return (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{formatDateTime(nextStep)}</span>
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{formatDate(nextStep)}</span>
            </span>
          );
        },
      }),
      columnHelper.accessor('assigneeName', {
        id: 'assignee',
        header: t('leads.assignee', 'Biriktirilgan'),
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {getValue() || t('leads.unassigned', 'Biriktirilmagan')}
          </span>
        ),
      }),
      columnHelper.accessor('createdAt', {
        id: 'createdAt',
        header: t('common.created_at', 'Yaratilgan'),
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDate(getValue())}
          </span>
        ),
      }),
    ],
    [t],
  );

  const handlePaginationChange = (pagination: PaginationState) => {
    onPageChange(pagination.pageIndex + 1);
  };

  const emptyState = (
    <EmptyState
      icon={FunnelSimple}
      title={t('leads.no_leads', 'Hozircha lidlar mavjud emas')}
      description={t(
        'leads.no_leads_desc',
        'Filtrlarni o‘zgartiring yoki yangi lid qo‘shing',
      )}
    />
  );

  return (
    <DataGrid<Lead>
      data={leads}
      columns={columns}
      getRowId={(lead) => lead.id}
      pagination={{
        pageIndex: Math.max(0, currentPage - 1),
        pageSize,
        rowCount: totalLeads,
        pageCount: totalPages,
      }}
      onPaginationChange={handlePaginationChange}
      onPageSizeChange={onPageSizeChange}
      sorting={[]}
      onSortingChange={() => undefined}
      columnFilters={[]}
      onColumnFiltersChange={() => undefined}
      manualPagination
      manualSorting
      manualFiltering
      isInitialLoading={isLoading}
      isFetching={isFetching}
      labels={{
        table: t('leads.leads', 'Lidlar'),
        loading: t('common.loading', 'Yuklanmoqda...'),
        fetching: t('common.loading', 'Yuklanmoqda...'),
        previousPage: t('common.previous', 'Oldingi'),
        nextPage: t('common.next', 'Keyingi'),
      }}
      loadingState={
        <div className="grid gap-3 p-4">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      }
      errorState={
        isError ? (
          <EmptyState
            title={t('common.error', 'Xatolik yuz berdi')}
            action={
              onRetry
                ? {
                    label: t('common.retry', 'Qayta urinish'),
                    onClick: onRetry,
                  }
                : undefined
            }
          />
        ) : undefined
      }
      emptyState={emptyState}
      renderMobileRow={({ row }) => {
        const leadName = `${row.firstName} ${row.lastName || ''}`.trim() || '-';
        return (
          <div
            role="button"
            tabIndex={0}
            aria-label={`${leadName}, ${row.phone}`}
            onClick={() => handleOpenLead(row)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenLead(row);
              }
            }}
            className="cursor-pointer space-y-2 rounded-lg border bg-card p-3 shadow-xs transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm text-foreground">
                {leadName}
              </div>
              {row.stage && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${row.stage.color}20`,
                    color: row.stage.color,
                  }}
                >
                  {row.stage.name}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono">{formatPhone(row.phone)}</span>
              <span>{row.branchName || '-'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-1 text-xs text-muted-foreground">
              <span className="capitalize">
                {t(`leads.sources.${row.source}`, row.source)}
              </span>
              {row.assigneeName ? (
                <span>{row.assigneeName}</span>
              ) : (
                <span className="text-muted-foreground italic">
                  {t('leads.unassigned', 'Biriktirilmagan')}
                </span>
              )}
            </div>
          </div>
        );
      }}
      onRowActivate={(lead) => handleOpenLead(lead)}
      getRowAriaLabel={(lead) =>
        `${lead.firstName} ${lead.lastName || ''}`.trim()
      }
      rowClassName={() => 'cursor-pointer hover:bg-muted/50 transition-colors'}
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-opacity duration-200',
        isFetching && !isLoading && 'opacity-50',
        className,
      )}
    />
  );
};
