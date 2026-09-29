import { useCallback, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Car, CaretRight, Plus } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { useListQueryState } from '@/hooks/useListQueryState';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useFilterBarState } from '@/hooks/useFilterBarState';
import { matchesListQuery } from '@/lib/listQuery';
import { SearchWithHotkey } from '@/components/filter/SearchWithHotkey';
import { ActiveFilterChips } from '@/components/filter/ActiveFilterChips';
import { MobileFilterSheet } from '@/components/filter/MobileFilterSheet';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DataCard } from '@/components/ui/DataCard';
import { useBranches } from '@/features/branches/api/branchService';
import {
  useDrivingSessionsPage,
  usePracticeInstructors,
} from '@/features/driving-sessions/api/drivingSessionService';
import { useVehiclesPage } from '@/features/vehicles/api/vehicleService';
import { formatTashkentDateTime } from '@/lib/calendarDateTime';
import type {
  DrivingSession,
  DrivingSessionStatus,
} from '@/features/driving-sessions/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DataGrid, createDataGridColumnHelper } from '@/shared/ui/data-grid';

const selectClass =
  'h-11 md:h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const sessionColumnHelper = createDataGridColumnHelper<DrivingSession>();

const DrivingSessionsPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canViewAll = useCan('viewAllBranches');
  const canSchedule = useCan('scheduleDrivingSessions');
  const { data: branches = [] } = useBranches(canViewAll);

  const { searchParams, setParams } = useUrlParams();
  const branchId = searchParams.get('branch_id') ?? '';
  const status = (searchParams.get('status') ?? '') as
    DrivingSessionStatus | '';
  const dateFrom = searchParams.get('from') ?? '';
  const dateTo = searchParams.get('to') ?? '';
  const vehicleId = searchParams.get('vehicle_id') ?? '';
  const instructorId = searchParams.get('instructor_id') ?? '';

  const {
    page,
    pageSize,
    search,
    debouncedSearch,
    setPage,
    setPageSize,
    setSearch,
  } = useListQueryState();

  const handleBranchChange = (nextBranchId: string) => {
    setParams({
      branch_id: nextBranchId || undefined,
      vehicle_id: undefined,
      instructor_id: undefined,
      page: undefined,
    });
  };

  const handleStatusChange = (nextStatus: DrivingSessionStatus | '') => {
    setParams({
      status: nextStatus || undefined,
      page: undefined,
    });
  };

  const handleDateChange = (from?: string, to?: string) => {
    setParams({
      from: from || undefined,
      to: to || undefined,
      page: undefined,
    });
  };

  const handleVehicleChange = (nextVehicleId: string) => {
    setParams({
      vehicle_id: nextVehicleId || undefined,
      page: undefined,
    });
  };

  const handleInstructorChange = (nextInstructorId: string) => {
    setParams({
      instructor_id: nextInstructorId || undefined,
      page: undefined,
    });
  };

  const clearFilters = () => {
    setParams({
      q: undefined,
      branch_id: undefined,
      status: undefined,
      from: undefined,
      to: undefined,
      vehicle_id: undefined,
      instructor_id: undefined,
      page: undefined,
    });
  };

  const effectiveBranch = canViewAll
    ? branchId || undefined
    : (user?.branch_id ?? undefined);

  const { data: branchVehicles } = useVehiclesPage({
    branchId: effectiveBranch,
    limit: 100,
  });

  const { data: practiceTeachers = [] } = usePracticeInstructors(
    effectiveBranch ?? '',
    Boolean(effectiveBranch),
  );

  const sessions = useDrivingSessionsPage({
    branchId: effectiveBranch,
    status: status || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    vehicleId: vehicleId || undefined,
    instructorId: instructorId || undefined,
    page,
    limit: pageSize,
  });

  const selectedBranch = branchId
    ? branches.find((b) => b.id === branchId)
    : undefined;
  const branchLabel = selectedBranch?.name || branchId;

  const selectedVehicle = (branchVehicles?.data ?? []).find(
    (v) => v.id === vehicleId,
  );
  const vehicleLabel = selectedVehicle
    ? `${selectedVehicle.plate_number} (${selectedVehicle.make} ${selectedVehicle.model})`
    : vehicleId;

  const selectedInstructor = practiceTeachers.find(
    (i) => i.id === instructorId,
  );
  const instructorLabel = selectedInstructor?.name || instructorId;

  const dateLabel =
    dateFrom && dateTo
      ? `${dateFrom}, ${dateTo}`
      : dateFrom
        ? `${dateFrom}`
        : dateTo
          ? `${dateTo}`
          : undefined;

  const { chips, activeCount, isMobileOpen, setIsMobileOpen, clearAll } =
    useFilterBarState({
      filters: [
        Boolean(canViewAll && branchId) && {
          id: 'branch',
          label: t('common.branch'),
          value: branchLabel,
          onRemove: () => handleBranchChange(''),
        },
        Boolean(status) && {
          id: 'status',
          label: t('common.status'),
          value: t(`driving.status.${status}`, { defaultValue: status }),
          onRemove: () => handleStatusChange(''),
        },
        Boolean(dateFrom || dateTo) && {
          id: 'date_range',
          label: t('common.date'),
          value: dateLabel ?? '',
          onRemove: () => handleDateChange(undefined, undefined),
        },
        Boolean(vehicleId) && {
          id: 'vehicle',
          label: t('driving.vehicle'),
          value: vehicleLabel,
          onRemove: () => handleVehicleChange(''),
        },
        Boolean(instructorId) && {
          id: 'instructor',
          label: t('driving.instructor'),
          value: instructorLabel,
          onRemove: () => handleInstructorChange(''),
        },
        Boolean(search.trim()) && {
          id: 'search',
          label: t('common.search'),
          value: search,
          onRemove: () => setSearch(''),
        },
      ],
      onClearAll: clearFilters,
    });
  const visibleSessions = useMemo(
    () =>
      (sessions.data?.data ?? []).filter((session) =>
        matchesListQuery(
          debouncedSearch,
          session.student.first_name,
          session.student.last_name,
          session.vehicle.plate_number,
          session.instructor.name,
        ),
      ),
    [sessions.data, debouncedSearch],
  );
  const formatDate = useCallback(
    (value: string) => formatTashkentDateTime(value, i18n.language),
    [i18n.language],
  );

  const startIndex = (page - 1) * pageSize;

  const columns = useMemo(
    () =>
      sessionColumnHelper.columns([
        sessionColumnHelper.display({
          id: 'rowNumber',
          header: '#',
          meta: {
            align: 'center',
            cellClassName: 'text-muted-foreground w-12',
          },
          cell: ({ row }) => startIndex + row.getDisplayIndex() + 1,
        }),
        sessionColumnHelper.display({
          id: 'student',
          header: t('students.student'),
          meta: { cellClassName: 'font-medium' },
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/driving-sessions/$id',
                  params: { id: row.original.id },
                })
              }
              className="text-left font-medium text-foreground hover:underline"
            >
              {row.original.student.last_name} {row.original.student.first_name}
            </button>
          ),
        }),
        sessionColumnHelper.display({
          id: 'starts_at',
          header: t('driving.starts_at'),
          meta: { cellClassName: 'text-muted-foreground whitespace-nowrap' },
          cell: ({ row }) => formatDate(row.original.starts_at),
        }),
        sessionColumnHelper.display({
          id: 'vehicle',
          header: t('driving.vehicle'),
          meta: { cellClassName: 'font-mono text-xs' },
          cell: ({ row }) => row.original.vehicle.plate_number,
        }),
        sessionColumnHelper.display({
          id: 'instructor',
          header: t('driving.instructor'),
          meta: { cellClassName: 'text-muted-foreground' },
          cell: ({ row }) => row.original.instructor.name,
        }),
        sessionColumnHelper.accessor('status', {
          header: t('common.status'),
          meta: { align: 'center' },
          cell: ({ getValue }) => {
            const val = getValue();
            const colorClass =
              val === 'approved'
                ? 'bg-success/10 text-success'
                : val === 'submitted'
                  ? 'bg-warning/10 text-warning'
                  : val === 'planned'
                    ? 'bg-info/10 text-info'
                    : val === 'rejected'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground';
            return (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
              >
                {t(`driving.status.${val}`)}
              </span>
            );
          },
        }),
        sessionColumnHelper.accessor('planned_minutes', {
          header: t('driving.planned'),
          meta: {
            align: 'center',
            cellClassName: 'tabular-nums text-muted-foreground',
          },
          cell: ({ getValue }) => `${getValue()} ${t('driving.minutes')}`,
        }),
        sessionColumnHelper.display({
          id: 'actual_minutes',
          header: t('driving.entered'),
          meta: {
            align: 'center',
            cellClassName: 'tabular-nums text-muted-foreground',
          },
          cell: ({ row }) =>
            row.original.actual_minutes === null
              ? t('common.na')
              : `${row.original.actual_minutes} ${t('driving.minutes')}`,
        }),
        sessionColumnHelper.accessor('approved_minutes', {
          header: t('driving.approved'),
          meta: {
            align: 'center',
            cellClassName: 'tabular-nums text-muted-foreground font-medium',
          },
          cell: ({ getValue }) => `${getValue()} ${t('driving.minutes')}`,
        }),
        sessionColumnHelper.display({
          id: 'actions',
          header: t('common.actions'),
          meta: { align: 'center' },
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/driving-sessions/$id',
                  params: { id: row.original.id },
                })
              }
              aria-label={t('common.view')}
              title={t('common.view')}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <CaretRight className="h-4 w-4" />
            </button>
          ),
        }),
      ]),
    [formatDate, navigate, startIndex, t],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t('driving.title')}
        title={t('driving.title')}
        icon={<Car className="h-3.5 w-3.5" />}
        actions={
          canSchedule ? (
            <Button onClick={() => navigate({ to: '/training-enrollments' })}>
              <Plus className="mr-2 h-4 w-4" />
              {t('driving.schedule')}
            </Button>
          ) : undefined
        }
      />
      {/* Filter bar */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] md:max-w-xs">
            <SearchWithHotkey
              value={search}
              onChange={setSearch}
              placeholder={t('driving.search_placeholder', {
                defaultValue: t('common.search'),
              })}
              aria-label={t('common.search')}
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
                    {canViewAll && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                          {t('common.branch')}
                        </Label>
                        <select
                          aria-label={t('common.branch')}
                          className={selectClass}
                          value={branchId}
                          onChange={(e) => handleBranchChange(e.target.value)}
                        >
                          <option value="">{t('common.all_branches')}</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        {t('common.status')}
                      </Label>
                      <select
                        aria-label={t('common.status')}
                        className={selectClass}
                        value={status}
                        onChange={(e) =>
                          handleStatusChange(
                            e.target.value as DrivingSessionStatus | '',
                          )
                        }
                      >
                        <option value="">{t('common.all')}</option>
                        {(
                          [
                            'planned',
                            'submitted',
                            'approved',
                            'rejected',
                            'cancelled',
                          ] as const
                        ).map((v) => (
                          <option key={v} value={v}>
                            {t(`driving.status.${v}`)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        {t('common.date')}
                      </Label>
                      <DateRangePicker
                        from={dateFrom}
                        to={dateTo}
                        onChange={handleDateChange}
                        showPresets
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        {t('driving.vehicle')}
                      </Label>
                      <select
                        aria-label={t('driving.vehicle')}
                        className={selectClass}
                        value={vehicleId}
                        onChange={(e) => handleVehicleChange(e.target.value)}
                      >
                        <option value="">{t('common.all')}</option>
                        {(branchVehicles?.data ?? []).map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plate_number} ({v.make} {v.model})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        {t('driving.instructor')}
                      </Label>
                      <select
                        aria-label={t('driving.instructor')}
                        className={selectClass}
                        value={instructorId}
                        onChange={(e) => handleInstructorChange(e.target.value)}
                      >
                        <option value="">{t('common.all')}</option>
                        {practiceTeachers.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </MobileFilterSheet>
            </div>
          </div>

          {/* Desktop filter controls */}
          <div className="hidden md:flex flex-wrap items-center gap-3">
            {canViewAll && (
              <div className="w-48">
                <select
                  aria-label={t('common.branch')}
                  className={selectClass}
                  value={branchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                >
                  <option value="">{t('common.all_branches')}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-36">
              <select
                aria-label={t('common.status')}
                className={selectClass}
                value={status}
                onChange={(e) =>
                  handleStatusChange(
                    e.target.value as DrivingSessionStatus | '',
                  )
                }
              >
                <option value="">{t('common.all')}</option>
                {(
                  [
                    'planned',
                    'submitted',
                    'approved',
                    'rejected',
                    'cancelled',
                  ] as const
                ).map((v) => (
                  <option key={v} value={v}>
                    {t(`driving.status.${v}`)}
                  </option>
                ))}
              </select>
            </div>

            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onChange={handleDateChange}
              showPresets
            />

            {(branchVehicles?.data ?? []).length > 0 && (
              <div className="w-44">
                <select
                  aria-label={t('driving.vehicle')}
                  className={selectClass}
                  value={vehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                >
                  <option value="">
                    {t('vehicles.all_vehicles', {
                      defaultValue: t('common.all'),
                    })}
                  </option>
                  {(branchVehicles?.data ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} ({v.make} {v.model})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {practiceTeachers.length > 0 && (
              <div className="w-44">
                <select
                  aria-label={t('driving.instructor')}
                  className={selectClass}
                  value={instructorId}
                  onChange={(e) => handleInstructorChange(e.target.value)}
                >
                  <option value="">
                    {t('driving.all_instructors', {
                      defaultValue: t('common.all'),
                    })}
                  </option>
                  {practiceTeachers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <ActiveFilterChips chips={chips} onClearAll={clearAll} />
      </div>

      <DataGrid
        data={visibleSessions}
        columns={columns}
        getRowId={(session) => session.id}
        pagination={{
          pageIndex: page - 1,
          pageSize,
          rowCount: sessions.data?.meta.total ?? visibleSessions.length,
          pageCount: Math.max(1, sessions.data?.meta.totalPages ?? 1),
        }}
        onPaginationChange={({ pageIndex }) => setPage(pageIndex + 1)}
        onPageSizeChange={setPageSize}
        sorting={[]}
        onSortingChange={() => undefined}
        columnFilters={[]}
        onColumnFiltersChange={() => undefined}
        manualPagination
        manualSorting={false}
        manualFiltering
        isInitialLoading={sessions.isLoading}
        isFetching={sessions.isFetching}
        labels={{
          table: t('driving.title'),
          loading: t('common.loading'),
          fetching: t('common.loading'),
          previousPage: t('common.previous'),
          nextPage: t('common.next'),
        }}
        errorState={
          sessions.isError ? (
            <EmptyState
              title={t('common.error')}
              action={{
                label: t('common.retry'),
                onClick: () => void sessions.refetch(),
              }}
            />
          ) : undefined
        }
        emptyState={<EmptyState title={t('common.no_data')} />}
        renderMobileRow={({ row: session }) => (
          <DataCard
            key={session.id}
            title={`${session.student.last_name} ${session.student.first_name}`}
            subtitle={formatDate(session.starts_at)}
            onClick={() =>
              navigate({
                to: '/driving-sessions/$id',
                params: { id: session.id },
              })
            }
            fields={[
              {
                label: t('driving.vehicle'),
                value: session.vehicle.plate_number,
              },
              {
                label: t('driving.instructor'),
                value: session.instructor.name,
              },
              {
                label: t('common.status'),
                value: t(`driving.status.${session.status}`),
              },
              {
                label: t('driving.planned'),
                value: `${session.planned_minutes} ${t('driving.minutes')}`,
              },
              {
                label: t('driving.entered'),
                value:
                  session.actual_minutes === null
                    ? t('common.na')
                    : `${session.actual_minutes} ${t('driving.minutes')}`,
              },
              {
                label: t('driving.approved'),
                value: `${session.approved_minutes} ${t('driving.minutes')}`,
              },
            ]}
          />
        )}
      />
    </div>
  );
};

export default DrivingSessionsPage;
