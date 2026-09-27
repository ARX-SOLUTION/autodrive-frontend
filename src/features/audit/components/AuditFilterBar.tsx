// Callers: AuditLogPage. API: Date range + onDateRangeChange. Schema: URL
// date_from/date_to. User: "davom et" (autodrive-qsgc.4).
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { formatCalendarDate, parseCalendarDate } from '@/lib/calendarDate';
import { MagnifyingGlass, X } from '@phosphor-icons/react';

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

interface AuditFilterBarProps {
  search: string;
  entityFilter: string;
  actionFilter: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onSearchChange: (value: string) => void;
  onEntityChange: (value: string) => void;
  onActionChange: (value: string) => void;
  onDateRangeChange: (from: Date | undefined, to: Date | undefined) => void;
  onClearAll: () => void;
}

export const AuditFilterBar = ({
  search,
  entityFilter,
  actionFilter,
  dateFrom,
  dateTo,
  onSearchChange,
  onEntityChange,
  onActionChange,
  onDateRangeChange,
  onClearAll,
}: AuditFilterBarProps) => {
  const { t } = useTranslation();

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
        onDateRangeChange(today(), now);
        break;
      case 'week':
        onDateRangeChange(weekAgo(), now);
        break;
      case 'month':
        onDateRangeChange(monthStart(), now);
        break;
      case 'lastMonth':
        onDateRangeChange(lastMonthStart(), lastMonthEnd());
        break;
      case 'all':
        onDateRangeChange(undefined, undefined);
        break;
    }
  };

  const presetLabels: Record<string, string> = {
    today: t('common.today'),
    week: t('common.week'),
    month: t('common.this_month'),
    lastMonth: t('common.last_month'),
    all: t('common.all_time'),
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground text-balance">
          {t('audit.filter_title')}
        </h2>
        {hasAnyFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 gap-1 text-xs"
          >
            <X className="h-3 w-3" /> {t('audit.clear_all')}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {(['today', 'week', 'month', 'lastMonth', 'all'] as const).map((p) => (
          <Button
            key={p}
            variant="outline"
            size="sm"
            onClick={() => setPreset(p)}
          >
            {presetLabels[p]}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={entityFilter} onValueChange={onEntityChange}>
          <SelectTrigger className="w-44 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="student">{t('audit.entity_student')}</SelectItem>
            <SelectItem value="payment">{t('audit.entity_payment')}</SelectItem>
            <SelectItem value="user">{t('audit.entity_user')}</SelectItem>
            <SelectItem value="branch">{t('audit.entity_branch')}</SelectItem>
            <SelectItem value="group">{t('audit.entity_group')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={onActionChange}>
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

        <DateRangePicker
          from={dateFrom ? formatCalendarDate(dateFrom) : undefined}
          to={dateTo ? formatCalendarDate(dateTo) : undefined}
          onChange={(from, to) =>
            onDateRangeChange(
              from ? parseCalendarDate(from) : undefined,
              to ? parseCalendarDate(to) : undefined,
            )
          }
          aria-label={t('audit.select_date')}
          className="rounded-md border border-border bg-secondary px-2 py-1"
        />

        <div className="relative flex-1 min-w-[220px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('audit.filter_user')}
            aria-label={t('audit.filter_user')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
      </div>
    </section>
  );
};
