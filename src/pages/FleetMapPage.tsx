import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowSquareOut,
  Car,
  MapTrifold,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import axios from 'axios';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import PaginationControls from '@/components/ui/PaginationControls';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { useCan } from '@/hooks/useCan';
import { useBranches } from '@/services/branchService';
import { useVehiclesPage } from '@/services/vehicleService';
import { useAuthStore } from '@/store/authStore';

const publicDemoTiles = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const tileUrl =
  import.meta.env.VITE_FLEET_MAP_TILE_URL?.trim() ||
  (import.meta.env.DEV ? publicDemoTiles : undefined);
const osmAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const providerAttribution =
  import.meta.env.VITE_FLEET_MAP_TILE_ATTRIBUTION?.trim();

const FleetBasemap = () => {
  const { t } = useTranslation();
  const mapElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapElement.current || !tileUrl) return;

    const map = L.map(mapElement.current, { scrollWheelZoom: false }).setView(
      [41, 64],
      5,
    );
    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: providerAttribution
        ? `${osmAttribution} | ${providerAttribution}`
        : osmAttribution,
    }).addTo(map);

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div
      ref={mapElement}
      role="region"
      aria-label={t('fleet_map.basemap_label')}
      className="h-[350px] w-full bg-muted sm:h-[430px]"
    />
  );
};

const FleetMapPage = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const canViewAllBranches = useCan('viewAllBranches');
  const { data: branches = [] } = useBranches(canViewAllBranches);
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'current' | 'history'>('current');
  const selectView = (next: 'current' | 'history') => {
    setView(next);
    document.getElementById(`fleet-map-${next}-tab`)?.focus();
  };
  const searchTerm = useDebounce(search.trim(), 300);
  const vehicles = useVehiclesPage({
    branchId: canViewAllBranches
      ? branchId || undefined
      : (user?.branch_id ?? undefined),
    search: searchTerm || undefined,
    page,
    limit: 20,
  });
  const selectedVehicle = vehicles.isError
    ? undefined
    : vehicles.data?.data.find((vehicle) => vehicle.id === selectedId);
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('nav.vehicles')}
        title={t('nav.fleet_map')}
        description={t('fleet_map.subtitle')}
        icon={<MapTrifold className="h-3.5 w-3.5" aria-hidden="true" />}
      />

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-background text-primary">
            <MapTrifold className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {t('fleet_map.gps_unconfigured')}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              {t('fleet_map.gps_unconfigured_desc')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <section
          aria-label={t('fleet_map.roster')}
          className="glass-card min-w-0 overflow-hidden"
        >
          <div className="border-b border-border/70 p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-lg font-bold text-foreground">
                {t('fleet_map.roster')}
              </h2>
              <span
                aria-live="polite"
                className="text-xs text-muted-foreground"
              >
                {!vehicles.isLoading && !vehicles.isError && vehicles.data
                  ? t('fleet_map.vehicle_count', {
                      count: vehicles.data.meta.total,
                    })
                  : null}
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              <div className="relative">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  aria-label={t('common.search')}
                  placeholder={t('fleet_map.search_placeholder')}
                  className="pl-9"
                  maxLength={100}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelectedId(null);
                    setPage(1);
                  }}
                />
              </div>
              {canViewAllBranches ? (
                <select
                  aria-label={t('common.branch')}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={branchId}
                  onChange={(event) => {
                    setBranchId(event.target.value);
                    setSelectedId(null);
                    setPage(1);
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
                <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                  {user?.branch_name ?? t('common.branch')}
                </p>
              )}
            </div>
          </div>

          <div className="max-h-[480px] min-h-48 overflow-y-auto p-2 sm:p-3">
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
                    onClick={() => setSelectedId(vehicle.id)}
                    className="group flex min-h-20 w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-pressed:border-primary/30 aria-pressed:bg-primary/5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-aria-pressed:bg-primary/10 group-aria-pressed:text-primary">
                      <Car className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {vehicle.plate_number}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {vehicle.make} {vehicle.model}
                      </span>
                      {canViewAllBranches ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {branchName(vehicle.branch_id)}
                        </span>
                      ) : null}
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
            <div className="border-t border-border/70 px-2 pb-4 sm:px-3">
              <PaginationControls
                currentPage={page}
                totalPages={Math.max(1, vehicles.data.meta.totalPages)}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  setSelectedId(null);
                }}
              />
            </div>
          ) : null}
        </section>

        <section
          aria-label={t('nav.fleet_map')}
          className="glass-card min-w-0 overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
            <div
              role="tablist"
              aria-label={t('nav.fleet_map')}
              className="flex gap-1 rounded-lg bg-muted/70 p-1"
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
                  onClick={() => setView(option)}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'ArrowRight' ||
                      event.key === 'ArrowLeft'
                    ) {
                      event.preventDefault();
                      selectView(option === 'current' ? 'history' : 'current');
                    } else if (event.key === 'Home' || event.key === 'End') {
                      event.preventDefault();
                      selectView(event.key === 'Home' ? 'current' : 'history');
                    }
                  }}
                  className="min-h-9 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm"
                >
                  {t(`fleet_map.${option}`)}
                </button>
              ))}
            </div>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              {t(
                tileUrl
                  ? 'fleet_map.basemap_status'
                  : 'fleet_map.basemap_unconfigured',
              )}
            </span>
          </div>

          <div
            role="tabpanel"
            id={`fleet-map-${view}-panel`}
            aria-labelledby={`fleet-map-${view}-tab`}
          >
            {tileUrl ? (
              <FleetBasemap />
            ) : (
              <div className="flex min-h-[350px] flex-col items-center justify-center bg-muted/20 px-6 py-12 text-center sm:min-h-[430px]">
                <MapTrifold
                  className="h-8 w-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="mt-5 font-heading text-xl font-bold text-foreground">
                  {t('fleet_map.basemap_unconfigured')}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {t('fleet_map.basemap_unconfigured_desc')}
                </p>
              </div>
            )}
            <div className="border-t border-border/70 bg-muted/20 px-4 py-4 sm:px-5">
              <h2 className="font-heading text-base font-bold text-foreground">
                {view === 'current'
                  ? t('fleet_map.location_unavailable')
                  : t('fleet_map.history_unavailable')}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {view === 'current'
                  ? t('fleet_map.current_desc')
                  : t('fleet_map.history_desc')}
              </p>
            </div>

            {selectedVehicle ? (
              <div className="border-t border-border/70 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-lg font-bold text-foreground">
                      {selectedVehicle.plate_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedVehicle.make} {selectedVehicle.model} ·{' '}
                      {branchName(selectedVehicle.branch_id)}
                    </p>
                  </div>
                  <Link
                    to="/vehicles/$id"
                    params={{ id: selectedVehicle.id }}
                    aria-label={t('fleet_map.open_vehicle')}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t('fleet_map.open_vehicle')}
                    <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
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
              </div>
            ) : !vehicles.isLoading &&
              !vehicles.isError &&
              vehicles.data?.data.length ? (
              <div className="border-t border-border/70 px-4 py-4 sm:px-5">
                <p className="text-sm font-medium text-foreground">
                  {t('fleet_map.select_vehicle')}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('fleet_map.select_vehicle_desc')}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FleetMapPage;
