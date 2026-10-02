// Callers: AuditLogPage. API: Date range + onDateRangeChange. Schema: URL
// date_from/date_to. User: "davom et" (autodrive-qsgc.4).
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { formatCalendarDate, parseCalendarDate } from '@/lib/calendarDate';
import { SearchWithHotkey } from '@/components/filter/SearchWithHotkey';
import { ActiveFilterChips } from '@/components/filter/ActiveFilterChips';
import { MobileFilterSheet } from '@/components/filter/MobileFilterSheet';
import { useFilterBarState } from '@/hooks/useFilterBarState';

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

  const { chips, activeCount, isMobileOpen, setIsMobileOpen, clearAll } =
    useFilterBarState({
      filters: [
        entityFilter !== 'all' && {
          id: 'entity',
          label: t('audit.table_entity'),
          value: t(`audit.entity_${entityFilter}`),
          onRemove: () => onEntityChange('all'),
        },
        actionFilter !== 'all' && {
          id: 'action',
          label: t('audit.table_action'),
          value: t(`audit.action_${actionFilter.toLowerCase()}`),
          onRemove: () => onActionChange('all'),
        },
        (Boolean(dateFrom) || Boolean(dateTo)) && {
          id: 'date',
          label: t('common.date'),
          value:
            dateFrom && dateTo
              ? `${format(dateFrom, 'dd.MM.yyyy')}, ${format(dateTo, 'dd.MM.yyyy')}`
              : dateFrom
                ? format(dateFrom, 'dd.MM.yyyy')
                : dateTo
                  ? format(dateTo, 'dd.MM.yyyy')
                  : '',
          onRemove: () => onDateRangeChange(undefined, undefined),
        },
        Boolean(search.trim()) && {
          id: 'search',
          label: t('common.search'),
          value: search,
          onRemove: () => onSearchChange(''),
        },
      ],
      onClearAll,
    });

  return (
    <section className="space-y-3">
      {/* Search + Mobile Filter Trigger + Desktop Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] md:max-w-xs">
          <SearchWithHotkey
            placeholder={t('audit.filter_user')}
            aria-label={t('audit.filter_user')}
            value={search}
            onChange={onSearchChange}
            className="w-full"
          />
          <div className="md:hidden shrink-0">
            <MobileFilterSheet
              open={isMobileOpen}
              onOpenChange={setIsMobileOpen}
              activeCount={activeCount}
              onClearAll={clearAll}
            >
              {isMobileOpen && (
                <div className="flex flex-col gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      {t('audit.table_entity')}
                    </Label>
                    <Select value={entityFilter} onValueChange={onEntityChange}>
                      <SelectTrigger
                        aria-label={t('audit.table_entity')}
                        className="w-full bg-secondary border-border h-11"
                      >
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
                        <SelectItem value="user">
                          {t('audit.entity_user')}
                        </SelectItem>
                        <SelectItem value="branch">
                          {t('audit.entity_branch')}
                        </SelectItem>
                        <SelectItem value="group">
                          {t('audit.entity_group')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      {t('audit.table_action')}
                    </Label>
                    <Select value={actionFilter} onValueChange={onActionChange}>
                      <SelectTrigger
                        aria-label={t('audit.table_action')}
                        className="w-full bg-secondary border-border h-11"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('common.all')}</SelectItem>
                        <SelectItem value="CREATE">
                          {t('audit.action_create')}
                        </SelectItem>
                        <SelectItem value="UPDATE">
                          {t('audit.action_update')}
                        </SelectItem>
                        <SelectItem value="DELETE">
                          {t('audit.action_delete')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      {t('common.date')}
                    </Label>
                    <DateRangePicker
                      from={dateFrom ? formatCalendarDate(dateFrom) : undefined}
                      to={dateTo ? formatCalendarDate(dateTo) : undefined}
                      onChange={(from, to) =>
                        onDateRangeChange(
                          from ? parseCalendarDate(from) : undefined,
                          to ? parseCalendarDate(to) : undefined,
                        )
                      }
                      showPresets
                      aria-label={t('audit.select_date')}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </MobileFilterSheet>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex flex-wrap items-center gap-3">
          <Select value={entityFilter} onValueChange={onEntityChange}>
            <SelectTrigger
              aria-label={t('audit.table_entity')}
              className="w-40 bg-secondary border-border"
            >
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

          <Select value={actionFilter} onValueChange={onActionChange}>
            <SelectTrigger
              aria-label={t('audit.table_action')}
              className="w-40 bg-secondary border-border"
            >
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
            showPresets
            aria-label={t('audit.select_date')}
          />
        </div>
      </div>

      <ActiveFilterChips chips={chips} onClearAll={clearAll} />
    </section>
  );
};
