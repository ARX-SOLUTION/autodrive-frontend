import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowClockwise,
  ArrowSquareOut,
  Car,
  FunnelSimple,
  MagnifyingGlass,
  MapTrifold,
  X,
} from '@phosphor-icons/react';
import axios from 'axios';
import { EmptyState } from '@/components/ui/EmptyState';
import PaginationControls from '@/components/ui/PaginationControls';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { useCan } from '@/hooks/useCan';
import { useBranches } from '@/services/branchService';
import { useVehiclesPage } from '@/services/vehicleService';
import { useAuthStore } from '@/store/authStore';
import {
  VEHICLE_CATEGORIES,
  type VehicleCategory,
  type VehicleStatus,
} from '@/types/vehicle';

const publicDemoTiles = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const tileUrl =
  import.meta.env.VITE_FLEET_MAP_TILE_URL?.trim() ||
  (import.meta.env.DEV ? publicDemoTiles : undefined);
const osmAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const providerAttribution =
  import.meta.env.VITE_FLEET_MAP_TILE_ATTRIBUTION?.trim();

interface FleetBasemapProps {
  className?: string;
}

const FleetBasemap = ({ className }: FleetBasemapProps) => {
  const { t } = useTranslation();
  const mapElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapElement.current || !tileUrl) return;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const map = L.map(mapElement.current, {
      scrollWheelZoom: false,
      zoomControl: false,
      zoomAnimation: !prefersReducedMotion,
      fadeAnimation: !prefersReducedMotion,
      markerZoomAnimation: !prefersReducedMotion,
    }).setView([41, 64], 5);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: providerAttribution
        ? `${osmAttribution} | ${providerAttribution}`
        : osmAttribution,
    }).addTo(map);

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            map.invalidateSize();
          });
    if (resizeObserver) {
      resizeObserver.observe(mapElement.current);
    }
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      window.clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      map.remove();
    };
  }, []);

  return (
    <div
      ref={mapElement}
      role="region"
      aria-label={t('fleet_map.basemap_label')}
      className={className}
    />
  );
};

const FleetMapPage = () => {
  const { t } = useTranslation();
  const mobileRosterToggleRef = useRef<HTMLButtonElement>(null);
  const desktopRosterToggleRef = useRef<HTMLButtonElement>(null);
  const detailHeadingRef = useRef<HTMLParagraphElement>(null);
  const user = useAuthStore((state) => state.user);
  const canViewAllBranches = useCan('viewAllBranches');
  const { data: branches = [] } = useBranches(canViewAllBranches);
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<VehicleStatus | ''>('');
  const [category, setCategory] = useState<VehicleCategory | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'current' | 'history'>('current');
  const [mobileRosterOpen, setMobileRosterOpen] = useState(false);
  const [desktopRosterOpen, setDesktopRosterOpen] = useState(true);
  const searchTerm = useDebounce(search.trim(), 300);
  const vehicles = useVehiclesPage({
    branchId: canViewAllBranches
      ? branchId || undefined
      : (user?.branch_id ?? undefined),
    search: searchTerm || undefined,
    status: status || undefined,
    category: category || undefined,
    page,
    limit: 20,
  });
  const selectedVehicle = vehicles.isError
    ? undefined
    : vehicles.data?.data.find((vehicle) => vehicle.id === selectedId);
  const totalVehicles = vehicles.data?.meta.total ?? 0;
  const totalPages = Math.max(1, vehicles.data?.meta.totalPages ?? 1);
  const hasFilters = Boolean(search || branchId || status || category);
  const branchNames = new Map(
    branches.map((branch) => [branch.id, branch.name]),
  );
  const branchName = (id: string) =>
    branchNames.get(id) ??
    (id === user?.branch_id ? user?.branch_name : null) ??
    id;
  const denied =
    axios.isAxiosError(vehicles.error) &&
    vehicles.error.response?.status === 403;

  useEffect(() => {
    if (!selectedVehicle) return;

    const focusTimer = window.setTimeout(() => {
      detailHeadingRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [selectedVehicle]);

  const focusRosterToggle = () => {
    window.setTimeout(() => {
      const desktopVisible =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(min-width: 1024px)').matches;
      if (desktopVisible) {
        desktopRosterToggleRef.current?.focus();
      } else {
        mobileRosterToggleRef.current?.focus();
      }
    }, 0);
  };

  const resetList = () => {
    setSelectedId(null);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setBranchId('');
    setStatus('');
    setCategory('');
    resetList();
  };

  const selectView = (next: 'current' | 'history') => {
    setView(next);
    setMobileRosterOpen(false);
    document.getElementById(`fleet-map-${next}-tab`)?.focus();
  };

  const selectVehicle = (id: string) => {
    setSelectedId(id);
    setMobileRosterOpen(false);
  };

  const closeRoster = () => {
    setMobileRosterOpen(false);
    setDesktopRosterOpen(false);
    focusRosterToggle();
  };

  const closeVehicleDetails = () => {
    setSelectedId(null);
    focusRosterToggle();
  };

  return (
    <div className="relative isolate h-full min-h-0 overflow-hidden bg-background">
      {tileUrl ? (
        <FleetBasemap className="absolute inset-0 z-0 h-full w-full bg-muted" />
      ) : (
        <div
          role="region"
          aria-label={t('fleet_map.basemap_label')}
          className="absolute inset-0 z-0 flex items-center justify-center bg-muted/30 px-6 text-center"
        >
          <div className="max-w-md rounded-xl border border-border/70 bg-background/90 p-5 shadow-lg shadow-black/5">
            <MapTrifold
              className="mx-auto h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="mt-4 font-heading text-lg font-bold text-foreground">
              {t('fleet_map.basemap_unconfigured')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('fleet_map.basemap_unconfigured_desc')}
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="pointer-events-auto absolute left-[68px] right-3 top-3 flex flex-wrap items-center gap-2 lg:left-4 lg:right-auto lg:top-4">
          <div className="flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-border/70 bg-background/95 px-2.5 py-1.5 shadow-lg shadow-black/10 backdrop-blur">
            <button
              ref={mobileRosterToggleRef}
              type="button"
              aria-label={t('fleet_map.toggle_roster')}
              aria-controls="fleet-map-roster"
              aria-expanded={mobileRosterOpen}
              onClick={() => setMobileRosterOpen((open) => !open)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
            >
              <FunnelSimple className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              ref={desktopRosterToggleRef}
              type="button"
              aria-label={t('fleet_map.toggle_roster')}
              aria-controls="fleet-map-roster"
              aria-expanded={desktopRosterOpen}
              onClick={() => setDesktopRosterOpen((open) => !open)}
              className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:flex"
            >
              <FunnelSimple className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 pr-1">
              <h1 className="truncate font-heading text-sm font-bold text-foreground sm:text-base">
                {t('nav.fleet_map')}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {t('fleet_map.gps_unconfigured')}
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label={t('nav.fleet_map')}
            className="flex min-h-11 rounded-xl border border-border/70 bg-background/95 p-1 shadow-lg shadow-black/10 backdrop-blur"
          >
            {(['current', 'history'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={view === option}
                aria-controls={`fleet-map-${option}-panel`}
                id={`fleet-map-${option}-tab`}
                tabIndex={view === option ? 0 : -1}
                onClick={() => selectView(option)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    event.preventDefault();
                    selectView(option === 'current' ? 'history' : 'current');
                  } else if (event.key === 'Home' || event.key === 'End') {
                    event.preventDefault();
                    selectView(event.key === 'Home' ? 'current' : 'history');
                  }
                }}
                className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-selected:bg-primary aria-selected:text-primary-foreground"
              >
                {t(`fleet_map.${option}`)}
              </button>
            ))}
          </div>
        </div>

        <section
          id="fleet-map-roster"
          aria-label={t('fleet_map.roster')}
          className={[
            'pointer-events-auto absolute bottom-28 left-3 top-[8.5rem] w-[min(24rem,calc(100%-1.5rem))] min-w-0 flex-col overflow-y-auto rounded-xl border border-border/70 bg-background/95 shadow-xl shadow-black/10 backdrop-blur lg:bottom-4 lg:left-4 lg:top-20 lg:w-96 lg:overflow-hidden',
            mobileRosterOpen ? 'flex' : 'hidden',
            desktopRosterOpen ? 'lg:flex' : 'lg:hidden',
          ].join(' ')}
        >
          <div className="shrink-0 border-b border-border/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-heading text-base font-bold text-foreground">
                  {t('fleet_map.roster')}
                </h2>
                <p
                  aria-live="polite"
                  className="text-xs tabular-nums text-muted-foreground"
                >
                  {!vehicles.isLoading && !vehicles.isError
                    ? t('fleet_map.vehicle_count', { count: totalVehicles })
                    : t('fleet_map.filters')}
                </p>
              </div>
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={closeRoster}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <div className="relative">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  aria-label={t('common.search')}
                  placeholder={t('fleet_map.search_placeholder')}
                  className="h-11 pl-9"
                  maxLength={100}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetList();
                  }}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {canViewAllBranches ? (
                  <select
                    aria-label={t('common.branch')}
                    className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                    value={branchId}
                    onChange={(event) => {
                      setBranchId(event.target.value);
                      resetList();
                    }}
                  >
                    <option value="">{t('common.all_branches')}</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="flex min-h-11 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground">
                    {user?.branch_name ?? t('common.branch')}
                  </p>
                )}

                <select
                  aria-label={t('common.status')}
                  className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as VehicleStatus | '');
                    resetList();
                  }}
                >
                  <option value="">{t('fleet_map.all_statuses')}</option>
                  <option value="active">{t('vehicles.status.active')}</option>
                  <option value="out_of_service">
                    {t('vehicles.status.out_of_service')}
                  </option>
                  <option value="retired">
                    {t('vehicles.status.retired')}
                  </option>
                </select>

                <select
                  aria-label={t('vehicles.categories')}
                  className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm sm:col-span-2"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value as VehicleCategory | '');
                    resetList();
                  }}
                >
                  <option value="">{t('vehicles.all_categories')}</option>
                  {VEHICLE_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {t(`vehicles.categories_list.${value}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  {t('fleet_map.clear_filters')}
                </button>
                <button
                  type="button"
                  aria-busy={vehicles.isFetching}
                  onClick={() => void vehicles.refetch()}
                  disabled={vehicles.isFetching}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-70"
                >
                  <ArrowClockwise
                    className={[
                      'h-4 w-4',
                      vehicles.isFetching
                        ? 'animate-spin motion-reduce:animate-none'
                        : '',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                  {t('fleet_map.refresh')}
                </button>
              </div>
            </div>
          </div>

          <div className="shrink-0 p-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {vehicles.isLoading ? (
              <div className="space-y-2" aria-label={t('common.loading')}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : vehicles.isError ? (
              <EmptyState
                title={
                  denied
                    ? t('fleet_map.access_denied')
                    : t('fleet_map.load_failed')
                }
                description={
                  denied ? t('fleet_map.access_denied_desc') : undefined
                }
                action={
                  denied
                    ? undefined
                    : {
                        label: t('common.retry'),
                        onClick: () => void vehicles.refetch(),
                      }
                }
              />
            ) : vehicles.data?.data.length ? (
              <div className="space-y-1.5">
                {vehicles.data.data.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    aria-pressed={selectedId === vehicle.id}
                    onClick={() => selectVehicle(vehicle.id)}
                    className="group flex min-h-20 w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-pressed:border-primary/30 aria-pressed:bg-primary/5"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-aria-pressed:bg-primary/10 group-aria-pressed:text-primary">
                      <Car className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {vehicle.plate_number}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {vehicle.make} {vehicle.model} ·{' '}
                        {t(`vehicles.status.${vehicle.status}`)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {canViewAllBranches
                          ? branchName(vehicle.branch_id)
                          : (vehicle.categories ?? []).join(', ')}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Car}
                title={t('fleet_map.no_vehicles')}
                description={t('fleet_map.no_vehicles_desc')}
              />
            )}
          </div>

          {vehicles.data && !vehicles.isError ? (
            <PaginationControls
              className="shrink-0 border-t border-border/70 px-3"
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(next) => {
                setPage(next);
                setSelectedId(null);
              }}
              pageSize={20}
              totalItems={totalVehicles}
            />
          ) : null}
        </section>

        {!selectedVehicle ? (
          <div
            role="tabpanel"
            id={`fleet-map-${view}-panel`}
            aria-labelledby={`fleet-map-${view}-tab`}
            className={[
              'pointer-events-auto absolute bottom-28 left-3 right-3 rounded-xl border border-border/70 bg-background/95 p-3 shadow-xl shadow-black/10 backdrop-blur lg:bottom-4 lg:left-auto lg:right-20 lg:w-[24rem]',
              mobileRosterOpen ? 'hidden lg:block' : 'block',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapTrifold className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="font-heading text-sm font-bold text-foreground">
                  {view === 'current'
                    ? t('fleet_map.location_unavailable')
                    : t('fleet_map.history_unavailable')}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {view === 'current'
                    ? t('fleet_map.current_desc')
                    : t('fleet_map.history_desc')}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {selectedVehicle ? (
          <aside
            role="tabpanel"
            id={`fleet-map-${view}-panel`}
            aria-labelledby={`fleet-map-${view}-tab`}
            className={[
              'pointer-events-auto absolute bottom-28 left-3 right-3 max-h-[42dvh] overflow-y-auto rounded-xl border border-border/70 bg-background/95 p-4 shadow-xl shadow-black/10 backdrop-blur lg:bottom-auto lg:left-auto lg:right-20 lg:top-20 lg:max-h-[calc(100%-7rem)] lg:w-[24rem]',
              mobileRosterOpen ? 'hidden lg:block' : 'block',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  ref={detailHeadingRef}
                  tabIndex={-1}
                  className="truncate font-heading text-lg font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {selectedVehicle.plate_number}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {selectedVehicle.make} {selectedVehicle.model} ·{' '}
                  {branchName(selectedVehicle.branch_id)}
                </p>
              </div>
              <button
                type="button"
                aria-label={t('fleet_map.close_vehicle')}
                onClick={closeVehicleDetails}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <dl className="mt-4 grid gap-3">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">
                  {view === 'current'
                    ? t('fleet_map.location_unavailable')
                    : t('fleet_map.history_unavailable')}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-foreground">
                  {view === 'current'
                    ? t('fleet_map.current_desc')
                    : t('fleet_map.history_desc')}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <dt className="text-xs text-muted-foreground">
                  {t('fleet_map.operational_state_label')}
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {t(`vehicles.status.${selectedVehicle.status}`)}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <dt className="text-xs text-muted-foreground">
                  {t('vehicles.categories')}
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {(selectedVehicle.categories ?? []).join(', ')}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <dt className="text-xs text-muted-foreground">
                  {t('fleet_map.signal_label')}
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {t('fleet_map.signal_unavailable')}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <dt className="text-xs text-muted-foreground">
                  {t('fleet_map.location_label')}
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {t('fleet_map.location_unavailable')}
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {t('fleet_map.panel_note')}
            </p>
            <Link
              to="/vehicles/$id"
              params={{ id: selectedVehicle.id }}
              aria-label={t('fleet_map.open_vehicle')}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('fleet_map.open_vehicle')}
              <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
            </Link>
          </aside>
        ) : null}
      </div>
    </div>
  );
};

export default FleetMapPage;
