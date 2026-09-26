import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClockCounterClockwise,
  MagnifyingGlass,
  Trash,
} from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import PaginationControls from '@/components/ui/PaginationControls';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useDeletedExpenseHistoryPage } from '@/services/expenseService';
import { useAuthStore } from '@/store/authStore';
import type { DeletedExpenseHistorySummary } from '@/types/expense';
import { ExpenseHistoryPanel } from './ExpenseHistoryPanel';

const PAGE_SIZE = 10;

interface DialogState {
  identityKey: string;
  search: string;
  page: number;
  selectedId?: string;
}

interface DeletedExpenseHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDeletedAt = (value: string, language?: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const DeletedExpenseHistoryDialog = ({
  open,
  onOpenChange,
}: DeletedExpenseHistoryDialogProps) => {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const identityKey = `${user?.company_id ?? ''}:${user?.id ?? ''}:${user?.role ?? ''}`;
  const [state, setState] = useState<DialogState>(() => ({
    identityKey,
    search: '',
    page: 1,
  }));
  const dialogState =
    state.identityKey === identityKey
      ? state
      : { identityKey, search: '', page: 1 };
  const debouncedSearch = useDebounce(
    dialogState.search.trim().slice(0, 100),
    300,
  );

  const query = useDeletedExpenseHistoryPage(
    { search: debouncedSearch, page: dialogState.page, limit: PAGE_SIZE },
    open,
  );
  const totalPages = Math.max(1, query.data?.meta.totalPages ?? 1);
  const needsPageReset = !!query.data && dialogState.page > totalPages;
  const records = needsPageReset ? [] : (query.data?.data ?? []);
  const currentPage = query.data
    ? Math.min(dialogState.page, totalPages)
    : dialogState.page;
  const displayedTotalPages = query.data
    ? totalPages
    : Math.max(1, dialogState.page);
  const selectedRecord = records.find(
    (record) => record.id === dialogState.selectedId,
  );
  const selectedId = selectedRecord?.id;

  useEffect(() => {
    if (!needsPageReset) return undefined;
    const timeout = window.setTimeout(() => {
      setState((current) => ({
        ...(current.identityKey === identityKey
          ? current
          : { identityKey, search: '', page: 1 }),
        page: totalPages,
        selectedId: undefined,
      }));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [identityKey, needsPageReset, totalPages]);

  const updateSearch = (value: string) => {
    setState({ identityKey, search: value, page: 1 });
  };

  const selectRecord = (record: DeletedExpenseHistorySummary) => {
    setState((current) => ({
      ...(current.identityKey === identityKey
        ? current
        : { identityKey, search: '', page: 1 }),
      selectedId: record.id,
    }));
  };

  const setCurrentPage = (nextPage: number) => {
    setState((current) => ({
      ...(current.identityKey === identityKey
        ? current
        : { identityKey, search: '', page: 1 }),
      page: nextPage,
      selectedId: undefined,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl sm:p-0">
        <div className="flex max-h-[calc(100vh-2rem)] flex-col overflow-y-auto lg:overflow-hidden">
          <DialogHeader className="border-b border-border p-4 pr-12 sm:p-6 sm:pr-12">
            <DialogTitle className="flex items-center gap-2">
              <Trash
                className="h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              {t('expenses.deleted_history.title')}
            </DialogTitle>
            <DialogDescription>
              {t('expenses.deleted_history.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-0 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="flex flex-col border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r">
              <div className="border-b border-border p-4">
                <label
                  htmlFor="deleted-expense-search"
                  className="mb-2 block text-sm font-medium"
                >
                  {t('expenses.deleted_history.search_label')}
                </label>
                <div className="relative">
                  <MagnifyingGlass
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="deleted-expense-search"
                    value={dialogState.search}
                    maxLength={100}
                    onChange={(event) => updateSearch(event.target.value)}
                    placeholder={t(
                      'expenses.deleted_history.search_placeholder',
                    )}
                    className="pl-9"
                  />
                </div>
              </div>

              <div
                className="max-h-[min(45vh,24rem)] overflow-y-auto p-3 lg:min-h-0 lg:max-h-none lg:flex-1"
                aria-busy={
                  query.isLoading || query.isFetching || needsPageReset
                }
              >
                {query.isLoading || needsPageReset ? (
                  <div
                    className="space-y-2"
                    data-testid="deleted-expense-loading"
                  >
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton
                        key={index}
                        className="h-20 w-full rounded-xl"
                      />
                    ))}
                  </div>
                ) : query.isError ? (
                  <EmptyState
                    icon={ClockCounterClockwise}
                    title={t('expenses.deleted_history.load_error')}
                    action={{
                      label: t('common.retry'),
                      onClick: () => void query.refetch(),
                    }}
                  />
                ) : records.length === 0 ? (
                  <EmptyState
                    icon={Trash}
                    title={t('expenses.deleted_history.empty')}
                    description={t(
                      'expenses.deleted_history.empty_description',
                    )}
                  />
                ) : (
                  <ol className="space-y-2" data-testid="deleted-expense-list">
                    {records.map((record) => (
                      <li key={record.id}>
                        <button
                          type="button"
                          onClick={() => selectRecord(record)}
                          className={cn(
                            'w-full rounded-xl border border-border bg-card/70 p-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            selectedId === record.id &&
                              'border-primary bg-primary/5 ring-1 ring-primary/30',
                          )}
                          aria-pressed={selectedId === record.id}
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span>
                              <span className="block break-words font-medium text-foreground">
                                {record.title}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {record.branch_name ??
                                  t('expenses.form.company_wide')}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums">
                              {formatMoney(record.amount)}
                            </span>
                          </span>
                          <span className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              {t(`expenses.category.${record.category}`)}
                            </span>
                            <span>
                              {t('expenses.deleted_history.deleted_at', {
                                date: formatDeletedAt(
                                  record.deleted_at,
                                  i18n?.language,
                                ),
                              })}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <PaginationControls
                className="border-t border-border px-3 pb-3"
                currentPage={currentPage}
                totalPages={displayedTotalPages}
                onPageChange={setCurrentPage}
                pageSize={PAGE_SIZE}
                totalItems={query.data?.meta.total}
                disabled={query.isFetching}
              />
            </section>

            <section className="p-4 lg:min-h-0 lg:overflow-y-auto">
              {selectedId ? (
                <ExpenseHistoryPanel expenseId={selectedId} />
              ) : (
                <EmptyState
                  icon={ClockCounterClockwise}
                  title={t('expenses.deleted_history.select_title')}
                  description={t('expenses.deleted_history.select_description')}
                />
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
